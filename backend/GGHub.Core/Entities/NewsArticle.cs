using GGHub.Core.Enums;

namespace GGHub.Core.Entities
{
    /// <summary>
    /// Oyun dunyasindan haber. Haber botu (GGHub.Worker, NewsIngestJob) RSS kaynaklarini tarar,
    /// ayni olayi yazan kaynaklari tek habere toplar ve metni kendi cumleleriyle TR ve EN yazar.
    /// Kaynaklarin listesi NewsArticleSource'ta; her haberde gorunur ve baglanti verilir.
    ///
    /// Railway bu tabloyu yalniz okur (NewsController). Yazan tek taraf Worker'dir.
    /// </summary>
    public class NewsArticle
    {
        public int Id { get; set; }

        /// <summary>URL'de kullanilan, dil bagimsiz kimlik: "ingilizce-baslik-slug-1a2b".</summary>
        public string Slug { get; set; } = null!;

        public string TitleTr { get; set; } = null!;
        public string TitleEn { get; set; } = null!;

        /// <summary>Spot: liste kartinda ve meta description'da gorunen 1-2 cumle.</summary>
        public string SummaryTr { get; set; } = null!;
        public string SummaryEn { get; set; } = null!;

        /// <summary>Gövde: paragraflar bos satirla ayrilir, HTML yok.</summary>
        public string BodyTr { get; set; } = null!;
        public string BodyEn { get; set; } = null!;

        public NewsCategory Category { get; set; }

        /// <summary>1 sıradan, 2 dikkat ceken, 3 buyuk haber. Liste basinda one cikarma ve gorsel onceligi.</summary>
        public int Importance { get; set; } = 1;

        public string? ImageUrl { get; set; }
        public NewsImageKind ImageKind { get; set; }

        /// <summary>Haber katalogdaki bir oyunla eslestiyse. Detayda oyun sayfasina kart cikar.</summary>
        public int? GameId { get; set; }
        public Game? Game { get; set; }

        /// <summary>Kaynaklarin en eskisinin yayin zamani (haberin ilk duyuldugu an).</summary>
        public DateTime PublishedAt { get; set; }
        public DateTime CreatedAt { get; set; }

        /// <summary>Admin gizledi: listede ve detayda gorunmez, sitemap'e girmez.</summary>
        public bool IsHidden { get; set; }

        /// <summary>Ilk dolumda (--news-backfill) yazildi: gunluk haber tavanina sayilmaz.</summary>
        public bool IsBackfill { get; set; }

        public ICollection<NewsArticleSource> Sources { get; set; } = new List<NewsArticleSource>();
    }

    /// <summary>Haberin dayandigi kaynak yazi. Url benzersiz: ayni yazi iki kez islenmez.</summary>
    public class NewsArticleSource
    {
        public int Id { get; set; }
        public int NewsArticleId { get; set; }
        public NewsArticle NewsArticle { get; set; } = null!;

        /// <summary>Kaynak sitesinin gorunen adi ("Eurogamer").</summary>
        public string SourceName { get; set; } = null!;

        /// <summary>NewsSources.cs icindeki anahtar ("eurogamer").</summary>
        public string FeedKey { get; set; } = null!;

        public string Url { get; set; } = null!;
        public string OriginalTitle { get; set; } = null!;

        /// <summary>"tr" | "en"</summary>
        public string Language { get; set; } = "en";

        public DateTime PublishedAt { get; set; }
    }

    /// <summary>
    /// Model "haber degil" dedigi (indirim, inceleme, rehber...) ya da yazilamayan kaynak yazilari.
    /// Tutulmazsa ayni yazi 20 dakikada bir yeniden modele gider. 7 gunden eskiler silinir.
    /// </summary>
    public class NewsSkippedItem
    {
        public string Url { get; set; } = null!;
        public string Reason { get; set; } = null!;
        public DateTime SkippedAt { get; set; }
    }

    /// <summary>
    /// Gunluk tavana takilan yazilar. Kaybolmasinlar diye burada bekler ve sonraki gunlerde ILK sirada
    /// yazilir (once en eski gun). Kaynak akislari 1-3 gun tuttugu icin bu tablo olmadan tavani asan
    /// haber akistan dusup hic yazilmazdi. Model 3 kez yazamazsa atlanan kayitlara tasinir.
    /// </summary>
    public class NewsPendingItem
    {
        public string Url { get; set; } = null!;
        public string FeedKey { get; set; } = null!;
        public string Title { get; set; } = null!;
        public string Text { get; set; } = string.Empty;
        public DateTime PublishedAt { get; set; }
        public DateTime FirstSeenAt { get; set; }
        public int Attempts { get; set; }
    }

    /// <summary>Kaynak basina kosullu GET durumu (ETag / Last-Modified).</summary>
    public class NewsFeedState
    {
        public string FeedKey { get; set; } = null!;
        public string? ETag { get; set; }
        public string? LastModified { get; set; }
        public DateTime? LastFetchedAt { get; set; }
        public int ConsecutiveFailures { get; set; }
    }

    /// <summary>
    /// Haber turunun kilidi ve nabzi. TEK satir (Id = 1). Mac'teki bot ve GitHub Actions ayni anda
    /// tur atmasin diye tur oncesi atomik UPDATE ile alinir (ExpiresAt gecmisse). Advisory lock
    /// kullanilmadi: EF havuzlu baglantilarda oturum kilidi guvenilir tutmuyor.
    /// LastCompletedAt: Actions buna bakar; Mac yakin zamanda tur attiysa hicbir sey yapmadan cikar.
    /// </summary>
    public class NewsRunLease
    {
        public int Id { get; set; } = 1;
        public string? Holder { get; set; }
        public DateTime ExpiresAt { get; set; }
        public DateTime? LastCompletedAt { get; set; }
        public string? LastCompletedBy { get; set; }
    }
}
