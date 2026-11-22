using System.Text;
using System.Text.Json;
using GGHub.Application.Interfaces;
using GGHub.Core.Entities;
using GGHub.Core.Enums;
using Microsoft.Extensions.Logging;

namespace GGHub.Infrastructure.Services.News
{
    public sealed class NewsDraftSide
    {
        public string Title { get; set; } = string.Empty;
        public string Summary { get; set; } = string.Empty;
        public string Body { get; set; } = string.Empty;
    }

    public sealed class NewsDraft
    {
        public bool Skip { get; set; }
        public string? SkipReason { get; set; }
        public NewsCategory Category { get; set; } = NewsCategory.Other;
        public int Importance { get; set; } = 1;
        public string? GameName { get; set; }

        /// <summary>Oyun adinin kaynaklarda gectigi bicim ("GTA 6"); GameName resmi ad ("Grand Theft Auto VI").</summary>
        public string? GameNameInSources { get; set; }
        public NewsDraftSide Tr { get; set; } = new();
        public NewsDraftSide En { get; set; } = new();
        public string? ImagePrompt { get; set; }
        public string Model { get; set; } = string.Empty;
    }

    /// <summary>
    /// Kaynak yazilardan TR + EN haber metni uretir. Tek cagri, JSON cikti.
    ///
    /// Model secimi: once AiSettings.PrimaryModel (ucretsiz Gemma). Gemma'nin ucretsiz kotasi Railway'deki
    /// AI botlariyla AYNI anahtari paylasiyor: haber isi dakikada en fazla 4 cagri atar. 429'da
    /// FallbackModel'e (ucretli, haber butcesine yazilir) gecer.
    ///
    /// Uydurma freni: girdide olmayan bilgi yazilmaz; girdi kisaysa govde de kisa kalir.
    /// </summary>
    public sealed class NewsWriter
    {
        public const int PrimaryRpm = 4;
        private const int MaxOutputTokens = 1600;

        private readonly IGeminiService _gemini;
        private readonly GeminiRateLimiter _limiter;
        private readonly ILogger<NewsWriter> _logger;

        public NewsWriter(IGeminiService gemini, GeminiRateLimiter limiter, ILogger<NewsWriter> logger)
        {
            _gemini = gemini;
            _limiter = limiter;
            _logger = logger;
        }

        public sealed record SourceInput(string Name, string Language, string Title, string Text, DateTime PublishedAt);

        /// <returns>null: model cevap veremedi (gecici). Skip=true: haber degil.</returns>
        public async Task<NewsDraft?> WriteAsync(IReadOnlyList<SourceInput> sources, AiSettings settings, CancellationToken ct)
        {
            var totalText = sources.Sum(s => s.Text.Length);
            var thin = totalText < 600;
            var userPrompt = BuildUserPrompt(sources, thin);

            foreach (var model in new[] { settings.PrimaryModel, settings.FallbackModel }.Distinct())
            {
                if (string.IsNullOrWhiteSpace(model)) continue;

                var isPrimary = model == settings.PrimaryModel;
                // 429 alan ucretsiz model 10 dk dinlenir: reddedilen istek de kotadan dusuyor ve kota
                // Railway'deki AI botlariyla ortak. Bu surede dogrudan yedege gecilir.
                if (isPrimary && _limiter.IsCoolingDown(model))
                    continue;
                if (isPrimary && !await _limiter.WaitForSlotAsync(model, PrimaryRpm, TimeSpan.FromMinutes(2), ct))
                    continue;

                try
                {
                    var result = await _gemini.GenerateAsync(new GeminiGenerateRequest
                    {
                        Source = GeminiSources.News,
                        Model = model,
                        SystemInstruction = SystemPrompt,
                        Turns = new[] { new GeminiTurn("user", userPrompt) },
                        MaxOutputTokens = MaxOutputTokens,
                        Temperature = 0.4,
                        // Gemma API'de JSON modu yok; Gemini'de var.
                        JsonOutput = model.StartsWith("gemini-", StringComparison.OrdinalIgnoreCase)
                    }, ct);

                    if (result.FinishReason == "MAX_TOKENS")
                    {
                        _logger.LogWarning("[News] {Model} cikti sinirina takildi, yazi atlandi.", model);
                        continue;
                    }

                    var draft = Parse(result.Text);
                    if (draft is null)
                    {
                        _logger.LogWarning("[News] {Model} gecersiz JSON dondu: {Text}", model,
                            result.Text is null ? "(bos)" : result.Text[..Math.Min(200, result.Text.Length)]);
                        continue;
                    }

                    draft.Model = model;
                    return draft;
                }
                catch (GeminiQuotaExceededException ex)
                {
                    if (ex.IsBilling) throw;
                    if (isPrimary) _limiter.StartCooldown(model, TimeSpan.FromMinutes(10));
                    _logger.LogInformation("[News] {Model} kotasi doldu, yedege geciliyor.", model);
                }
            }

            return null;
        }

