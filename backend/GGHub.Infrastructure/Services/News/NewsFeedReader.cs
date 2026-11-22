using System.Net;
using System.Text.RegularExpressions;
using System.Xml;
using System.Xml.Linq;
using Microsoft.Extensions.Logging;

namespace GGHub.Infrastructure.Services.News
{
    public sealed class NewsFeedItem
    {
        public required NewsFeed Feed { get; init; }
        public required string Title { get; init; }
        public required string Url { get; init; }

        /// <summary>RSS ozeti ya da tam icerik, duz metin.</summary>
        public string Text { get; set; } = string.Empty;
        public DateTime PublishedAt { get; init; }
        public IReadOnlyList<string> Categories { get; init; } = Array.Empty<string>();

        public HashSet<string> Tokens { get; set; } = new();

        /// <summary>Bekleme kuyrugundan geldiyse ilk goruldugu an (tavana takilip ertesi gune kalan yazi).</summary>
        public DateTime? QueuedAt { get; set; }
    }

    public sealed class NewsFeedFetchResult
    {
        public required NewsFeed Feed { get; init; }
        public List<NewsFeedItem> Items { get; init; } = new();
        public bool NotModified { get; init; }
        public string? Error { get; init; }
        public string? ETag { get; init; }
        public string? LastModified { get; init; }
    }

    /// <summary>
    /// RSS 2.0 ve Atom okuyucu. Kosullu GET (ETag / Last-Modified): degismemis akis 304 doner ve
    /// govde inmez. Kaynak sitelere nazik: tanimlayici User-Agent, 20 sn zaman asimi, 5 MB tavan.
    /// Kaynak yaziyi tam okumak (FetchArticleTextAsync) yalniz RSS ozeti cok kisaysa ve robots.txt
    /// izin veriyorsa yapilir.
    /// </summary>
    public sealed class NewsFeedReader
    {
        public const string HttpClientName = "News";
        private const int MaxFeedBytes = 5 * 1024 * 1024;
        private const int MaxArticleBytes = 2 * 1024 * 1024;

        private readonly IHttpClientFactory _httpFactory;
        private readonly ILogger<NewsFeedReader> _logger;
        private readonly Dictionary<string, List<string>> _robotsCache = new(StringComparer.OrdinalIgnoreCase);

        public NewsFeedReader(IHttpClientFactory httpFactory, ILogger<NewsFeedReader> logger)
        {
            _httpFactory = httpFactory;
            _logger = logger;
        }

        public async Task<NewsFeedFetchResult> FetchAsync(NewsFeed feed, string? etag, string? lastModified, CancellationToken ct)
        {
            try
            {
                var client = _httpFactory.CreateClient(HttpClientName);
                using var req = new HttpRequestMessage(HttpMethod.Get, feed.Url);
                if (!string.IsNullOrEmpty(etag)) req.Headers.TryAddWithoutValidation("If-None-Match", etag);
                if (!string.IsNullOrEmpty(lastModified)) req.Headers.TryAddWithoutValidation("If-Modified-Since", lastModified);

                using var resp = await client.SendAsync(req, HttpCompletionOption.ResponseHeadersRead, ct);
                if (resp.StatusCode == HttpStatusCode.NotModified)
                {
                    return new NewsFeedFetchResult { Feed = feed, NotModified = true, ETag = etag, LastModified = lastModified };
                }
                if (!resp.IsSuccessStatusCode)
                {
                    return new NewsFeedFetchResult { Feed = feed, Error = $"HTTP {(int)resp.StatusCode}" };
                }

                var body = await ReadLimitedAsync(resp, MaxFeedBytes, ct);
                var items = Parse(feed, body);

                return new NewsFeedFetchResult
                {
                    Feed = feed,
                    Items = items,
                    ETag = resp.Headers.ETag?.ToString(),
                    LastModified = resp.Content.Headers.LastModified?.ToString("R")
                };
            }
            catch (Exception ex) when (ex is not OperationCanceledException || !ct.IsCancellationRequested)
            {
                return new NewsFeedFetchResult { Feed = feed, Error = ex.GetType().Name + ": " + ex.Message };
            }
        }

