using System.Reflection;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace GGHub.Core.Gamification
{
    /// <summary>
    /// Seviyeler, XP kurallari ve rozetlerin TEK kaynagi: gomulu catalog.json.
    ///
    /// Ayni dosyanin birebir kopyasi web (ui/src/core/gamification/catalog.json) ve mobil
    /// (mobile-ui/src/gamification/catalog.json) altinda durur; scripts/gamification-sync
    /// kopyalar, ui/tests/gamification.test.mjs kaymayi yakalar. Kural, esik ya da metin
    /// degisecekse YALNIZ backend'deki dosya duzenlenir.
    /// </summary>
    public static class GamificationCatalog
    {
        private static readonly Lazy<CatalogData> Data = new(Load);

        public static IReadOnlyList<LevelDef> Levels => Data.Value.Levels;
        public static IReadOnlyList<BadgeDef> Badges => Data.Value.Badges;
        public static IReadOnlyDictionary<string, XpRuleDef> Rules => Data.Value.Rules;
        public static IReadOnlyDictionary<string, string> LegacyTitles => Data.Value.LegacyTitles;
        public static int MaxLevel => Data.Value.Levels[^1].Number;

        public static BadgeDef? FindBadge(string code) =>
            Data.Value.BadgesByCode.TryGetValue(code, out var badge) ? badge : null;

        public static XpRuleDef Rule(string key) => Data.Value.Rules[key];

        /// <summary>XP'ye karsilik gelen seviye: esigi XP'yi asmayan en yuksek seviye.</summary>
        public static int LevelForXp(int xp)
        {
            var level = 1;
            foreach (var def in Data.Value.Levels)
            {
                if (xp >= def.RequiredXp) level = def.Number;
            }
            return level;
        }

        public static LevelDef LevelDef(int level)
        {
            var levels = Data.Value.Levels;
            var clamped = Math.Clamp(level, 1, levels[^1].Number);
            return levels.First(l => l.Number == clamped);
        }

        public static string LevelName(int level, string? locale) => LevelDef(level).Name.For(locale);

        public static string BadgeTitle(string code, string? locale) =>
            FindBadge(code)?.Title(locale) ?? code;

        private static CatalogData Load()
        {
            var assembly = typeof(GamificationCatalog).Assembly;
            var resource = assembly.GetManifestResourceNames().Single(n => n.EndsWith("Gamification.catalog.json", StringComparison.Ordinal));
            using var stream = assembly.GetManifestResourceStream(resource)!;
            var raw = JsonSerializer.Deserialize<RawCatalog>(stream, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true,
                ReadCommentHandling = JsonCommentHandling.Skip,
            }) ?? throw new InvalidOperationException("Gamification catalog could not be read.");

            return Build(raw);
        }

        internal static CatalogData Build(RawCatalog raw)
        {
            var levels = raw.Levels
                .OrderBy(l => l.Number)
                .Select(l => new LevelDef(l.Number, l.RequiredXp, l.Name))
                .ToList();

            var tierNames = raw.Tiers.ToDictionary(t => t.Tier, t => t.Name);
            var categoryOrder = raw.Categories.Select((c, i) => (c.Key, i)).ToDictionary(x => x.Key, x => x.i);
            var levelNames = levels.ToDictionary(l => l.Number, l => l.Name);

            var badges = new List<BadgeDef>();
            var familyIndex = 0;
            foreach (var family in raw.Families)
            {
                for (var i = 0; i < family.Thresholds.Count; i++)
                {
                    var threshold = family.Thresholds[i];
                    var tier = family.Single || family.LevelBadges ? 0 : i + 1;
                    var code = family.Single
                        ? family.Key
                        : family.LevelBadges ? $"level_{threshold}" : $"{family.Key}_{i + 1}";

                    var reward = family.Reward ?? (tier > 0 ? raw.TierRewards[Math.Min(tier, raw.TierRewards.Count) - 1] : 0);

                    LocalizedText title;
                    if (family.LevelBadges)
                    {
                        var levelName = levelNames.GetValueOrDefault(threshold) ?? new LocalizedText();
                        title = new LocalizedText
                        {
                            Tr = $"Seviye {threshold}: {levelName.Tr}",
                            En = $"Level {threshold}: {levelName.En}",
                        };
                    }
                    else if (tier > 0)
                    {
                        var tierName = tierNames[tier];
                        title = new LocalizedText
                        {
                            Tr = $"{tierName.Tr} {family.Name.Tr}",
                            En = $"{tierName.En} {family.Name.En}",
                        };
                    }
                    else
                    {
                        title = family.Name;
                    }

                    var descriptionTemplate = threshold == 1 && family.DescriptionOne is not null
                        ? family.DescriptionOne
                        : family.Description;

                    var description = new LocalizedText
                    {
                        Tr = descriptionTemplate.Tr.Replace("{n}", threshold.ToString()),
                        En = descriptionTemplate.En.Replace("{n}", threshold.ToString()),
                    };

                    badges.Add(new BadgeDef(
                        Code: code,
                        Family: family.Key,
                        Category: family.Category,
                        Tier: tier,
                        Metric: family.Metric,
                        Threshold: threshold,
                        XpReward: reward,
                        SortOrder: categoryOrder.GetValueOrDefault(family.Category) * 1000 + familyIndex * 10 + i,
                        TitleText: title,
                        DescriptionText: description));
                }
                familyIndex++;
            }

            return new CatalogData(
                levels,
                badges,
                badges.ToDictionary(b => b.Code),
                raw.XpRules.ToDictionary(r => r.Key),
                raw.LegacyTitles);
        }
    }

    public sealed record CatalogData(
        IReadOnlyList<LevelDef> Levels,
        IReadOnlyList<BadgeDef> Badges,
        IReadOnlyDictionary<string, BadgeDef> BadgesByCode,
        IReadOnlyDictionary<string, XpRuleDef> Rules,
        IReadOnlyDictionary<string, string> LegacyTitles);

    public sealed record LevelDef(int Number, int RequiredXp, LocalizedText Name);

    public sealed record BadgeDef(
        string Code,
        string Family,
        string Category,
        int Tier,
        string Metric,
        int Threshold,
        int XpReward,
        int SortOrder,
        LocalizedText TitleText,
        LocalizedText DescriptionText)
    {
        public string Title(string? locale) => TitleText.For(locale);
        public string Description(string? locale) => DescriptionText.For(locale);
        public string IconUrl => $"/assets/badges/v2/{Code}.svg";
    }

    public sealed class LocalizedText
    {
        public string Tr { get; set; } = string.Empty;
        public string En { get; set; } = string.Empty;

        public string For(string? locale) =>
            string.Equals(locale, "tr", StringComparison.OrdinalIgnoreCase) ||
            string.Equals(locale, "tr-TR", StringComparison.OrdinalIgnoreCase)
                ? Tr
                : En;
    }

    public sealed class XpRuleDef
    {
        public string Key { get; set; } = string.Empty;
        public int Xp { get; set; }
        public int? ShortXp { get; set; }
        public int? MinLength { get; set; }
        public int? MinGames { get; set; }
        public int? DailyCap { get; set; }
    }

    public sealed class RawCatalog
    {
        public int Version { get; set; }
        public List<int> TierRewards { get; set; } = new();
        public List<RawTier> Tiers { get; set; } = new();
        public List<RawLevel> Levels { get; set; } = new();
        public List<XpRuleDef> XpRules { get; set; } = new();
        public List<RawCategory> Categories { get; set; } = new();
        public List<RawFamily> Families { get; set; } = new();
        public Dictionary<string, string> LegacyTitles { get; set; } = new();
    }

    public sealed class RawTier
    {
        public int Tier { get; set; }
        public string Key { get; set; } = string.Empty;
        public LocalizedText Name { get; set; } = new();
    }

    public sealed class RawLevel
    {
        public int Number { get; set; }
        public int RequiredXp { get; set; }
        public LocalizedText Name { get; set; } = new();
    }

    public sealed class RawCategory
    {
        public string Key { get; set; } = string.Empty;
        public string Frame { get; set; } = string.Empty;
        public LocalizedText Name { get; set; } = new();
    }

    public sealed class RawFamily
    {
        public string Key { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty;
        public string Metric { get; set; } = string.Empty;
        public List<int> Thresholds { get; set; } = new();
        public bool Single { get; set; }
        public bool LevelBadges { get; set; }
        public int? Reward { get; set; }
        public LocalizedText Name { get; set; } = new();
        public LocalizedText Description { get; set; } = new();
        public LocalizedText? DescriptionOne { get; set; }
    }
}
