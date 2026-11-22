using System.Security.Claims;
using GGHub.Application.Dtos.Stats;
using GGHub.Application.Interfaces;
using GGHub.Core.Entities;
using GGHub.Core.Enums;
using GGHub.Core.Gamification;
using GGHub.Infrastructure.Persistence;
using GGHub.Infrastructure.Services;
using GGHub.WebAPI.Controllers;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace GGHub.Tests;

[Collection("gamification")]
public class GamificationEngineTests
{
    private readonly GamificationFixture _fx;

    public GamificationEngineTests(GamificationFixture fx) => _fx = fx;

    private IGamificationService Service(ServiceProvider sp) => sp.CreateScope().ServiceProvider.GetRequiredService<IGamificationService>();

    [Fact]
    public async Task Register_gives_50_xp_welcome_badge_and_stays_level_1()
    {
        var (sp, notes) = _fx.CreateServices();
        var user = await _fx.CreateUserAsync();

        await Service(sp).OnRegisteredAsync(user.Id);
        await Service(sp).OnRegisteredAsync(user.Id);

        var stats = await _fx.StatsAsync(user.Id);
        Assert.Equal(50, stats!.CurrentXp);
        Assert.Equal(1, stats.CurrentLevel);
        Assert.Contains("welcome", await _fx.BadgesAsync(user.Id));
        Assert.Single(notes.Sent, n => n.UserId == user.Id && n.Type == NotificationType.AchievementUnlocked);
    }

    [Fact]
    public async Task Same_event_never_pays_twice_and_revert_only_undoes_what_was_paid()
    {
        var (sp, _) = _fx.CreateServices();
        var user = await _fx.CreateUserAsync();
        var svc = Service(sp);

        await svc.OnReviewCreatedAsync(user.Id, 101, 200);
        await svc.OnReviewCreatedAsync(user.Id, 101, 200);
        Assert.Equal(25, (await _fx.StatsAsync(user.Id))!.CurrentXp);

        await svc.OnReviewDeletedAsync(user.Id, 101);
        await svc.OnReviewDeletedAsync(user.Id, 101);
        await svc.OnReviewDeletedAsync(user.Id, 999); // hic kazandirmamis bir olay
        Assert.Equal(0, (await _fx.StatsAsync(user.Id))!.CurrentXp);

        var ledger = await _fx.LedgerAsync(user.Id);
        Assert.Equal(0, ledger.Sum(t => t.Amount));
        Assert.Single(ledger, t => t.DedupeKey == "revert:review:101");
    }

    [Fact]
    public async Task Short_reviews_earn_less()
    {
        var (sp, _) = _fx.CreateServices();
        var user = await _fx.CreateUserAsync();
        await Service(sp).OnReviewCreatedAsync(user.Id, 1, 20);
        Assert.Equal(GamificationCatalog.Rule("review").ShortXp, (await _fx.StatsAsync(user.Id))!.CurrentXp);
    }

    [Fact]
    public async Task Daily_cap_holds_and_deleted_items_do_not_refill_it()
    {
        var (sp, _) = _fx.CreateServices();
        var user = await _fx.CreateUserAsync();
        var svc = Service(sp);
        var cap = GamificationCatalog.Rule("review").DailyCap!.Value;

        for (var i = 1; i <= cap; i++) await svc.OnReviewCreatedAsync(user.Id, i, 200);
        await svc.OnReviewDeletedAsync(user.Id, 1);
        await svc.OnReviewCreatedAsync(user.Id, cap + 1, 200);
        // Tavanin ustundeki olay XP kazandirmadi, silinmesi de bir sey dusurmez.
        await svc.OnReviewDeletedAsync(user.Id, cap + 1);

        Assert.Equal((cap - 1) * 25, (await _fx.StatsAsync(user.Id))!.CurrentXp);
    }

    [Fact]
    public async Task Concurrent_events_lose_no_xp_and_respect_the_cap()
    {
        var (sp, _) = _fx.CreateServices();
        var user = await _fx.CreateUserAsync();
        var owner = await _fx.CreateUserAsync();
        var cap = GamificationCatalog.Rule("comment").DailyCap!.Value;

        await Task.WhenAll(Enumerable.Range(1, cap * 2).Select(i =>
            Service(sp).OnCommentCreatedAsync(user.Id, "review", i, owner.Id, 40)));

        var stats = await _fx.StatsAsync(user.Id);
        var ledger = await _fx.LedgerAsync(user.Id);
        Assert.Equal(cap * 5, stats!.CurrentXp);
        Assert.Equal(stats.CurrentXp, ledger.Sum(t => t.Amount));
        Assert.Equal(cap, ledger.Count(t => t.Reason == "comment"));
    }

