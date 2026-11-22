using Amazon.S3;
using Amazon.S3.Model;
using GGHub.Application.Interfaces;
using GGHub.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Formats.Webp;
using SixLabors.ImageSharp.Processing;

namespace GGHub.Infrastructure.Services.News
{
    /// <summary>
    /// Haber gorseli: once katalogdaki oyunun gorseli, yoksa Gemini ile uretilen temsili gorsel.
    ///
    /// R2 istemcisi TEMBEL kurulur: "R2" ayari yoksa Worker yine acilir (13 katalog isi etkilenmez),
    /// yalniz gorsel uretimi kapali kalir. Uretilen gorsel 1280 px WebP olarak yazilir ve sitede
    /// /_next/image'dan GECMEDEN dogrudan sunulur (web sunucusunun RAM'ini sharp tuketiyor).
    /// </summary>
    public sealed class NewsImageStore : IDisposable
    {
        public const string ImageModel = "gemini-3.1-flash-lite-image";
        private const int MaxWidth = 1280;
        private const int WebpQuality = 82;
        private const string KeyPrefix = "news";

        // PhotoService ile ayni: anahtar GUID icerdigi icin icerik degismez, bir yil immutable.
        private const string AssetCacheControl = "public, max-age=31536000, immutable";

        private readonly IConfiguration _config;
        private readonly ILogger<NewsImageStore> _logger;
        private readonly Lazy<AmazonS3Client?> _s3;

        public NewsImageStore(IConfiguration config, ILogger<NewsImageStore> logger)
        {
            _config = config;
            _logger = logger;
            _s3 = new Lazy<AmazonS3Client?>(CreateClient);
        }

        public bool CanUpload => _s3.Value != null && !string.IsNullOrEmpty(Bucket) && !string.IsNullOrEmpty(PublicUrl);

        private string? Bucket => _config["R2:BucketName"];
        private string? PublicUrl => _config["R2:PublicUrl"]?.TrimEnd('/');

        private AmazonS3Client? CreateClient()
        {
            var account = _config["R2:AccountId"];
            var key = _config["R2:AccessKeyId"];
            var secret = _config["R2:SecretAccessKey"];
            if (string.IsNullOrWhiteSpace(account) || string.IsNullOrWhiteSpace(key) || string.IsNullOrWhiteSpace(secret))
            {
                _logger.LogWarning("[News] R2 ayari yok: gorsel uretimi kapali (katalog gorselleri calisir).");
                return null;
            }

            return new AmazonS3Client(key, secret, new AmazonS3Config
            {
                ServiceURL = $"https://{account}.r2.cloudflarestorage.com",
                ForcePathStyle = true,
                AuthenticationRegion = "auto"
            });
        }

        public sealed record CatalogMatch(int GameId, string Name, string ImageUrl);

        /// <summary>
        /// Oyunu katalogda TAM ad olarak arar (ILIKE, trigram indeksi kullanir): once resmi ad, sonra
        /// kaynaklardaki bicim ("Grand Theft Auto VI", sonra "GTA 6"). Kaynaklarda iki addan biri gecmiyorsa
        /// aranmaz: model uydurdugu bir adla yanlis oyuna baglamasin. Ayni adli birden fazla kayitta
        /// gundemdeki ve en cok eklenen secilir.
        /// </summary>
        public async Task<CatalogMatch?> FindCatalogGameAsync(GGHubDbContext db, string? officialName, string? nameInSources,
            IReadOnlyList<string> titles, IReadOnlyList<string> bodies, CancellationToken ct)
        {
            var grounded = (!string.IsNullOrWhiteSpace(nameInSources) && NewsText.NameAppearsIn(nameInSources, titles, bodies))
                || (!string.IsNullOrWhiteSpace(officialName) && NewsText.NameAppearsIn(officialName, titles, bodies));
            if (!grounded) return null;

            foreach (var name in new[] { officialName, nameInSources }.Distinct())
            {
                var match = await FindExactAsync(db, name, ct);
                if (match != null) return match;
            }
            return null;
        }

