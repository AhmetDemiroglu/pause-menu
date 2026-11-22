using GGHub.Application.Dtos;
using GGHub.Application.Interfaces;
using GGHub.Core.Entities;
using GGHub.Core.Enums;
using GGHub.Infrastructure.Persistence;
using GGHub.Infrastructure.Persistence.Seeders;
using GGHub.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Npgsql;

namespace GGHub.Tests;

/// <summary>
/// Yerel Postgres uzerinde bir kez kurulan test veritabani. Host localhost degilse REDDEDER:
/// duzenek veritabanini siler ve yeniden kurar.
/// </summary>
public sealed class GamificationFixture : IAsyncLifetime
{
    public string ConnectionString { get; } =
        Environment.GetEnvironmentVariable("GG_TEST_DB")
        ?? "Host=127.0.0.1;Port=55432;Database=pausemenu_test;Username=postgres;Password=testpass";

    public async Task InitializeAsync()
    {
        var builder = new NpgsqlConnectionStringBuilder(ConnectionString);
        if (builder.Host is not ("localhost" or "127.0.0.1" or "::1"))
            throw new InvalidOperationException("Gamification testleri yalniz localhost veritabaninda calisir.");
        if (builder.Database != "pausemenu_test")
            throw new InvalidOperationException("Test veritabaninin adi pausemenu_test olmali.");

        await using var db = CreateContext();
        await db.Database.EnsureDeletedAsync();
        await db.Database.MigrateAsync();
        await GamificationSeeder.SeedAsync(db);
        // Ikinci calisma etkisiz olmali (upsert).
        await GamificationSeeder.SeedAsync(db);
    }

    public Task DisposeAsync() => Task.CompletedTask;

    public GGHubDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<GGHubDbContext>()
            .UseNpgsql(ConnectionString, o => o.EnableRetryOnFailure(3, TimeSpan.FromSeconds(2), null))
            .Options;
        return new GGHubDbContext(options);
    }

    public (ServiceProvider Provider, FakeNotifications Notifications) CreateServices()
    {
        var notifications = new FakeNotifications();
        var services = new ServiceCollection();
        services.AddLogging();
        services.AddMemoryCache();
        services.AddDbContext<GGHubDbContext>(o =>
            o.UseNpgsql(ConnectionString, n => n.EnableRetryOnFailure(3, TimeSpan.FromSeconds(2), null)));
        services.AddSingleton(notifications);
        services.AddScoped<INotificationService>(sp => sp.GetRequiredService<FakeNotifications>());
        services.AddScoped<GamificationService>();
        services.AddScoped<IGamificationService>(sp => sp.GetRequiredService<GamificationService>());
        return (services.BuildServiceProvider(), notifications);
    }

    private static int _counter;

    public async Task<User> CreateUserAsync(Action<User>? configure = null)
    {
        var n = Interlocked.Increment(ref _counter);
        var name = $"t{Guid.NewGuid():N}"[..12] + n;
        var user = new User
        {
            Username = name,
            UsernameNormalized = name,
            Email = $"{name}@example.test",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        configure?.Invoke(user);
        await using var db = CreateContext();
        db.Users.Add(user);
        await db.SaveChangesAsync();
        return user;
    }

    public async Task<Game> CreateGameAsync(string? genresJson = null)
    {
        var n = Interlocked.Increment(ref _counter);
        var game = new Game { RawgId = 900000 + n, Slug = $"test-game-{n}", Name = $"Test Game {n}", GenresJson = genresJson };
        await using var db = CreateContext();
        db.Games.Add(game);
        await db.SaveChangesAsync();
        return game;
    }

    public async Task<Review> CreateReviewAsync(int userId, int gameId, string content)
    {
        var review = new Review { UserId = userId, GameId = gameId, Content = content, Rating = 8, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow };
        await using var db = CreateContext();
        db.Reviews.Add(review);
        await db.SaveChangesAsync();
        return review;
    }

    public async Task<UserStats?> StatsAsync(int userId)
    {
        await using var db = CreateContext();
        return await db.UserStats.AsNoTracking().FirstOrDefaultAsync(s => s.UserId == userId);
    }

    public async Task<List<XpTransaction>> LedgerAsync(int userId)
    {
        await using var db = CreateContext();
        return await db.XpTransactions.AsNoTracking().Where(t => t.UserId == userId).OrderBy(t => t.Id).ToListAsync();
    }

    public async Task<List<string>> BadgesAsync(int userId)
    {
        await using var db = CreateContext();
        return await db.UserAchievements.AsNoTracking()
            .Where(ua => ua.UserId == userId)
            .Select(ua => ua.Achievement.Code)
            .OrderBy(c => c)
            .ToListAsync();
    }
}

[CollectionDefinition("gamification")]
public sealed class GamificationCollection : ICollectionFixture<GamificationFixture>;

public sealed class FakeNotifications : INotificationService
{
    public List<(int UserId, NotificationType Type, string Key, IDictionary<string, string>? Args)> Sent { get; } = new();

    public Task CreateNotificationAsync(int recipientUserId, NotificationType type, string messageKey,
        IDictionary<string, string>? messageArgs = null, string? link = null, int? actorUserId = null)
    {
        lock (Sent) Sent.Add((recipientUserId, type, messageKey, messageArgs));
        return Task.CompletedTask;
    }

    public Task<int> GetUnreadCountAsync(int userId) => Task.FromResult(0);
    public Task<bool> MarkAsReadAsync(int notificationId, int userId) => Task.FromResult(true);
    public Task<bool> MarkAllAsReadAsync(int userId) => Task.FromResult(true);
    public Task<IEnumerable<NotificationDto>> GetUserNotificationsAsync(int userId) =>
        Task.FromResult<IEnumerable<NotificationDto>>(Array.Empty<NotificationDto>());
}
