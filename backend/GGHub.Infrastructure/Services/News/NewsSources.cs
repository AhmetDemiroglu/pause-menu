namespace GGHub.Infrastructure.Services.News
{
    /// <summary>Haber kaynagi. Weight: oncelik puani (resmi bloglar ve hizli siteler yuksek).</summary>
    /// <param name="RequireCategory">Doluysa yalniz bu kelimeyi iceren &lt;category&gt; etiketli yazilar alinir.</param>
    public sealed record NewsFeed(string Key, string Name, string Url, string Language, int Weight, string? RequireCategory = null);

    /// <summary>
    /// Kaynak listesi. Her adres 22 Kas 2026'da tek tek denendi (calisiyor mu, kac gun geriye gidiyor).
    /// Calismayanlar (Oyungezer, Technopat, BSC, LeaderGamer, PlayerBros) ve kategori tasimayan genel
    /// teknoloji akislari (Webtekno, DonanimHaber) BILEREK yok.
    /// Kaynak eklerken: once "--news-once --dry-run" ile akisin ayristigini gor.
    /// </summary>
    public static class NewsSources
    {
        public static readonly IReadOnlyList<NewsFeed> All = new List<NewsFeed>
        {
            // Ingilizce: hizli ve guvenilir haber siteleri
            new("gematsu", "Gematsu", "https://www.gematsu.com/feed", "en", 5),
            new("vgc", "VGC", "https://www.videogameschronicle.com/feed/", "en", 5),
            new("eurogamer", "Eurogamer", "https://www.eurogamer.net/feed/news", "en", 4),
            new("pcgamer", "PC Gamer", "https://www.pcgamer.com/rss/", "en", 3),
            new("ign", "IGN", "https://feeds.feedburner.com/ign/games-all", "en", 4),
            new("gamespot", "GameSpot", "https://www.gamespot.com/feeds/news/", "en", 3),
            new("rps", "Rock Paper Shotgun", "https://www.rockpapershotgun.com/feed/news", "en", 3),
            new("polygon", "Polygon", "https://www.polygon.com/rss/index.xml", "en", 3),
            new("gamesindustry", "GamesIndustry.biz", "https://www.gamesindustry.biz/feed/news", "en", 3),
            new("kotaku", "Kotaku", "https://kotaku.com/rss", "en", 2),
            new("destructoid", "Destructoid", "https://www.destructoid.com/feed/", "en", 2),
            new("nintendolife", "Nintendo Life", "https://www.nintendolife.com/feeds/news", "en", 3),
            new("pushsquare", "Push Square", "https://www.pushsquare.com/feeds/news", "en", 3),
            new("purexbox", "Pure Xbox", "https://www.purexbox.com/feeds/news", "en", 3),

            // Ingilizce: resmi platform bloglari (birincil kaynak)
            new("psblog", "PlayStation Blog", "https://blog.playstation.com/feed/", "en", 6),
            new("xboxwire", "Xbox Wire", "https://news.xbox.com/en-us/feed/", "en", 6),

            // Turkce
            new("merlin", "Merlin'in Kazanı", "https://www.merlininkazani.com/rss", "tr", 3, RequireCategory: "oyun"),
            new("shiftdelete", "ShiftDelete.Net", "https://shiftdelete.net/oyun/feed", "tr", 2),
            new("savebutonu", "Save Butonu", "https://www.savebutonu.com/feed/", "tr", 2),
            new("fragtist", "Fragtist", "https://www.fragtist.com/feed/", "tr", 2),
        };

        public static NewsFeed? Find(string key) => All.FirstOrDefault(f => f.Key == key);
    }
}
