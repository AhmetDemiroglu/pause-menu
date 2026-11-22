using System.Globalization;
using System.Net;
using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;

namespace GGHub.Infrastructure.Services.News
{
    /// <summary>Haber botunun saf metin yardimcilari (DB'ye ve HTTP'ye bagli degil, test edilebilir).</summary>
    public static class NewsText
    {
        private static readonly Regex ScriptStyle = new(@"<(script|style|noscript|figure|figcaption)[^>]*>.*?</\1>", RegexOptions.Singleline | RegexOptions.IgnoreCase | RegexOptions.Compiled);
        private static readonly Regex BlockBreak = new(@"<\s*(br|/p|/div|/li|/h[1-6])\s*/?>", RegexOptions.IgnoreCase | RegexOptions.Compiled);
        private static readonly Regex Tag = new(@"<[^>]+>", RegexOptions.Compiled);
        private static readonly Regex Spaces = new(@"[ \t ]+", RegexOptions.Compiled);
        private static readonly Regex Newlines = new(@"\s*\n\s*(\n\s*)+", RegexOptions.Compiled);
        private static readonly Regex NonWord = new(@"[^\p{L}\p{N}]+", RegexOptions.Compiled);

        /// <summary>HTML'i duz metne cevirir; paragraflar bos satirla ayrilir. En fazla maxChars.</summary>
        public static string HtmlToText(string? html, int maxChars = 4000)
        {
            if (string.IsNullOrWhiteSpace(html)) return string.Empty;
            var s = ScriptStyle.Replace(html, " ");
            s = BlockBreak.Replace(s, "\n");
            s = Tag.Replace(s, " ");
            s = WebUtility.HtmlDecode(s);
            s = Spaces.Replace(s, " ");
            s = Newlines.Replace(s, "\n\n").Trim();
            return s.Length > maxChars ? s[..maxChars] : s;
        }

        /// <summary>Baslik karsilastirmasi icin: kucuk harf, Turkce harfler ASCII, noktalama yok.</summary>
        public static string Normalize(string? text)
        {
            if (string.IsNullOrEmpty(text)) return string.Empty;
            var s = WebUtility.HtmlDecode(text).ToLowerInvariant()
                .Replace('ı', 'i').Replace('İ', 'i').Replace('ş', 's').Replace('ğ', 'g')
                .Replace('ü', 'u').Replace('ö', 'o').Replace('ç', 'c').Replace('’', '\'');
            s = s.Replace("'s ", " ").Replace("'", "");
            return NonWord.Replace(s, " ").Trim();
        }

        private static readonly HashSet<string> Stopwords = new(StringComparer.Ordinal)
        {
            // en
            "the","a","an","and","or","of","to","in","on","for","with","is","are","was","be","by","at","from","as",
            "it","its","this","that","new","now","will","has","have","after","about","into","more","out","up","you",
            "your","how","why","what","when","who","just","over","not","can","get","gets","here","says","said","report",
            "reportedly","first","look","finally","officially","game","games","video",
            // tr
            "ve","ile","bir","bu","icin","da","de","ki","mi","mu","olarak","olan","yeni","geliyor","oldu","edildi",
            "ilk","tum","daha","cok","gibi","kadar","sonra","once","ne","nasil","neden","oyun","oyunu","oyunun","oyunlar",
            "aciklandi","duyuruldu","resmi","resmen","iste"
        };

        public static HashSet<string> Tokens(string? title)
        {
            var set = new HashSet<string>(StringComparer.Ordinal);
            foreach (var t in Normalize(title).Split(' ', StringSplitOptions.RemoveEmptyEntries))
            {
                if (t.Length < 2 && !char.IsDigit(t[0])) continue;
                if (Stopwords.Contains(t)) continue;
                set.Add(t);
            }
            return set;
        }

        /// <summary>
        /// Iki baslik ayni olayi mi anlatiyor? Ortak anlamli kelime sayisi ve Jaccard birlikte bakilir:
        /// kisa basliklarda tek ortak kelime (oyun adi) yeterli sayilmaz.
        /// </summary>
        public static bool SameStory(HashSet<string> a, HashSet<string> b)
        {
            if (a.Count == 0 || b.Count == 0) return false;
            var shared = a.Count(b.Contains);
            if (shared < 2) return false;
            var jaccard = shared / (double)(a.Count + b.Count - shared);
            return (shared >= 3 && jaccard >= 0.34) || jaccard >= 0.55;
        }