        /// <summary>
        /// Once tam ad (ILIKE, trigram indeksi). Bulunamazsa sitenin ortak oyun aramasi (GameSearch):
        /// "GTA 6" -> Grand Theft Auto VI, "Baldur's Gate 3" -> Baldur's Gate III, aksan ve kesme isareti
        /// farklari. Yanlis oyuna baglanmasin diye sorgunun HER kelimesi adda ya da uretilmis anahtarlarda
        /// tam olarak bulunmali ve adda en fazla 2 fazla kelime olabilir (kisaltma/takma adla eslesme haric).
        /// Esitlikte bilinen oyun kazanir (GameSearch.Score populerligi de tartar).
        /// </summary>
        private static async Task<CatalogMatch?> FindExactAsync(GGHubDbContext db, string? gameName, CancellationToken ct)
        {
            if (string.IsNullOrWhiteSpace(gameName) || gameName.Length > 120) return null;
            var escaped = gameName.Trim().Replace("\\", "\\\\").Replace("%", "\\%").Replace("_", "\\_");
            var withImage = db.Games.AsNoTracking().Where(g => g.BackgroundImage != null && g.BackgroundImage != "");

            var exact = await withImage
                .Where(g => EF.Functions.ILike(g.Name, escaped, "\\"))
                .OrderByDescending(g => g.HypeScore)
                .ThenByDescending(g => g.RawgAdded ?? 0)
                .Select(g => new { g.Id, g.Name, g.BackgroundImage })
                .FirstOrDefaultAsync(ct);
            if (exact != null) return new CatalogMatch(exact.Id, exact.Name, exact.BackgroundImage!);

            var parsed = GameSearch.Parse(gameName);
            if (parsed.IsEmpty) return null;

            var candidates = await GameSearch.Project(GameSearch.WhereMatches(withImage, parsed.Tokens))
                .OrderByDescending(c => c.HypeScore)
                .Take(40)
                .ToListAsync(ct);

            GameSearch.Candidate? best = null;
            var bestScore = double.MinValue;
            foreach (var c in candidates)
            {
                var text = c.SearchText ?? GGHub.Core.Specifications.GameSearchKeys.Build(c.Name) ?? string.Empty;
                var parts = text.Split('|');
                var nameWords = parts.Length > 1 ? parts[1].Split(' ', StringSplitOptions.RemoveEmptyEntries).ToHashSet() : new HashSet<string>();
                var otherWords = parts.Skip(2).SelectMany(p => p.Split(' ', StringSplitOptions.RemoveEmptyEntries)).ToHashSet();

                if (!parsed.Tokens.All(t => nameWords.Contains(t) || otherWords.Contains(t))) continue;
                var viaShortForm = parsed.Tokens.Any(t => !nameWords.Contains(t));
                if (!viaShortForm && nameWords.Count > parsed.Tokens.Count + 2) continue;

                var score = GameSearch.Score(c, parsed);
                if (score > bestScore) { bestScore = score; best = c; }
            }

            return best is null ? null : new CatalogMatch(best.Id, best.Name, best.BackgroundImage!);
        }

        /// <summary>Gorsel uretir, WebP'ye cevirir, R2'ye yazar. Basarisizsa null.</summary>
        public async Task<string?> GenerateAsync(IGeminiService gemini, string imagePrompt, CancellationToken ct)
        {
            if (!CanUpload) return null;

            var prompt = $"""
                Editorial illustration for a video game news article, wide 16:9 composition.
                {imagePrompt}
                Style: modern digital painting, cinematic lighting, rich but not oversaturated colors, clean composition.
                Strictly no text, letters, numbers, logos, watermarks, user interface, real people or recognizable characters.
                """;

            var result = await gemini.GenerateImageAsync(GeminiSources.News, ImageModel, prompt, "16:9", ct);
            if (result is null || result.Bytes.Length == 0) return null;

            using var image = Image.Load(result.Bytes);
            if (image.Width > MaxWidth)
            {
                image.Mutate(x => x.Resize(new ResizeOptions { Size = new Size(MaxWidth, 0), Mode = ResizeMode.Max }));
            }

            using var ms = new MemoryStream();
            await image.SaveAsWebpAsync(ms, new WebpEncoder { Quality = WebpQuality }, ct);
            ms.Position = 0;

            var key = $"{KeyPrefix}/{DateTime.UtcNow:yyyy}/{Guid.NewGuid():N}.webp";
            var put = new PutObjectRequest
            {
                BucketName = Bucket,
                Key = key,
                InputStream = ms,
                ContentType = "image/webp",
                DisablePayloadSigning = true,
                DisableDefaultChecksumValidation = true
            };
            put.Headers.CacheControl = AssetCacheControl;
            await _s3.Value!.PutObjectAsync(put, ct);

            return $"{PublicUrl}/{key}";
        }

        /// <summary>Saklama budamasi: yalniz bizim yazdigimiz news/ anahtarlarini siler.</summary>
        public async Task DeleteAsync(string url, CancellationToken ct)
        {
            if (!CanUpload) return;
            var prefix = $"{PublicUrl}/{KeyPrefix}/";
            if (!url.StartsWith(prefix, StringComparison.Ordinal)) return;
            var key = url[(PublicUrl!.Length + 1)..];
            try
            {
                await _s3.Value!.DeleteObjectAsync(Bucket, key, ct);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                _logger.LogWarning(ex, "[News] R2 gorseli silinemedi: {Key}", key);
            }
        }

        public void Dispose()
        {
            if (_s3.IsValueCreated) _s3.Value?.Dispose();
        }
    }
}