        public static List<NewsFeedItem> Parse(NewsFeed feed, string xml)
        {
            var doc = LoadXml(xml);
            var items = new List<NewsFeedItem>();
            if (doc?.Root is null) return items;

            XNamespace content = "http://purl.org/rss/1.0/modules/content/";
            XNamespace atom = "http://www.w3.org/2005/Atom";
            XNamespace dc = "http://purl.org/dc/elements/1.1/";

            // RSS 2.0
            foreach (var it in doc.Descendants("item"))
            {
                var title = Clean(it.Element("title")?.Value);
                var link = it.Element("link")?.Value?.Trim();
                if (string.IsNullOrEmpty(link))
                {
                    var guid = it.Element("guid");
                    if (guid != null && guid.Value.StartsWith("http", StringComparison.OrdinalIgnoreCase)) link = guid.Value.Trim();
                }
                if (string.IsNullOrEmpty(title) || string.IsNullOrEmpty(link)) continue;

                var full = it.Element(content + "encoded")?.Value;
                var desc = it.Element("description")?.Value;
                var text = NewsText.HtmlToText(!string.IsNullOrWhiteSpace(full) && full.Length > (desc?.Length ?? 0) ? full : desc);
                var date = ParseDate(it.Element("pubDate")?.Value ?? it.Element(dc + "date")?.Value);
                var cats = it.Elements("category").Select(c => Clean(c.Value)).Where(c => c.Length > 0).ToList();

                items.Add(new NewsFeedItem { Feed = feed, Title = title, Url = CleanUrl(link), Text = text, PublishedAt = date, Categories = cats });
            }

            // Atom
            foreach (var en in doc.Descendants(atom + "entry"))
            {
                var title = Clean(en.Element(atom + "title")?.Value);
                var linkEl = en.Elements(atom + "link").FirstOrDefault(l => (string?)l.Attribute("rel") is null or "alternate");
                var link = (string?)linkEl?.Attribute("href");
                if (string.IsNullOrEmpty(title) || string.IsNullOrEmpty(link)) continue;

                var full = en.Element(atom + "content")?.Value;
                var summary = en.Element(atom + "summary")?.Value;
                var text = NewsText.HtmlToText(!string.IsNullOrWhiteSpace(full) ? full : summary);
                var date = ParseDate(en.Element(atom + "published")?.Value ?? en.Element(atom + "updated")?.Value);
                var cats = en.Elements(atom + "category").Select(c => Clean((string?)c.Attribute("term"))).Where(c => c.Length > 0).ToList();

                items.Add(new NewsFeedItem { Feed = feed, Title = title, Url = CleanUrl(link), Text = text, PublishedAt = date, Categories = cats });
            }

            return items;
        }

        /// <summary>
        /// Kaynak yazinin ana metni (paragraflar). robots.txt yasakliyorsa ya da cekilemezse bos.
        /// </summary>
        public async Task<string> FetchArticleTextAsync(string url, CancellationToken ct)
        {
            try
            {
                if (!Uri.TryCreate(url, UriKind.Absolute, out var uri) || uri.Scheme != Uri.UriSchemeHttps && uri.Scheme != Uri.UriSchemeHttp)
                    return string.Empty;
                if (!await IsAllowedByRobotsAsync(uri, ct))
                    return string.Empty;

                var client = _httpFactory.CreateClient(HttpClientName);
                using var resp = await client.GetAsync(uri, HttpCompletionOption.ResponseHeadersRead, ct);
                if (!resp.IsSuccessStatusCode) return string.Empty;
                var html = await ReadLimitedAsync(resp, MaxArticleBytes, ct);

                var scope = html;
                var art = Regex.Match(html, @"<article[^>]*>(.*?)</article>", RegexOptions.Singleline | RegexOptions.IgnoreCase);
                if (art.Success && art.Groups[1].Value.Length > 500) scope = art.Groups[1].Value;

                var paragraphs = Regex.Matches(scope, @"<p[^>]*>(.*?)</p>", RegexOptions.Singleline | RegexOptions.IgnoreCase)
                    .Select(m => NewsText.HtmlToText(m.Groups[1].Value, 2000))
                    .Where(p => p.Length >= 60)
                    .Take(25);

                var text = string.Join("\n\n", paragraphs);
                return text.Length > 4000 ? text[..4000] : text;
            }
            catch (Exception ex) when (ex is not OperationCanceledException || !ct.IsCancellationRequested)
            {
                _logger.LogDebug(ex, "[News] Makale okunamadi: {Url}", url);
                return string.Empty;
            }
        }

        private async Task<bool> IsAllowedByRobotsAsync(Uri uri, CancellationToken ct)
        {
            var host = uri.Host;
            if (!_robotsCache.TryGetValue(host, out var disallow))
            {
                disallow = new List<string>();
                try
                {
                    var client = _httpFactory.CreateClient(HttpClientName);
                    using var resp = await client.GetAsync($"{uri.Scheme}://{host}/robots.txt", ct);
                    if (resp.IsSuccessStatusCode)
                    {
                        var txt = await ReadLimitedAsync(resp, 512 * 1024, ct);
                        disallow = ParseRobots(txt);
                    }
                }
                catch (Exception ex) when (ex is not OperationCanceledException || !ct.IsCancellationRequested)
                {
                    // robots.txt okunamazsa makaleyi de okumayiz (temkinli taraf).
                    disallow = new List<string> { "/" };
                }
                _robotsCache[host] = disallow;
            }

            var path = uri.PathAndQuery;
            return !disallow.Any(d => d.Length > 0 && path.StartsWith(d, StringComparison.Ordinal));
        }

