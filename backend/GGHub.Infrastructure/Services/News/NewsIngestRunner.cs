using System.Text;
using GGHub.Application.Interfaces;
using GGHub.Core.Entities;
using GGHub.Core.Enums;
using GGHub.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace GGHub.Infrastructure.Services.News
{
    public sealed class NewsRunOptions
    {
        /// <summary>Kilidi tutan: "mac" | "actions" | "manual".</summary>
        public string Holder { get; init; } = "mac";

        /// <summary>DB'ye ve R2'ye yazmaz, kilit almaz. Sample kadar haberi modele yazdirip ekrana basar.</summary>
        public bool DryRun { get; init; }
        public int Sample { get; init; }

        /// <summary>Ilk dolum: kac gun geriye. 0 = normal tur (son 2 gun).</summary>
        public int BackfillDays { get; init; }

        /// <summary>Son basarili tur bu kadar yeniyse hicbir sey yapmadan cik (Mac 15 dk, Actions 40 dk).</summary>
        public TimeSpan? SkipIfCompletedWithin { get; init; }
    }

    public sealed class NewsRunReport
    {
        public string Status { get; set; } = "ok";
        public int FeedsOk { get; set; }
        public int FeedsNotModified { get; set; }
        public List<string> FeedErrors { get; } = new();
        public int ItemsTotal { get; set; }
        public int ItemsInWindow { get; set; }
        public int ItemsExcluded { get; set; }
        public int ItemsKnown { get; set; }
        public int ItemsNew { get; set; }
        public int AttachedToExisting { get; set; }
        public int Clusters { get; set; }
        public int Written { get; set; }
        public int SkippedByModel { get; set; }
        public int ModelFailures { get; set; }
        public int CatalogImages { get; set; }
        public int GeneratedImages { get; set; }
        public int NoImage { get; set; }
        public int Deleted { get; set; }
        public int CapRemaining { get; set; }
        public List<string> Samples { get; } = new();

        public override string ToString()
        {
            var sb = new StringBuilder();
            sb.AppendLine($"Durum: {Status}");
            sb.AppendLine($"Kaynak: {FeedsOk} okundu, {FeedsNotModified} degismemis, {FeedErrors.Count} hata");
            foreach (var e in FeedErrors) sb.AppendLine($"  hata: {e}");
            sb.AppendLine($"Yazi: {ItemsTotal} toplam, {ItemsInWindow} zaman araliginda, {ItemsExcluded} elendi (inceleme/indirim/rehber), {ItemsKnown} zaten islenmis, {ItemsNew} yeni");
            sb.AppendLine($"Kume: {Clusters} yeni olay, {AttachedToExisting} yazi mevcut habere kaynak olarak eklendi");
            sb.AppendLine($"Yazilan: {Written}, model 'haber degil' dedi: {SkippedByModel}, model hatasi: {ModelFailures}, gunluk kalan hak: {CapRemaining}");
            sb.AppendLine($"Gorsel: {CatalogImages} katalog, {GeneratedImages} uretildi, {NoImage} gorselsiz");
            if (Deleted > 0) sb.AppendLine($"Saklama: {Deleted} eski haber silindi");
            foreach (var s in Samples) sb.AppendLine(s);
            return sb.ToString();
        }
    }

    /// <summary>
    /// Bir haber turu. Akis:
    ///  1. Kilit (NewsRunLease, 15 dk, yenilenir). Mac ve Actions ayni anda calismaz.
    ///  2. Kaynaklari kosullu GET ile cek (paralel, en fazla 6).
    ///  3. Ele: zaman araligi, kategori, baslik deseni (inceleme/indirim/rehber), bilinen URL, atlanan URL.
    ///  4. Kumele: once Ingilizce, sonra Turkce. Mevcut habere benzeyen yazi yalniz KAYNAK olarak eklenir
    ///     (model cagrisi yok). Yeni olaylar modele gider.
    ///  5. Tavanlar: gunluk haber, gunluk uretilen gorsel, aylik butcenin %80'i (gorsel icin).
    ///  6. Saklama: 180 gunden eski haber ve gorseli, 7 gunden eski atlanan kayitlar.
    /// </summary>
    public sealed class NewsIngestRunner
    {
        private const int NormalWindowDays = 2;
        private const int BackfillDailyCap = 250;
        private const int RetentionDays = 180;
        private const int MaxSourcesPerArticle = 8;
        private const double ImageBudgetShare = 0.8;
        private static readonly TimeSpan LeaseLength = TimeSpan.FromMinutes(15);

        private readonly GGHubDbContext _db;
        private readonly NewsFeedReader _reader;
        private readonly NewsWriter _writer;
        private readonly NewsImageStore _images;
        private readonly IGeminiService _gemini;
        private readonly IGeminiBudgetService _budget;
        private readonly IAiSettingsProvider _settings;
        private readonly ILogger<NewsIngestRunner> _logger;

        public NewsIngestRunner(GGHubDbContext db, NewsFeedReader reader, NewsWriter writer, NewsImageStore images,
            IGeminiService gemini, IGeminiBudgetService budget, IAiSettingsProvider settings, ILogger<NewsIngestRunner> logger)
        {
            _db = db;
            _reader = reader;
            _writer = writer;
            _images = images;
            _gemini = gemini;
            _budget = budget;
            _settings = settings;
            _logger = logger;
        }

        private sealed class PoolArticle
        {
            public int Id;
            public List<HashSet<string>> TitleTokens = new();
            public int SourceCount;
        }

        private sealed class Cluster
        {
            public List<NewsFeedItem> Items { get; } = new();
            public double Score => Items.Sum(i => i.Feed.Weight) + Items.Count * 3
                - (DateTime.UtcNow - Items.Min(i => i.PublishedAt)).TotalHours / 12.0;
        }

        public async Task<NewsRunReport> RunAsync(NewsRunOptions opt, CancellationToken ct)
        {
            var report = new NewsRunReport();
            var settings = await _settings.GetAsync(ct);

            if (!settings.NewsEnabled && !opt.DryRun)
            {
                report.Status = "kapali (AiSettings.NewsEnabled = false)";
                return report;
            }

            if (!opt.DryRun)
            {
                var lease = await _db.NewsRunLeases.AsNoTracking().FirstOrDefaultAsync(l => l.Id == 1, ct);
                if (opt.SkipIfCompletedWithin is { } within && lease?.LastCompletedAt is { } last
                    && DateTime.UtcNow - DateTime.SpecifyKind(last, DateTimeKind.Utc) < within)
                {
                    report.Status = $"atlandi: son tur {(DateTime.UtcNow - last).TotalMinutes:F0} dk once ({lease.LastCompletedBy})";
                    return report;
                }
                if (!await TryAcquireLeaseAsync(opt.Holder, ct))
                {
                    report.Status = "atlandi: baska bir tur calisiyor";
                    return report;
                }
            }

            var completed = false;
            try
            {
                await RunCoreAsync(opt, settings, report, ct);
                completed = true;
            }
            finally
            {
                if (!opt.DryRun)
                {
                    await ReleaseLeaseAsync(opt.Holder, completed, CancellationToken.None);
                }
            }

            return report;
        }

        private async Task RunCoreAsync(NewsRunOptions opt, AiSettings settings, NewsRunReport report, CancellationToken ct)
        {
            var now = DateTime.UtcNow;
            var windowStart = now.AddDays(-(opt.BackfillDays > 0 ? opt.BackfillDays : NormalWindowDays));

            // ---- 1. cek
            var states = await _db.NewsFeedStates.ToDictionaryAsync(s => s.FeedKey, ct);
            var useConditional = !opt.DryRun && opt.BackfillDays == 0;
            using var gate = new SemaphoreSlim(6);
            var fetches = await Task.WhenAll(NewsSources.All.Select(async feed =>
            {
                await gate.WaitAsync(ct);
                try
                {
                    states.TryGetValue(feed.Key, out var st);
                    return await _reader.FetchAsync(feed, useConditional ? st?.ETag : null, useConditional ? st?.LastModified : null, ct);
                }
                finally { gate.Release(); }
            }));

            var items = new List<NewsFeedItem>();
            foreach (var f in fetches)
            {
                if (f.Error != null) report.FeedErrors.Add($"{f.Feed.Key}: {f.Error}");
                else if (f.NotModified) report.FeedsNotModified++;
                else report.FeedsOk++;

                items.AddRange(f.Items);

                if (!opt.DryRun)
                {
                    if (!states.TryGetValue(f.Feed.Key, out var st))
                    {
                        st = new NewsFeedState { FeedKey = f.Feed.Key };
                        _db.NewsFeedStates.Add(st);
                        states[f.Feed.Key] = st;
                    }
                    st.LastFetchedAt = now;
                    if (f.Error != null) st.ConsecutiveFailures++;
                    else
                    {
                        st.ConsecutiveFailures = 0;
                        if (!f.NotModified) { st.ETag = Trunc(f.ETag, 200); st.LastModified = Trunc(f.LastModified, 100); }
                    }
                }
            }
            if (!opt.DryRun) await _db.SaveChangesAsync(ct);

            report.ItemsTotal = items.Count;

            // ---- 2. ele
            items = items
                .Where(i => i.PublishedAt >= windowStart && i.PublishedAt <= now.AddHours(6))
                .GroupBy(i => i.Url).Select(g => g.First())
                .ToList();
            report.ItemsInWindow = items.Count;

            var beforeExclude = items.Count;
            items = items.Where(i =>
                !NewsText.IsExcludedTitle(i.Title)
                && (i.Feed.RequireCategory is null
                    || i.Categories.Any(c => NewsText.Normalize(c).Contains(i.Feed.RequireCategory, StringComparison.Ordinal))))
                .ToList();
            report.ItemsExcluded = beforeExclude - items.Count;

            var urls = items.Select(i => i.Url).ToList();
            var known = new HashSet<string>(
                await _db.NewsArticleSources.AsNoTracking().Where(s => urls.Contains(s.Url)).Select(s => s.Url).ToListAsync(ct));
            known.UnionWith(
                await _db.NewsSkippedItems.AsNoTracking().Where(s => urls.Contains(s.Url)).Select(s => s.Url).ToListAsync(ct));
            report.ItemsKnown = items.Count(i => known.Contains(i.Url));
            items = items.Where(i => !known.Contains(i.Url)).ToList();
            report.ItemsNew = items.Count;

            foreach (var i in items) i.Tokens = NewsText.Tokens(i.Title);

            // ---- 3. mevcut haber havuzu (benzerlik karsilastirmasi icin)
            var poolSince = windowStart.AddDays(-3);
            var poolRows = await _db.NewsArticles.AsNoTracking()
                .Where(a => a.PublishedAt >= poolSince)
                .Select(a => new { a.Id, a.TitleEn, a.TitleTr, Titles = a.Sources.Select(s => s.OriginalTitle).ToList() })
                .ToListAsync(ct);
            var pool = poolRows.Select(r =>
            {
                var p = new PoolArticle { Id = r.Id, SourceCount = r.Titles.Count };
                p.TitleTokens.Add(NewsText.Tokens(r.TitleEn));
                p.TitleTokens.Add(NewsText.Tokens(r.TitleTr));
                p.TitleTokens.AddRange(r.Titles.Select(NewsText.Tokens));
                return p;
            }).ToList();

            // ---- 4. tavanlar
            var dayStart = now.Date;
            var writtenToday = await _db.NewsArticles.CountAsync(a => a.CreatedAt >= dayStart, ct);
            var generatedToday = await _db.NewsArticles.CountAsync(a => a.CreatedAt >= dayStart && a.ImageKind == NewsImageKind.Generated, ct);
            var cap = opt.BackfillDays > 0 ? BackfillDailyCap : settings.NewsDailyArticleCap;
            var remaining = Math.Max(0, cap - writtenToday);
            report.CapRemaining = remaining;

            var budget = await _budget.GetStatusAsync(GeminiSources.News, ct);
            var imageBudgetOpen = budget.LimitUsd > 0 && budget.SpentUsd < budget.LimitUsd * (decimal)ImageBudgetShare;
            var imagesLeft = opt.BackfillDays > 0 || !imageBudgetOpen || !_images.CanUpload
                ? 0
                : Math.Max(0, settings.NewsDailyGeneratedImageCap - generatedToday);
            var imageCapHalf = Math.Max(1, settings.NewsDailyGeneratedImageCap / 2);

            // ---- 5. dil sirasiyla kumele ve yaz
            var sampleLeft = opt.Sample;
            foreach (var lang in new[] { "en", "tr" })
            {
                var langItems = items.Where(i => i.Feed.Language == lang).OrderBy(i => i.PublishedAt).ToList();
                var clusters = new List<Cluster>();
                var attach = new List<(int ArticleId, NewsFeedItem Item)>();

                foreach (var item in langItems)
                {
                    var match = pool.FirstOrDefault(p => p.TitleTokens.Any(t => NewsText.SameStory(t, item.Tokens)));
                    if (match != null)
                    {
                        if (match.SourceCount < MaxSourcesPerArticle)
                        {
                            attach.Add((match.Id, item));
                            match.SourceCount++;
                        }
                        continue;
                    }

                    var cluster = clusters.FirstOrDefault(c => c.Items.Any(x => NewsText.SameStory(x.Tokens, item.Tokens)));
                    if (cluster != null) cluster.Items.Add(item);
                    else
                    {
                        var c = new Cluster();
                        c.Items.Add(item);
                        clusters.Add(c);
                    }
                }

                report.AttachedToExisting += attach.Count;
                report.Clusters += clusters.Count;

                if (!opt.DryRun && attach.Count > 0)
                {
                    foreach (var (articleId, item) in attach)
                        _db.NewsArticleSources.Add(ToSource(articleId, item));
                    await SaveIgnoringDuplicatesAsync(ct);
                }

                foreach (var cluster in clusters.OrderByDescending(c => c.Score))
                {
                    ct.ThrowIfCancellationRequested();

                    if (opt.DryRun)
                    {
                        if (sampleLeft-- <= 0) continue;
                    }
                    else if (remaining <= 0)
                    {
                        break;
                    }

                    var written = await WriteClusterAsync(cluster, settings, opt, report, imagesLeft > 0, imagesLeft > 0 && imagesLeft > imageCapHalf, ct);
                    if (written == null) continue;

                    if (written.ImageKind == NewsImageKind.Generated) imagesLeft--;
                    remaining--;
                    report.Written++;

                    var p = new PoolArticle { Id = written.Id, SourceCount = written.Sources.Count };
                    p.TitleTokens.Add(NewsText.Tokens(written.TitleEn));
                    p.TitleTokens.Add(NewsText.Tokens(written.TitleTr));
                    p.TitleTokens.AddRange(cluster.Items.Select(i => i.Tokens));
                    pool.Add(p);

                    if (!opt.DryRun) await RenewLeaseAsync(opt.Holder, ct);
                }
            }

            report.CapRemaining = remaining;

            // ---- 6. saklama
            if (!opt.DryRun)
            {
                await CleanupAsync(report, ct);
            }
        }

        private async Task<NewsArticle?> WriteClusterAsync(Cluster cluster, AiSettings settings, NewsRunOptions opt,
            NewsRunReport report, bool canGenerate, bool canGenerateRoutine, CancellationToken ct)
        {
            var picked = cluster.Items
                .OrderByDescending(i => i.Feed.Weight)
                .ThenByDescending(i => i.Text.Length)
                .Take(3)
                .ToList();

            // Uydurma freni: ozet cok kisaysa kaynak yaziyi bir kez oku (robots.txt izin veriyorsa).
            if (picked.Sum(i => i.Text.Length) < 600)
            {
                var main = picked[0];
                var full = await _reader.FetchArticleTextAsync(main.Url, ct);
                if (full.Length > main.Text.Length) main.Text = full;
            }

            var inputs = picked.Select(i => new NewsWriter.SourceInput(i.Feed.Name, i.Feed.Language, i.Title, i.Text, i.PublishedAt)).ToList();
            NewsDraft? draft;
            try
            {
                draft = await _writer.WriteAsync(inputs, settings, ct);
            }
            catch (GeminiBudgetExceededException)
            {
                report.Status = "aylik haber butcesi doldu";
                return null;
            }

            if (draft is null)
            {
                report.ModelFailures++;
                return null;
            }

            var titles = cluster.Items.Select(i => i.Title).ToList();
            var bodies = picked.Select(i => i.Text).ToList();

            if (draft.Skip)
            {
                report.SkippedByModel++;
                if (opt.DryRun)
                {
                    report.Samples.Add($"\n--- ATLANDI ({draft.SkipReason}): {titles[0]}");
                }
                else
                {
                    foreach (var i in cluster.Items)
                        _db.NewsSkippedItems.Add(new NewsSkippedItem { Url = i.Url, Reason = "not-news", SkippedAt = DateTime.UtcNow });
                    await SaveIgnoringDuplicatesAsync(ct);
                }
                return null;
            }

            var catalog = await _images.FindCatalogGameAsync(_db, draft.GameName, titles, bodies, ct);

            if (opt.DryRun)
            {
                report.Samples.Add($"""

                    --- ORNEK [{draft.Model}] {draft.Category} / onem {draft.Importance} / oyun: {draft.GameName ?? "-"} / katalog: {(catalog != null ? $"#{catalog.GameId} {catalog.Name}" : "yok")}
                    Kaynaklar: {string.Join(" | ", cluster.Items.Select(i => $"{i.Feed.Name}: {i.Title}"))}
                    TR: {draft.Tr.Title}
                        {draft.Tr.Summary}
                        {draft.Tr.Body}
                    EN: {draft.En.Title}
                        {draft.En.Summary}
                        {draft.En.Body}
                    Gorsel istemi: {draft.ImagePrompt}
                    """);
                return new NewsArticle
                {
                    TitleEn = draft.En.Title, TitleTr = draft.Tr.Title,
                    ImageKind = catalog != null ? NewsImageKind.Catalog : NewsImageKind.None
                };
            }

            string? imageUrl = null;
            var kind = NewsImageKind.None;
            if (catalog != null)
            {
                imageUrl = catalog.ImageUrl;
                kind = NewsImageKind.Catalog;
                report.CatalogImages++;
            }
            else if (draft.ImagePrompt != null && canGenerate && (draft.Importance >= 2 || canGenerateRoutine))
            {
                try
                {
                    imageUrl = await _images.GenerateAsync(_gemini, draft.ImagePrompt, ct);
                    if (imageUrl != null)
                    {
                        kind = NewsImageKind.Generated;
                        report.GeneratedImages++;
                    }
                }
                catch (Exception ex) when (ex is GeminiBudgetExceededException or GeminiQuotaExceededException)
                {
                    _logger.LogInformation("[News] Gorsel uretilemedi: {Message}", ex.Message);
                }
                catch (Exception ex) when (ex is not OperationCanceledException)
                {
                    _logger.LogWarning(ex, "[News] Gorsel uretimi hatasi.");
                }
            }
            if (kind == NewsImageKind.None) report.NoImage++;

            var first = cluster.Items.OrderBy(i => i.PublishedAt).First();
            var importance = Math.Max(draft.Importance, cluster.Items.Count >= 3 ? 2 : 1);
            var article = new NewsArticle
            {
                Slug = NewsText.Slugify(draft.En.Title, first.Url),
                TitleTr = draft.Tr.Title,
                TitleEn = draft.En.Title,
                SummaryTr = draft.Tr.Summary,
                SummaryEn = draft.En.Summary,
                BodyTr = draft.Tr.Body,
                BodyEn = draft.En.Body,
                Category = draft.Category,
                Importance = importance,
                ImageUrl = imageUrl,
                ImageKind = kind,
                GameId = catalog?.GameId,
                PublishedAt = first.PublishedAt > DateTime.UtcNow ? DateTime.UtcNow : first.PublishedAt,
                CreatedAt = DateTime.UtcNow
            };
            foreach (var i in cluster.Items.Take(MaxSourcesPerArticle))
                article.Sources.Add(ToSource(0, i));

            _db.NewsArticles.Add(article);
            try
            {
                await _db.SaveChangesAsync(ct);
            }
            catch (DbUpdateException ex)
            {
                // Ayni kaynak URL'i baska bir tur yazmis ya da slug cakismasi: bu haberi birak.
                _logger.LogWarning("[News] Haber kaydedilemedi (cakisma): {Title} {Error}", article.TitleEn, ex.InnerException?.Message ?? ex.Message);
                _db.ChangeTracker.Clear();
                if (kind == NewsImageKind.Generated && imageUrl != null) await _images.DeleteAsync(imageUrl, ct);
                return null;
            }

            _logger.LogInformation("[News] Yazildi: {Title} ({Sources} kaynak, gorsel {Kind}, {Model})",
                article.TitleEn, article.Sources.Count, kind, draft.Model);
            return article;
        }

        private static NewsArticleSource ToSource(int articleId, NewsFeedItem i) => new()
        {
            NewsArticleId = articleId,
            SourceName = i.Feed.Name,
            FeedKey = i.Feed.Key,
            Url = Trunc(i.Url, 800)!,
            OriginalTitle = Trunc(i.Title, 400)!,
            Language = i.Feed.Language,
            PublishedAt = i.PublishedAt
        };

        private async Task SaveIgnoringDuplicatesAsync(CancellationToken ct)
        {
            try
            {
                await _db.SaveChangesAsync(ct);
            }
            catch (DbUpdateException ex)
            {
                _logger.LogInformation("[News] Cakisan kayit atlandi: {Error}", ex.InnerException?.Message ?? ex.Message);
                _db.ChangeTracker.Clear();
            }
        }

        private async Task CleanupAsync(NewsRunReport report, CancellationToken ct)
        {
            var cutoff = DateTime.UtcNow.AddDays(-RetentionDays);
            var old = await _db.NewsArticles
                .Where(a => a.PublishedAt < cutoff)
                .OrderBy(a => a.PublishedAt)
                .Take(200)
                .Select(a => new { a.Id, a.ImageUrl, a.ImageKind })
                .ToListAsync(ct);

            foreach (var a in old.Where(a => a.ImageKind == NewsImageKind.Generated && a.ImageUrl != null))
                await _images.DeleteAsync(a.ImageUrl!, ct);

            if (old.Count > 0)
            {
                var ids = old.Select(a => a.Id).ToList();
                report.Deleted = await _db.NewsArticles.Where(a => ids.Contains(a.Id)).ExecuteDeleteAsync(ct);
            }

            var skipCutoff = DateTime.UtcNow.AddDays(-7);
            await _db.NewsSkippedItems.Where(s => s.SkippedAt < skipCutoff).ExecuteDeleteAsync(ct);
        }

        // ---------------------------------------------------------------- kilit

        private async Task<bool> TryAcquireLeaseAsync(string holder, CancellationToken ct)
        {
            var until = DateTime.UtcNow + LeaseLength;
            var now = DateTime.UtcNow;
            var affected = await _db.Database.ExecuteSqlInterpolatedAsync($"""
                UPDATE "NewsRunLeases" SET "Holder" = {holder}, "ExpiresAt" = {until}
                WHERE "Id" = 1 AND ("ExpiresAt" < {now} OR "Holder" = {holder})
                """, ct);
            return affected == 1;
        }

        private async Task RenewLeaseAsync(string holder, CancellationToken ct)
        {
            var until = DateTime.UtcNow + LeaseLength;
            await _db.Database.ExecuteSqlInterpolatedAsync($"""
                UPDATE "NewsRunLeases" SET "ExpiresAt" = {until} WHERE "Id" = 1 AND "Holder" = {holder}
                """, ct);
        }

        private async Task ReleaseLeaseAsync(string holder, bool completed, CancellationToken ct)
        {
            var now = DateTime.UtcNow;
            try
            {
                if (completed)
                {
                    await _db.Database.ExecuteSqlInterpolatedAsync($"""
                        UPDATE "NewsRunLeases" SET "ExpiresAt" = {now}, "LastCompletedAt" = {now}, "LastCompletedBy" = {holder}
                        WHERE "Id" = 1 AND "Holder" = {holder}
                        """, ct);
                }
                else
                {
                    await _db.Database.ExecuteSqlInterpolatedAsync($"""
                        UPDATE "NewsRunLeases" SET "ExpiresAt" = {now} WHERE "Id" = 1 AND "Holder" = {holder}
                        """, ct);
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "[News] Kilit birakilamadi; 15 dk sonra kendiliginden duser.");
            }
        }

        private static string? Trunc(string? s, int max) => s is null ? null : s.Length > max ? s[..max] : s;
    }
}