    [Fact]
    public async Task Comments_on_own_content_or_too_short_pay_nothing()
    {
        var (sp, _) = _fx.CreateServices();
        var user = await _fx.CreateUserAsync();
        var other = await _fx.CreateUserAsync();
        var svc = Service(sp);

        await svc.OnCommentCreatedAsync(user.Id, "review", 1, user.Id, 100);
        await svc.OnCommentCreatedAsync(user.Id, "list", 2, other.Id, 3);
        Assert.Equal(0, (await _fx.StatsAsync(user.Id))?.CurrentXp ?? 0);

        await svc.OnCommentCreatedAsync(user.Id, "list", 3, other.Id, 30);
        Assert.Equal(5, (await _fx.StatsAsync(user.Id))!.CurrentXp);
    }

    [Fact]
    public async Task Follow_pays_once_per_person_and_unfollow_takes_it_back()
    {
        var (sp, _) = _fx.CreateServices();
        var a = await _fx.CreateUserAsync();
        var b = await _fx.CreateUserAsync();
        var svc = Service(sp);

        await svc.OnFollowedAsync(a.Id, b.Id);
        Assert.Equal(5, (await _fx.StatsAsync(a.Id))!.CurrentXp);
        Assert.Equal(10, (await _fx.StatsAsync(b.Id))!.CurrentXp);

        await svc.OnUnfollowedAsync(a.Id, b.Id);
        await svc.OnFollowedAsync(a.Id, b.Id);
        Assert.Equal(0, (await _fx.StatsAsync(a.Id))!.CurrentXp);
        Assert.Equal(0, (await _fx.StatsAsync(b.Id))!.CurrentXp);
    }

    [Fact]
    public async Task Bots_and_banned_accounts_earn_nothing()
    {
        var (sp, _) = _fx.CreateServices();
        var bot = await _fx.CreateUserAsync(u => u.IsAiAgent = true);
        var banned = await _fx.CreateUserAsync(u => u.IsBanned = true);
        var human = await _fx.CreateUserAsync();
        var svc = Service(sp);

        await svc.OnRegisteredAsync(bot.Id);
        await svc.OnReviewCreatedAsync(bot.Id, 1, 300);
        await svc.OnReviewCreatedAsync(banned.Id, 1, 300);
        await svc.OnFollowedAsync(bot.Id, human.Id);
        await svc.OnLikeChangedAsync(human.Id, bot.Id, "post", 1, true);

        Assert.Empty(await _fx.LedgerAsync(bot.Id));
        Assert.Empty(await _fx.LedgerAsync(banned.Id));
        Assert.Equal(0, (await _fx.StatsAsync(human.Id))?.CurrentXp ?? 0);
    }

    [Fact]
    public async Task Migration_never_lowers_a_level_and_is_idempotent()
    {
        var (sp, notes) = _fx.CreateServices();
        var inflated = await _fx.CreateUserAsync();
        await using (var db = _fx.CreateContext())
        {
            db.UserStats.Add(new UserStats { UserId = inflated.Id, CurrentLevel = 5, CurrentXp = 400 });
            await db.SaveChangesAsync();
        }

        var service = sp.CreateScope().ServiceProvider.GetRequiredService<GamificationService>();
        await service.MigrateUserAsync(inflated.Id);
        await service.MigrateUserAsync(inflated.Id);

        var stats = await _fx.StatsAsync(inflated.Id);
        Assert.Equal(5, stats!.CurrentLevel);
        Assert.True(stats.CurrentXp >= 1000);
        var ledger = await _fx.LedgerAsync(inflated.Id);
        Assert.Single(ledger, t => t.DedupeKey == GamificationService.OpeningKey);
        Assert.Equal(stats.CurrentXp, ledger.Sum(t => t.Amount));

        var badges = await _fx.BadgesAsync(inflated.Id);
        Assert.Contains("level_5", badges);
        Assert.Contains("welcome", badges);
        // Geriye donuk rozetler bildirim yagdirmaz.
        Assert.DoesNotContain(notes.Sent, n => n.UserId == inflated.Id);
        // ... ve haftalik liderlige girmez.
        Assert.DoesNotContain(ledger, t => t.Reason == "badge");
    }

