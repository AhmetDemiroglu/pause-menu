using GGHub.Core.Gamification;

namespace GGHub.Tests;

public class GamificationCatalogTests
{
    [Fact]
    public void Catalog_has_66_unique_badges()
    {
        Assert.Equal(66, GamificationCatalog.Badges.Count);
        Assert.Equal(GamificationCatalog.Badges.Count, GamificationCatalog.Badges.Select(b => b.Code).Distinct().Count());
    }

    [Fact]
    public void Every_badge_has_both_languages_and_no_dashes()
    {
        foreach (var badge in GamificationCatalog.Badges)
        {
            foreach (var text in new[] { badge.Title("tr"), badge.Title("en-US"), badge.Description("tr"), badge.Description("en-US") })
            {
                Assert.False(string.IsNullOrWhiteSpace(text), badge.Code);
                Assert.DoesNotContain("—", text);
                Assert.DoesNotContain("–", text);
                Assert.DoesNotContain("{n}", text);
            }
        }
    }

    [Theory]
    [InlineData(0, 1)]
    [InlineData(99, 1)]
    [InlineData(100, 2)]
    [InlineData(599, 3)]
    [InlineData(600, 4)]
    [InlineData(4999, 6)]
    [InlineData(5000, 7)]
    [InlineData(1_000_000, 7)]
    public void Level_is_derived_from_xp(int xp, int level) =>
        Assert.Equal(level, GamificationCatalog.LevelForXp(xp));

    [Fact]
    public void Levels_keep_their_published_thresholds()
    {
        Assert.Equal(new[] { 0, 100, 300, 600, 1000, 2000, 5000 }, GamificationCatalog.Levels.Select(l => l.RequiredXp));
    }

    [Fact]
    public void Legacy_titles_map_to_catalog_codes()
    {
        foreach (var (title, code) in GamificationCatalog.LegacyTitles)
        {
            if (title == "Level 1") continue; // bilerek katalogda yok, kapatilir
            Assert.NotNull(GamificationCatalog.FindBadge(code));
        }
    }

    [Fact]
    public void Every_rule_used_by_the_engine_exists()
    {
        foreach (var key in new[] { "register", "review", "list", "comment", "post", "follow", "follower", "like", "daily", "streak7", "streak30" })
        {
            Assert.True(GamificationCatalog.Rules.ContainsKey(key), key);
        }
    }
}
