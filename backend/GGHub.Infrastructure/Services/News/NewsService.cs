using GGHub.Application.Dtos;
using GGHub.Application.DTOs.Common;
using GGHub.Application.Interfaces;
using GGHub.Core.Entities;
using GGHub.Core.Enums;
using GGHub.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace GGHub.Infrastructure.Services.News
{
    /// <summary>
    /// Haber okuma uclari. Maliyet tasarimi:
    ///  - Liste ve detay 5 dk bellek onbellegi. Yeni haberi Worker yazar, en gec 5 dk sonra gorunur.
    ///  - Onbellek anahtari sinirli: sayfa boyutu yalniz 12 ya da 24, sayfa en fazla 50, kategori enum.
    ///    Anonim uc rastgele parametreyle sinirsiz onbellek kaydi uretemez.
    ///  - Detayda yalniz BULUNAN haber onbellege girer (rastgele slug denemesi bellek sismez).
    ///  - Admin gizleme yapinca nesil sayaci artar, tum anahtarlar bir anda bayatlar.
    /// </summary>
    public class NewsService : INewsService
    {
        private const int MaxPage = 50;
        private const int SitemapMax = 1000;
        private static readonly TimeSpan CacheTtl = TimeSpan.FromMinutes(5);
        private static int _generation;

        private readonly GGHubDbContext _context;
        private readonly IMemoryCache _cache;

        public NewsService(GGHubDbContext context, IMemoryCache cache)
        {
            _context = context;
            _cache = cache;
        }

        public async Task<PaginatedResult<NewsListItemDto>> GetListAsync(int page, int pageSize, string? category, string? search = null, int? days = null, CancellationToken ct = default)
        {
            var safePage = Math.Clamp(page, 1, MaxPage);
            var safeSize = pageSize >= 24 ? 24 : 12;
            NewsCategory? cat = TryParseCategory(category);
            int? safeDays = days is 1 or 3 or 7 or 30 ? days : null;
            var term = (search ?? string.Empty).Trim();
            if (term.Length > 60) term = term[..60];
            var hasSearch = term.Length >= 2;

            // Serbest metin aramasi onbellege girmez (anahtar sinirsiz olurdu). Tablo en fazla birkac bin
            // satir (180 gun saklama); ILIKE taramasi ucuz.
            var key = $"news:list:{Volatile.Read(ref _generation)}:{cat?.ToString() ?? "all"}:{safeDays ?? 0}:{safePage}:{safeSize}";
            if (!hasSearch && _cache.TryGetValue(key, out PaginatedResult<NewsListItemDto>? cached) && cached != null)
                return cached;

            var query = _context.NewsArticles.AsNoTracking().Where(a => !a.IsHidden);
            if (cat.HasValue)
                query = query.Where(a => a.Category == cat.Value);
            if (safeDays.HasValue)
            {
                var since = DateTime.UtcNow.AddDays(-safeDays.Value);
                query = query.Where(a => a.PublishedAt >= since);
            }
            if (hasSearch)
            {
                // Her kelime bir yerde gecmeli: baslik, ozet (iki dil), kaynak adi ya da eslesen oyunun adi.
                foreach (var word in term.Split(' ', StringSplitOptions.RemoveEmptyEntries).Take(5))
                {
                    var pattern = "%" + word.Replace("\\", "\\\\").Replace("%", "\\%").Replace("_", "\\_") + "%";
                    query = query.Where(a =>
                        EF.Functions.ILike(a.TitleTr, pattern, "\\") || EF.Functions.ILike(a.TitleEn, pattern, "\\")
                        || EF.Functions.ILike(a.SummaryTr, pattern, "\\") || EF.Functions.ILike(a.SummaryEn, pattern, "\\")
                        || a.Sources.Any(s => EF.Functions.ILike(s.SourceName, pattern, "\\"))
                        || (a.Game != null && EF.Functions.ILike(a.Game.Name, pattern, "\\")));
                }
            }

            var total = await query.CountAsync(ct);
            var rows = await query
                .OrderByDescending(a => a.PublishedAt)
                .ThenByDescending(a => a.Id)
                .Skip((safePage - 1) * safeSize)
                .Take(safeSize)
                .Select(a => new
                {
                    a.Id, a.Slug, a.TitleTr, a.TitleEn, a.SummaryTr, a.SummaryEn, a.Category, a.Importance,
                    a.ImageUrl, a.ImageKind, a.ImageCredit, a.PublishedAt,
                    FirstSource = a.Sources.OrderBy(s => s.PublishedAt).Select(s => s.SourceName).FirstOrDefault(),
                    SourceCount = a.Sources.Count
                })
                .ToListAsync(ct);

            var result = new PaginatedResult<NewsListItemDto>
            {
                Items = rows.Select(r => new NewsListItemDto
                {
                    Id = r.Id,
                    Slug = r.Slug,
                    TitleTr = r.TitleTr,
                    TitleEn = r.TitleEn,
                    SummaryTr = r.SummaryTr,
                    SummaryEn = r.SummaryEn,
                    Category = CategoryKey(r.Category),
                    Importance = r.Importance,
                    ImageUrl = r.ImageUrl,
                    ImageKind = ImageKindKey(r.ImageKind),
                    ImageCredit = r.ImageCredit,
                    PublishedAt = DateTime.SpecifyKind(r.PublishedAt, DateTimeKind.Utc),
                    SourceName = r.FirstSource ?? string.Empty,
                    SourceCount = r.SourceCount
                }).ToList(),
                TotalCount = total,
                Page = safePage,
                PageSize = safeSize
            };

            if (!hasSearch) _cache.Set(key, result, CacheTtl);
            return result;
        }

        public async Task<List<NewsListItemDto>> GetFeaturedAsync(int limit, CancellationToken ct = default)
        {
            var safe = Math.Clamp(limit, 1, 6);
            var key = $"news:featured:{Volatile.Read(ref _generation)}:{safe}";
            if (_cache.TryGetValue(key, out List<NewsListItemDto>? cached) && cached != null)
                return cached;

            var result = new List<NewsListItemDto>();
            foreach (var hours in new[] { 48, 24 * 7 })
            {
                var since = DateTime.UtcNow.AddHours(-hours);
                var rows = await _context.NewsArticles.AsNoTracking()
                    .Where(a => !a.IsHidden && a.ImageKind != NewsImageKind.None && a.PublishedAt >= since)
                    .Select(a => new
                    {
                        a.Id, a.Slug, a.TitleTr, a.TitleEn, a.SummaryTr, a.SummaryEn, a.Category, a.Importance,
                        a.ImageUrl, a.ImageKind, a.ImageCredit, a.PublishedAt, a.GameId,
                        FirstSource = a.Sources.OrderBy(s => s.PublishedAt).Select(s => s.SourceName).FirstOrDefault(),
                        SourceCount = a.Sources.Count
                    })
                    // Onem en guclu sinyal; ayni onemde cok kaynakli olay (herkes yaziyor) ve yeni olan once.
                    .OrderByDescending(a => a.Importance)
                    .ThenByDescending(a => a.SourceCount)
                    .ThenByDescending(a => a.PublishedAt)
                    .Take(safe * 6)
                    .ToListAsync(ct);

                // Ayni oyundan en fazla bir haber one cikar (GTA 6 haftasinda ucu de GTA olmasin).
                var games = new HashSet<int>();
                rows = rows.Where(r => r.GameId is null || games.Add(r.GameId.Value)).Take(safe).ToList();

                result = rows.Select(r => new NewsListItemDto
                {
                    Id = r.Id, Slug = r.Slug, TitleTr = r.TitleTr, TitleEn = r.TitleEn, SummaryTr = r.SummaryTr, SummaryEn = r.SummaryEn,
                    Category = CategoryKey(r.Category), Importance = r.Importance, ImageUrl = r.ImageUrl,
                    ImageKind = ImageKindKey(r.ImageKind), ImageCredit = r.ImageCredit,
                    PublishedAt = DateTime.SpecifyKind(r.PublishedAt, DateTimeKind.Utc),
                    SourceName = r.FirstSource ?? string.Empty, SourceCount = r.SourceCount
                }).ToList();
                if (result.Count >= safe) break;
            }

            _cache.Set(key, result, CacheTtl);
            return result;
        }

        public async Task<NewsDetailDto?> GetBySlugAsync(string slug, bool includeHidden, CancellationToken ct = default)
        {
            if (string.IsNullOrWhiteSpace(slug) || slug.Length > 160)
                return null;

            var key = $"news:detail:{Volatile.Read(ref _generation)}:{slug}";
            if (!includeHidden && _cache.TryGetValue(key, out NewsDetailDto? cached) && cached != null)
                return cached;

            var a = await _context.NewsArticles.AsNoTracking()
                .Include(x => x.Sources)
                .Include(x => x.Game)
                .FirstOrDefaultAsync(x => x.Slug == slug, ct);

            if (a is null || (a.IsHidden && !includeHidden))
                return null;

            var sources = a.Sources.OrderBy(s => s.PublishedAt).ToList();
            var dto = new NewsDetailDto
            {
                Id = a.Id,
                Slug = a.Slug,
                TitleTr = a.TitleTr,
                TitleEn = a.TitleEn,
                SummaryTr = a.SummaryTr,
                SummaryEn = a.SummaryEn,
                BodyTr = a.BodyTr,
                BodyEn = a.BodyEn,
                Category = CategoryKey(a.Category),
                Importance = a.Importance,
                ImageUrl = a.ImageUrl,
                ImageKind = ImageKindKey(a.ImageKind),
                ImageCredit = a.ImageCredit,
                PublishedAt = DateTime.SpecifyKind(a.PublishedAt, DateTimeKind.Utc),
                SourceName = sources.FirstOrDefault()?.SourceName ?? string.Empty,
                SourceCount = sources.Count,
                IsHidden = a.IsHidden,
                Sources = sources.Select(s => new NewsSourceDto
                {
                    Name = s.SourceName,
                    Url = s.Url,
                    Title = s.OriginalTitle,
                    Language = s.Language,
                    PublishedAt = DateTime.SpecifyKind(s.PublishedAt, DateTimeKind.Utc)
                }).ToList(),
                Game = a.Game is null ? null : new NewsGameDto
                {
                    Id = a.Game.Id,
                    Slug = a.Game.Slug,
                    Name = a.Game.Name,
                    BackgroundImage = a.Game.BackgroundImage,
                    Released = a.Game.Released
                }
            };

            if (!a.IsHidden)
                _cache.Set(key, dto, CacheTtl);

            return dto;
        }

        public async Task<bool> SetHiddenAsync(int id, bool hidden, CancellationToken ct = default)
        {
            var affected = await _context.NewsArticles
                .Where(a => a.Id == id)
                .ExecuteUpdateAsync(s => s.SetProperty(a => a.IsHidden, hidden), ct);

            Interlocked.Increment(ref _generation);
            return affected > 0;
        }

        public async Task<PaginatedResult<SitemapEntryDto>> GetSitemapAsync(CancellationToken ct = default)
        {
            const string key = "news:sitemap";
            if (_cache.TryGetValue(key, out PaginatedResult<SitemapEntryDto>? cached) && cached != null)
                return cached;

            var items = await _context.NewsArticles.AsNoTracking()
                .Where(a => !a.IsHidden)
                .OrderByDescending(a => a.PublishedAt)
                .Take(SitemapMax)
                .Select(a => new SitemapEntryDto { Key = a.Slug, LastModified = a.CreatedAt })
                .ToListAsync(ct);

            var result = new PaginatedResult<SitemapEntryDto>
            {
                Items = items,
                TotalCount = items.Count,
                Page = 1,
                PageSize = SitemapMax
            };

            _cache.Set(key, result, TimeSpan.FromHours(1));
            return result;
        }

        private static NewsCategory? TryParseCategory(string? value)
        {
            if (string.IsNullOrWhiteSpace(value)) return null;
            foreach (NewsCategory c in Enum.GetValues<NewsCategory>())
            {
                if (string.Equals(CategoryKey(c), value, StringComparison.OrdinalIgnoreCase))
                    return c;
            }
            return null;
        }

        public static string CategoryKey(NewsCategory c) => c switch
        {
            NewsCategory.Announcement => "announcement",
            NewsCategory.ReleaseDate => "releaseDate",
            NewsCategory.Release => "release",
            NewsCategory.Update => "update",
            NewsCategory.Industry => "industry",
            NewsCategory.Hardware => "hardware",
            NewsCategory.Esports => "esports",
            _ => "other"
        };

        private static string ImageKindKey(NewsImageKind k) => k switch
        {
            NewsImageKind.Catalog => "catalog",
            NewsImageKind.Generated => "generated",
            NewsImageKind.Source => "source",
            _ => "none"
        };
    }
}