        private static readonly Regex[] ExcludePatterns =
        {
            // en: inceleme, rehber, indirim, liste, test, podcast, yarisma, oyun ici kod/konum rehberleri.
            // Dikkat: "sale" tek basina yok ("first day on sale", "pre-sale" gercek haber), "tricks" yok.
            new(@"\breview(s|ed)?\b(?![-\s]*bomb)", RegexOptions.IgnoreCase),
            new(@"\b(deals?|discount(ed|s)?|cheapest|lowest price|price drop|bargain|black friday|cyber monday|prime day|(is|are|goes|now) on sale|sale price)\b", RegexOptions.IgnoreCase),
            new(@"\b\d+\s*%\s*off\b", RegexOptions.IgnoreCase),
            new(@"\b(guide|walkthrough|how to|tips and tricks|tips|ranked|ranking|tier list|(the )?best (games?|deals?|settings|builds?|loadouts?|weapons?|perks?|classes|mods))\b", RegexOptions.IgnoreCase),
            new(@"\b(safe codes?|cheat codes?|codes? and locations?|sbc|solutions|password|unlock(ing)? (all|every)|all .* codes)\b", RegexOptions.IgnoreCase),
            new(@"\b(wordle|connections|quiz|crossword|podcast|giveaway|sponsored|hands-on|preview|impressions|interview|opinion|talking point|what are you playing)\b", RegexOptions.IgnoreCase),
            new(@"\b(where to (buy|find)|pre-?order (guide|now)|redeem codes?)\b", RegexOptions.IgnoreCase),
            // tr
            new(@"\b(inceleme|incelemesi|rehber|rehberi|indirim|indirimde|ucretsiz oldu|fırsat|firsat|kampanya|hangisi|en iyi|nasıl yapılır|nasil yapilir|ipuçları|ipuclari|kodları|kodlari|ön inceleme|test ettik|röportaj|nerede bulunur)\b", RegexOptions.IgnoreCase),
        };

        /// <summary>Basligi haber olmayan turden (inceleme, rehber, indirim...) mi? Modele hic gitmez.</summary>
        public static bool IsExcludedTitle(string title)
        {
            foreach (var p in ExcludePatterns)
            {
                if (p.IsMatch(title)) return true;
            }
            return false;
        }

        private static readonly Regex SpacedDash = new(@"\s+[—–]\s+", RegexOptions.Compiled);

        /// <summary>
        /// Em dash ve en dash kullaniciya gorunen metne girmez (proje kurali). Bosluklu tire virgule,
        /// bosluksuz tire (2024–2025) normal tireye doner.
        /// </summary>
        public static string CleanDashes(string? text)
        {
            if (string.IsNullOrEmpty(text)) return string.Empty;
            var s = SpacedDash.Replace(text, ", ");
            return s.Replace('—', '-').Replace('–', '-');
        }

        /// <summary>Model ciktisini tek parca metne indirger: bas/son bosluk, cok bos satir, dash.</summary>
        public static string CleanOutput(string? text, int maxChars)
        {
            var s = CleanDashes(text ?? string.Empty).Replace("\r", "");
            s = Newlines.Replace(s, "\n\n");
            s = Spaces.Replace(s, " ").Trim();
            if (s.Length > maxChars)
            {
                var cut = s.LastIndexOf(' ', maxChars - 1);
                s = s[..(cut > maxChars / 2 ? cut : maxChars)].TrimEnd(',', ';', ':', ' ') + "…";
            }
            return s;
        }

        /// <summary>Ingilizce basliktan dil bagimsiz slug: "gta-6-gets-a-new-trailer-3f9a1c".</summary>
        public static string Slugify(string title, string uniqueSeed)
        {
            var s = Normalize(title).Replace(' ', '-');
            s = Regex.Replace(s, "-+", "-").Trim('-');
            // ASCII disi kalan harfleri (aksanli Latin vb.) duzle.
            s = new string(s.Normalize(NormalizationForm.FormD)
                .Where(c => CharUnicodeInfo.GetUnicodeCategory(c) != UnicodeCategory.NonSpacingMark)
                .Where(c => c == '-' || (c < 128 && char.IsLetterOrDigit(c)))
                .ToArray());
            s = Regex.Replace(s, "-+", "-").Trim('-');
            if (s.Length > 90)
            {
                s = s[..90];
                var cut = s.LastIndexOf('-');
                if (cut > 40) s = s[..cut];
            }
            if (s.Length == 0) s = "news";
            return $"{s}-{ShortHash(uniqueSeed)}";
        }

        public static string ShortHash(string seed)
        {
            var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(seed));
            return Convert.ToHexString(bytes, 0, 3).ToLowerInvariant();
        }

        /// <summary>
        /// Oyun adi kaynak metinde gercekten geciyor mu? Model oyun adini uydurmasin diye katalog
        /// eslesmesinden once bakilir. Kisa/tek kelimelik adlar (Control, Prey) yalniz basliktan kabul.
        /// </summary>
        public static bool NameAppearsIn(string gameName, IEnumerable<string> titles, IEnumerable<string> bodies)
        {
            var name = Normalize(gameName);
            if (name.Length == 0) return false;
            var isShortOrSingle = name.Length < 4 || !name.Contains(' ');
            var pattern = new Regex($@"(^| ){Regex.Escape(name)}( |$)");

            if (titles.Any(t => pattern.IsMatch(Normalize(t)))) return true;
            if (isShortOrSingle) return false;
            return bodies.Any(b => pattern.IsMatch(Normalize(b)));
        }
    }
}
