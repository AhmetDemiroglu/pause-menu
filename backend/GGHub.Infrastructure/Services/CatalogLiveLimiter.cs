using System.Text.RegularExpressions;
using System.Threading.RateLimiting;

namespace GGHub.Infrastructure.Services
{
    /// <summary>
    /// Istek yolundan disari giden canli katalog cagrilarinin (RAWG detay, Steam/IGDB arama ingest'i,
    /// IGDB anlik zenginlestirme) surec geneli tavani.
    ///
    /// Neden: anonim `GET /api/games/{slug}` DB'de olmayan her slug icin RAWG'a, o da yoksa IGDB'ye
    /// gidip satir ekliyordu; anonim arama da DB'de 3'ten az sonuc buldugunda Steam + IGDB'ye gidip
    /// 6'ya kadar oyun ingest ediyordu. Rastgele slug/terim gezen bir bot RAWG kotasini bitirir,
    /// Steam'in Railway IP'sini engellemesine yol acar ve Games tablosunu buyutur. Gercek kullanicinin
    /// eksik oyun aramasi dakikada birkac kezdir; tavan dolunca canli adim atlanir, DB sonucu doner.
    /// </summary>
    public static class CatalogLiveLimiter
    {
        private static readonly FixedWindowRateLimiter Limiter = new(new FixedWindowRateLimiterOptions
        {
            PermitLimit = 30,
            Window = TimeSpan.FromMinutes(1),
            QueueLimit = 0,
            AutoReplenishment = true,
        });

        // RAWG/IGDB slug bicimi. DB'de zaten olan oyun bu kontrolden once bulunur; kontrol yalniz
        // DB'de olmayan bir slug icin disari cikilip cikilmayacagina karar verir.
        private static readonly Regex SlugPattern = new("^[a-z0-9][a-z0-9-]{0,119}$", RegexOptions.Compiled | RegexOptions.CultureInvariant);

        /// <summary>Izin varsa true; tavan doluysa false (cagiran canli adimi atlar).</summary>
        public static bool TryAcquire()
        {
            using var lease = Limiter.AttemptAcquire(1);
            return lease.IsAcquired;
        }

        public static bool IsPlausibleSlug(string value) => SlugPattern.IsMatch(value);

        /// <summary>Canli aramaya gidecek terim makul mu: bos degil, cok uzun degil.</summary>
        public static bool IsPlausibleSearchTerm(string term) => term.Length is >= 2 and <= 80;
    }
}