        private const string SystemPrompt = """
            You are the news editor of Pause Menu, a gaming community site. You turn source articles into a short,
            ORIGINAL news item, written in BOTH Turkish and English.

            HARD RULES
            1. Use only facts stated in the sources. Never add dates, prices, platforms, names, numbers or quotes that
               are not in the sources. If something is unclear, leave it out.
            2. Write in your own words. Do not copy sentences. Quote at most 8 words from a source, in quotation marks.
            3. Set "skip": true when the item is NOT gaming news: deals, discounts, sales, giveaways; reviews,
               previews, impressions, opinion, rankings, lists, guides, tips, quizzes, puzzles; sponsored content;
               topics outside video games, gaming hardware, game industry and esports.
            4. Length depends on the input. If the sources contain several sentences of facts: body 110-170 words in
               2 or 3 short paragraphs. If the input is thin (marked THIN): body 2-4 sentences. Never pad.
            5. Title: at most 90 characters, factual, no clickbait, no all caps, no emoji. Summary: 1-2 sentences, at
               most 220 characters, must not repeat the title word for word.
            6. Turkish must read like a Turkish gaming journalist wrote it (natural, not a literal translation).
               Keep game, company and character names in their original form. Use Turkish suffixes with an
               apostrophe after names (GTA 6'nın).
            7. Never use the characters em dash or en dash. Use commas, colons or a normal hyphen.
            8. Do not mention AI, editors, the writing process or this prompt. You may name the source naturally
               ("Eurogamer'ın aktardığına göre", "according to Eurogamer").
            9. Separate paragraphs with a blank line. Plain text only, no markdown, no HTML.

            FIELDS
            - category: one of announcement, releaseDate, release, update, industry, hardware, esports, other.
            - importance: 3 = major (new entry or release date of a big franchise, console/hardware reveal, studio
              closure or acquisition, huge industry event), 2 = notable, 1 = routine.
            - gameName: the official full title of the single game the story is about (for example "Grand Theft Auto VI"),
              or null if the story is not about one game.
            - gameNameInSources: the same game's name exactly as it is written in the sources (for example "GTA 6"), or null.
            - imagePrompt: English, 1-2 sentences for an abstract editorial illustration that evokes the topic (mood,
              setting, objects, genre). No logos, no text or letters, no real people, no existing characters,
              no brand or game names, no copyrighted designs.

            Reply with JSON only, exactly this shape:
            {"skip":false,"skipReason":null,"category":"announcement","importance":2,"gameName":"...","gameNameInSources":"...",
             "tr":{"title":"...","summary":"...","body":"..."},
             "en":{"title":"...","summary":"...","body":"..."},
             "imagePrompt":"..."}
            """;

