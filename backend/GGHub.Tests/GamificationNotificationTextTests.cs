using GGHub.Infrastructure.Localization;

namespace GGHub.Tests;

/// <summary>Bildirim metni rozet/seviye kodunu alicinin dilinde ada cevirir; yer tutucu kalmaz.</summary>
public class GamificationNotificationTextTests
{
    [Theory]
    [InlineData("tr", "Altın Eleştirmen")]
    [InlineData("en-US", "Gold Critic")]
    public void Badge_name_is_resolved_in_the_reader_language(string locale, string expected)
    {
        var args = new Dictionary<string, object?> { ["badgeCode"] = "critic_3" };
        var single = AppText.GetFor(locale, "gamification.achievementUnlocked", args);
        Assert.Contains(expected, single);
        Assert.DoesNotContain("{", single);

        var many = AppText.GetFor(locale, "gamification.achievementsUnlocked",
            new Dictionary<string, object?> { ["badgeCode"] = "critic_3", ["count"] = "3" });
        Assert.Contains(expected, many);
        Assert.Contains("3", many);
        Assert.DoesNotContain("{", many);
    }

    [Theory]
    [InlineData("tr", "Usta")]
    [InlineData("en-US", "Master")]
    public void Level_name_is_resolved_in_the_reader_language(string locale, string expected)
    {
        var text = AppText.GetFor(locale, "gamification.levelUp", new Dictionary<string, object?> { ["levelNumber"] = "5" });
        Assert.Contains(expected, text);
        Assert.Contains("5", text);
        Assert.DoesNotContain("{", text);
    }
}