    [Fact]
    public async Task Retroactive_xp_badges_are_marked_and_stay_out_of_the_weekly_board()
    {
        var (sp, notes) = _fx.CreateServices();
        var user = await _fx.CreateUserAsync(u => u.CreatedAt = DateTime.UtcNow.AddDays(-40));
        await using (var db = _fx.CreateContext())
        {
            db.UserStats.Add(new UserStats { UserId = user.Id, CurrentLevel = 1, CurrentXp = 10 });
            await db.SaveChangesAsync();
        }

        await sp.CreateScope().ServiceProvider.GetRequiredService<GamificationService>().MigrateUserAsync(user.Id);

        var ledger = await _fx.LedgerAsync(user.Id);
        Assert.Contains(ledger, t => t.Reason == GamificationService.RetroBadgeReason && t.DedupeKey == "badge:veteran_1");
        Assert.DoesNotContain(notes.Sent, n => n.UserId == user.Id);
        var week = await Service(sp).GetLeaderboardAsync("week", 1);
        Assert.DoesNotContain(week.Items, i => i.UserId == user.Id);
    }

    [Fact]
    public async Task One_award_can_jump_several_levels_and_unlock_level_badges()
    {
        var (sp, notes) = _fx.CreateServices();
        var user = await _fx.CreateUserAsync();
        await using (var db = _fx.CreateContext())
        {
            db.UserStats.Add(new UserStats { UserId = user.Id, CurrentLevel = 1, CurrentXp = 980 });
            await db.SaveChangesAsync();
        }

        // Acilis (980) sessiz; ardindan gelen inceleme 25 XP ile 1005'e cikarir: seviye 5.
        await Service(sp).OnReviewCreatedAsync(user.Id, 77, 300);

        var stats = await _fx.StatsAsync(user.Id);
        Assert.Equal(5, stats!.CurrentLevel);
        var badges = await _fx.BadgesAsync(user.Id);
        Assert.Contains("level_2", badges);
        Assert.Contains("level_5", badges);
    }

    [Fact]
    public async Task Real_content_unlocks_badges_with_one_notification()
    {
        var (sp, notes) = _fx.CreateServices();
        var user = await _fx.CreateUserAsync();
        var svc = Service(sp);
        await svc.OnRegisteredAsync(user.Id);
        notes.Sent.Clear();

        var game = await _fx.CreateGameAsync("[{\"id\":4,\"name\":\"Action\"},{\"id\":5,\"name\":\"RPG\"}]");
        var review = await _fx.CreateReviewAsync(user.Id, game.Id, new string('x', 600));
        await svc.OnReviewCreatedAsync(user.Id, review.Id, review.Content.Length);

        var badges = await _fx.BadgesAsync(user.Id);
        Assert.Contains("critic_1", badges);
        Assert.Contains("deep_1", badges);

        var sent = notes.Sent.Where(n => n.UserId == user.Id && n.Type == NotificationType.AchievementUnlocked).ToList();
        Assert.Single(sent);
        Assert.Equal("gamification.achievementsUnlocked", sent[0].Key);

        // 50 kayit + 25 inceleme + 10 critic_1 + 10 deep_1
        Assert.Equal(95, (await _fx.StatsAsync(user.Id))!.CurrentXp);
    }

    [Fact]
    public async Task Daily_visit_counts_once_per_day()
    {
        var (sp, _) = _fx.CreateServices();
        var user = await _fx.CreateUserAsync();
        var svc = Service(sp);

        await svc.OnActiveAsync(user.Id);
        await svc.OnActiveAsync(user.Id);

        var stats = await _fx.StatsAsync(user.Id);
        Assert.Equal(1, stats!.CurrentStreak);
        Assert.Equal(GamificationCatalog.Rule("daily").Xp, stats.CurrentXp);
    }

    [Fact]
    public async Task Streak_continues_on_consecutive_days()
    {
        var (sp, _) = _fx.CreateServices();
        var user = await _fx.CreateUserAsync();
        await using (var db = _fx.CreateContext())
        {
            db.UserStats.Add(new UserStats
            {
                UserId = user.Id,
                CurrentStreak = 6,
                LongestStreak = 6,
                LastActiveOn = DateOnly.FromDateTime(DateTime.UtcNow).AddDays(-1),
            });
            await db.SaveChangesAsync();
        }

        await Service(sp).OnActiveAsync(user.Id);

        var stats = await _fx.StatsAsync(user.Id);
        Assert.Equal(7, stats!.CurrentStreak);
        var ledger = await _fx.LedgerAsync(user.Id);
        Assert.Contains(ledger, t => t.Reason == "streak7");
        Assert.Contains("streak_2", await _fx.BadgesAsync(user.Id));
    }