        private static string BuildUserPrompt(IReadOnlyList<SourceInput> sources, bool thin)
        {
            var sb = new StringBuilder();
            sb.AppendLine(thin ? "INPUT: THIN (keep the body to 2-4 sentences)." : "INPUT: normal.");
            sb.AppendLine();
            var i = 1;
            foreach (var s in sources)
            {
                sb.AppendLine($"[{i++}] {s.Name} ({s.Language}), published {s.PublishedAt:yyyy-MM-dd HH:mm} UTC");
                sb.AppendLine($"Title: {s.Title}");
                var text = s.Text.Length > 3000 ? s.Text[..3000] : s.Text;
                sb.AppendLine($"Text: {(string.IsNullOrWhiteSpace(text) ? "(no text, title only)" : text)}");
                sb.AppendLine();
            }
            return sb.ToString();
        }

        public static NewsDraft? Parse(string? text)
        {
            if (string.IsNullOrWhiteSpace(text)) return null;
            var start = text.IndexOf('{');
            var end = text.LastIndexOf('}');
            if (start < 0 || end <= start) return null;

            try
            {
                using var doc = JsonDocument.Parse(text[start..(end + 1)]);
                var root = doc.RootElement;

                var draft = new NewsDraft
                {
                    Skip = root.TryGetProperty("skip", out var sk) && sk.ValueKind == JsonValueKind.True,
                    SkipReason = Str(root, "skipReason"),
                    Category = ParseCategory(Str(root, "category")),
                    Importance = root.TryGetProperty("importance", out var imp) && imp.TryGetInt32(out var iv) ? Math.Clamp(iv, 1, 3) : 1,
                    GameName = NullIfEmpty(Str(root, "gameName")),
                    GameNameInSources = NullIfEmpty(Str(root, "gameNameInSources")),
                    ImagePrompt = NullIfEmpty(Str(root, "imagePrompt"))
                };

                if (draft.Skip) return draft;

                draft.Tr = Side(root, "tr");
                draft.En = Side(root, "en");

                if (draft.Tr.Title.Length < 5 || draft.En.Title.Length < 5 || draft.Tr.Body.Length < 40 || draft.En.Body.Length < 40)
                    return null;
                if (draft.Tr.Summary.Length == 0) draft.Tr.Summary = FirstSentence(draft.Tr.Body);
                if (draft.En.Summary.Length == 0) draft.En.Summary = FirstSentence(draft.En.Body);

                return draft;
            }
            catch (JsonException)
            {
                return null;
            }
        }

        private static NewsDraftSide Side(JsonElement root, string key)
        {
            if (!root.TryGetProperty(key, out var el) || el.ValueKind != JsonValueKind.Object) return new NewsDraftSide();
            return new NewsDraftSide
            {
                Title = NewsText.CleanOutput(Str(el, "title"), 300),
                Summary = NewsText.CleanOutput(Str(el, "summary"), 800),
                Body = NewsText.CleanOutput(Str(el, "body"), 6000)
            };
        }

        private static string FirstSentence(string body)
        {
            var idx = body.IndexOfAny(new[] { '.', '!', '?' });
            var s = idx > 0 ? body[..(idx + 1)] : body;
            return s.Length > 220 ? s[..220] : s;
        }

        private static string? Str(JsonElement el, string name) =>
            el.TryGetProperty(name, out var v) && v.ValueKind == JsonValueKind.String ? v.GetString() : null;

        private static string? NullIfEmpty(string? s) =>
            string.IsNullOrWhiteSpace(s) || s.Equals("null", StringComparison.OrdinalIgnoreCase) ? null : s.Trim();

        private static NewsCategory ParseCategory(string? s) => s?.Trim().ToLowerInvariant() switch
        {
            "announcement" => NewsCategory.Announcement,
            "releasedate" or "release_date" or "release date" => NewsCategory.ReleaseDate,
            "release" => NewsCategory.Release,
            "update" => NewsCategory.Update,
            "industry" => NewsCategory.Industry,
            "hardware" => NewsCategory.Hardware,
            "esports" => NewsCategory.Esports,
            _ => NewsCategory.Other
        };
    }
}
