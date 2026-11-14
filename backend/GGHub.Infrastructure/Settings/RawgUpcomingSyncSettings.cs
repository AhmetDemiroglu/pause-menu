namespace GGHub.Infrastructure.Settings
{
    /// <summary>
    /// RAWG yakin-gelecek senkron job'u ayarlari. RawgImportJob'in (durdurulmus genisleme
    /// crawler'i) aksine bu job dar bir pencereyi tazeler: bugunden itibaren birkac ay.
    /// Ayni zamanda RAWG-Steam uzlastiricisidir: RAWG, Steam'den ingest edilmis bir oyunu
    /// sonradan indekslerse satirin RawgId'si gercek pozitif id'ye cevrilir.
    /// </summary>
    public class RawgUpcomingSyncSettings
    {
        public bool Enabled { get; set; } = true;

        public int RunIntervalHours { get; set; } = 12;

        /// <summary>
        /// Bugunden kac ay ilerisine kadar taransin. Gundem sayfasinin "Tum Yil" gorunumu
        /// oldugu icin pencere genis tutulur.
        /// </summary>
        public int MonthsAhead { get; set; } = 14;

        public int MaxPagesPerRun { get; set; } = 15;
        public int PageSize { get; set; } = 40;
        public int DelayBetweenRequestsMs { get; set; } = 1500;

        /// <summary>
        /// Cikmamis oyunlarin ratings_count'u dogal olarak 0'dir; tek ilgi sinyali "added".
        /// RawgImportJob'in MinAdded=20 esigi burada fazla siki olur, gevsek tutuluyor.
        /// </summary>
        public int MinAdded { get; set; } = 5;

        /// <summary>
        /// Son kac ayda cikmis oyunlar da taransin. Puanlar (rating, ratings_count) oyun
        /// CIKTIKTAN SONRA toplanir; yalniz ileri bakan pencere cikan oyunu bir daha hic
        /// gormuyordu ve puani 0'da kaliyordu (Phantom Blade Zero: RAWG 3.67, katalog 0).
        /// 0 = geri tarama kapali.
        /// </summary>
        public int MonthsBack { get; set; } = 6;

        /// <summary>Geri taramada kosu basina en fazla kac sayfa (ordering=-added).</summary>
        public int MaxPagesBackPerRun { get; set; } = 10;
    }
}