    [Fact]
    public async Task Stats_endpoint_hides_private_profiles_and_never_writes()
    {
        var (sp, _) = _fx.CreateServices();
        var hidden = await _fx.CreateUserAsync(u => u.ProfileVisibility = ProfileVisibilitySetting.Private);
        await Service(sp).OnRegisteredAsync(hidden.Id);
        var before = (await _fx.LedgerAsync(hidden.Id)).Count;

        using var scope = sp.CreateScope();
        var controller = new GamificationController(
            scope.ServiceProvider.GetRequiredService<IGamificationService>(),
            scope.ServiceProvider.GetRequiredService<GGHubDbContext>())
        {
            ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext { User = new ClaimsPrincipal(new ClaimsIdentity()) } },
        };

        var anonymous = Assert.IsType<OkObjectResult>(await controller.GetUserStats(hidden.Id));
        Assert.Equal(0, Assert.IsType<UserStatsDto>(anonymous.Value).CurrentXp);

        controller.ControllerContext.HttpContext.User = new ClaimsPrincipal(new ClaimsIdentity(
            new[] { new Claim(ClaimTypes.NameIdentifier, hidden.Id.ToString()) }, "test"));
        var own = Assert.IsType<OkObjectResult>(await controller.GetUserStats(hidden.Id));
        Assert.Equal(50, Assert.IsType<UserStatsDto>(own.Value).CurrentXp);

        Assert.IsType<NotFoundResult>(await new GamificationController(
            scope.ServiceProvider.GetRequiredService<IGamificationService>(),
            scope.ServiceProvider.GetRequiredService<GGHubDbContext>())
        {
            ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext() },
        }.GetAchievements(hidden.Username));

        Assert.Equal(before, (await _fx.LedgerAsync(hidden.Id)).Count);
    }

    [Fact]
    public async Task Leaderboard_excludes_bots_seeded_and_private_and_orders_ties_stably()
    {
        var (sp, _) = _fx.CreateServices();
        var svc = Service(sp);
        var bot = await _fx.CreateUserAsync(u => u.IsAiAgent = true);
        var seeded = await _fx.CreateUserAsync(u => u.IsSeeded = true);
        var hidden = await _fx.CreateUserAsync(u => u.ProfileVisibility = ProfileVisibilitySetting.Private);
        var first = await _fx.CreateUserAsync();
        var second = await _fx.CreateUserAsync();
        await using (var db = _fx.CreateContext())
        {
            foreach (var id in new[] { bot.Id, seeded.Id, hidden.Id, first.Id, second.Id })
                db.UserStats.Add(new UserStats { UserId = id, CurrentLevel = 7, CurrentXp = 999_999 });
            await db.SaveChangesAsync();
        }

        var page = await svc.GetLeaderboardAsync("all", 1);
        var ids = page.Items.Select(i => i.UserId).ToList();
        Assert.DoesNotContain(bot.Id, ids);
        Assert.DoesNotContain(seeded.Id, ids);
        Assert.DoesNotContain(hidden.Id, ids);
        Assert.True(ids.IndexOf(first.Id) < ids.IndexOf(second.Id));
        Assert.Equal(1, page.Items[0].Rank);
    }

    [Fact]
    public async Task Achievements_list_whole_catalog_with_progress()
    {
        var (sp, _) = _fx.CreateServices();
        var user = await _fx.CreateUserAsync();
        await Service(sp).OnRegisteredAsync(user.Id);

        var result = await Service(sp).GetAchievementsAsync(user.Id, includeProgress: true);
        Assert.Equal(GamificationCatalog.Badges.Count, result.TotalCount);
        Assert.Equal(1, result.EarnedCount);
        Assert.Equal(0, result.Items.Single(i => i.Code == "critic_1").Current);

        var publicView = await Service(sp).GetAchievementsAsync(user.Id, includeProgress: false);
        Assert.All(publicView.Items, i => Assert.Null(i.Current));
        Assert.Equal(1, publicView.EarnedCount);
    }
}