        /// <summary>"User-agent: *" ve bizim ajan grubundaki Disallow satirlari.</summary>
        public static List<string> ParseRobots(string txt)
        {
            var result = new List<string>();
            var applies = false;
            var lastWasAgent = false;
            foreach (var raw in txt.Split('\n'))
            {
                var line = raw.Split('#')[0].Trim();
                if (line.Length == 0) continue;
                var idx = line.IndexOf(':');
                if (idx < 0) continue;
                var key = line[..idx].Trim().ToLowerInvariant();
                var val = line[(idx + 1)..].Trim();

                if (key == "user-agent")
                {
                    var match = val == "*" || val.Contains("PauseMenu", StringComparison.OrdinalIgnoreCase);
                    applies = lastWasAgent ? applies || match : match;
                    lastWasAgent = true;
                    continue;
                }
                lastWasAgent = false;
                if (applies && key == "disallow" && val.Length > 0)
                {
                    result.Add(val.TrimEnd('*'));
                }
            }
            return result;
        }

        private static async Task<string> ReadLimitedAsync(HttpResponseMessage resp, int maxBytes, CancellationToken ct)
        {
            await using var stream = await resp.Content.ReadAsStreamAsync(ct);
            using var ms = new MemoryStream();
            var buffer = new byte[81920];
            int read;
            while ((read = await stream.ReadAsync(buffer, ct)) > 0)
            {
                ms.Write(buffer, 0, read);
                if (ms.Length > maxBytes) break;
            }
            var charset = resp.Content.Headers.ContentType?.CharSet;
            var enc = System.Text.Encoding.UTF8;
            if (!string.IsNullOrEmpty(charset))
            {
                try { enc = System.Text.Encoding.GetEncoding(charset.Trim('"')); } catch { }
            }
            return enc.GetString(ms.GetBuffer(), 0, (int)ms.Length);
        }

        private static XDocument? LoadXml(string xml)
        {
            var settings = new XmlReaderSettings { DtdProcessing = DtdProcessing.Ignore, XmlResolver = null, CheckCharacters = false };
            try
            {
                using var reader = XmlReader.Create(new StringReader(xml.TrimStart('﻿', ' ', '\r', '\n', '\t')), settings);
                return XDocument.Load(reader);
            }
            catch (XmlException)
            {
                // Bazi akislarda HTML varliklari (&nbsp;) ya da tek basina & oluyor: kacirip bir kez daha dene.
                var fixedXml = Regex.Replace(xml, @"&(?!(amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)", "&amp;");
                try
                {
                    using var reader = XmlReader.Create(new StringReader(fixedXml.TrimStart('﻿', ' ', '\r', '\n', '\t')), settings);
                    return XDocument.Load(reader);
                }
                catch (XmlException)
                {
                    return null;
                }
            }
        }

        private static string Clean(string? s) =>
            string.IsNullOrWhiteSpace(s) ? string.Empty : Regex.Replace(WebUtility.HtmlDecode(s), @"\s+", " ").Trim();

        /// <summary>Izleme parametrelerini atar: ayni yazi farkli utm ile iki kez islenmesin.</summary>
        private static string CleanUrl(string url)
        {
            url = url.Trim();
            var q = url.IndexOf('?');
            if (q < 0) return url;
            var baseUrl = url[..q];
            var kept = url[(q + 1)..].Split('&')
                .Where(p => !p.StartsWith("utm_", StringComparison.OrdinalIgnoreCase)
                    && !p.StartsWith("ref=", StringComparison.OrdinalIgnoreCase)
                    && !p.StartsWith("cmpid", StringComparison.OrdinalIgnoreCase))
                .ToList();
            return kept.Count == 0 ? baseUrl : baseUrl + "?" + string.Join('&', kept);
        }

        private static DateTime ParseDate(string? s)
        {
            if (!string.IsNullOrWhiteSpace(s))
            {
                s = s.Trim();
                if (DateTimeOffset.TryParse(s, System.Globalization.CultureInfo.InvariantCulture,
                        System.Globalization.DateTimeStyles.AssumeUniversal, out var dto))
                    return dto.UtcDateTime;
                // RFC 822 "GMT" disi kisaltmalar (EST, PST...) icin kaba duzeltme.
                var m = Regex.Match(s, @"^(.*\d{2}:\d{2}(:\d{2})?)\s*([A-Z]{2,4})$");
                if (m.Success && DateTimeOffset.TryParse(m.Groups[1].Value, System.Globalization.CultureInfo.InvariantCulture,
                        System.Globalization.DateTimeStyles.AssumeUniversal, out var dto2))
                    return dto2.UtcDateTime;
            }
            return DateTime.UtcNow;
        }
    }
}
