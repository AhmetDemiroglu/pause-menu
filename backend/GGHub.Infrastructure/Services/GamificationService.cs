using System.Text.Json;
using GGHub.Application.Dtos;
using GGHub.Application.Dtos.Gamification;
using GGHub.Application.Dtos.Stats;
using GGHub.Application.Interfaces;
using GGHub.Core.Entities;
using GGHub.Core.Enums;
using GGHub.Core.Gamification;
using GGHub.Infrastructure.Localization;
using GGHub.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace GGHub.Infrastructure.Services
{
    /// <summary>
    /// Gamification 2.0 motoru.
    ///
    /// Degismezler:
    /// 1) XP yalniz XpTransactions defterinden gecer. (UserId, DedupeKey) benzersiz: ayni olay
    ///    ikinci kez kazandirmaz. Geri alma yalniz defterde gercekten verilmis XP'yi, bir kez dusurur.
    /// 2) Kullanici basina yazimlar pg_advisory_xact_lock ile siraya girer: esZamanli isteklerde
    ///    XP kaybolmaz, gunluk tavan asilmaz.
    /// 3) Seviye her zaman XP'den hesaplanir (cok seviye atlama dahil). Kazanilmis rozet kalicidir.
    /// 4) AI ajani, silinmis ve askiya alinmis hesap XP kazanmaz.
    /// 5) Hicbir On* metodu istisna firlatmaz ve cagiranin DbContext'ine dokunmaz: her olay kendi
    ///    kapsaminda (scope) calisir, hata loglanip yutulur.
    /// </summary>
    public class GamificationService : IGamificationService
    {
        private const int LockNamespace = 7101;
        public const string OpeningKey = "opening";
        public const string RetroBadgeReason = "badge_retro";
        private const int LeaderboardPageSize = 50;
        private const int LeaderboardMaxPage = 4;
        private const int HistoryPageSize = 30;
        private const int HistoryMaxPage = 20;

        private readonly GGHubDbContext _context;
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly IMemoryCache _cache;
        private readonly ILogger<GamificationService> _logger;

        public GamificationService(
            GGHubDbContext context,
            IServiceScopeFactory scopeFactory,
            IMemoryCache cache,
            ILogger<GamificationService> logger)
        {
            _context = context;
            _scopeFactory = scopeFactory;
            _cache = cache;
            _logger = logger;
        }

        // ------------------------------------------------------------------
        // Olaylar
        // ------------------------------------------------------------------

        public Task OnRegisteredAsync(int userId) =>
            RunAsync(nameof(OnRegisteredAsync), userId, async engine =>
            {
                await engine.GrantAsync(userId, "register", "register", Rule("register").Xp);
                await engine.EvaluateAsync(userId, new[] { "welcome" });
            });

        public Task OnActiveAsync(int userId) =>
            RunAsync(nameof(OnActiveAsync), userId, async engine =>
            {
                if (!await engine.TouchStreakAsync(userId)) return;
                await engine.EvaluateAsync(userId, AllMetrics);
            });

        public Task OnReviewCreatedAsync(int userId, int reviewId, int contentLength) =>
            RunAsync(nameof(OnReviewCreatedAsync), userId, async engine =>
            {
                var rule = Rule("review");
                var amount = contentLength >= (rule.MinLength ?? 0) ? rule.Xp : (rule.ShortXp ?? rule.Xp);
                await engine.GrantAsync(userId, "review", $"review:{reviewId}", amount);
                await engine.EvaluateAsync(userId, new[] { "reviews", "deep_reviews", "genres" });
            });

        public Task OnReviewDeletedAsync(int userId, int reviewId) =>
            RunAsync(nameof(OnReviewDeletedAsync), userId, engine => engine.RevertAsync(userId, $"review:{reviewId}"));

        public Task OnListGameAddedAsync(int userId, int listId) =>
            RunAsync(nameof(OnListGameAddedAsync), userId, async engine =>
            {
                var list = await engine.Db.UserLists.AsNoTracking()
                    .Where(l => l.Id == listId && l.UserId == userId)
                    .Select(l => new { l.Type, Games = l.UserListGames.Count })
                    .FirstOrDefaultAsync();
                if (list == null) return;

                if (list.Type == UserListType.Custom)
                {
                    var rule = Rule("list");
                    if (list.Games >= (rule.MinGames ?? 0))
                    {
                        await engine.GrantAsync(userId, "list", $"list:{listId}", rule.Xp);
                    }
                    await engine.EvaluateAsync(userId, new[] { "curated_lists", "listed_games" });
                }
                else
                {
                    await engine.EvaluateAsync(userId, new[] { "wishlist_games", "favorite_games" });
                }
            });

        public Task OnListDeletedAsync(int userId, int listId) =>
            RunAsync(nameof(OnListDeletedAsync), userId, engine => engine.RevertAsync(userId, $"list:{listId}"));

        public Task OnCommentCreatedAsync(int userId, string kind, int commentId, int contentOwnerId, int contentLength) =>
            RunAsync(nameof(OnCommentCreatedAsync), userId, async engine =>
            {
                // Kendi icerigine yorum XP kazandirmaz ve Yorumcu rozetine sayilmaz.
                if (contentOwnerId == userId) return;
                var rule = Rule("comment");
                if (contentLength >= (rule.MinLength ?? 0))
                {
                    await engine.GrantAsync(userId, "comment", CommentKey(kind, commentId), rule.Xp);
                }
                await engine.EvaluateAsync(userId, new[] { "comments" });
            });

        public Task OnCommentDeletedAsync(int userId, string kind, int commentId) =>
            RunAsync(nameof(OnCommentDeletedAsync), userId, engine => engine.RevertAsync(userId, CommentKey(kind, commentId)));

        public Task OnPostCreatedAsync(int userId, int postId, bool qualifies) =>
            RunAsync(nameof(OnPostCreatedAsync), userId, async engine =>
            {
                if (qualifies)
                {
                    await engine.GrantAsync(userId, "post", $"post:{postId}", Rule("post").Xp);
                }
                await engine.EvaluateAsync(userId, new[] { "posts" });
            });

        public Task OnPostDeletedAsync(int userId, int postId) =>
            RunAsync(nameof(OnPostDeletedAsync), userId, engine => engine.RevertAsync(userId, $"post:{postId}"));

        public Task OnFollowedAsync(int followerId, int followeeId) =>
            RunAsync(nameof(OnFollowedAsync), followerId, async engine =>
            {
                if (followerId == followeeId) return;
                var people = await engine.Db.Users.AsNoTracking()
                    .Where(u => u.Id == followerId || u.Id == followeeId)
                    .Select(u => new { u.Id, u.IsAiAgent, u.IsBanned, u.IsDeleted })
                    .ToListAsync();
                var follower = people.FirstOrDefault(p => p.Id == followerId);
                var followee = people.FirstOrDefault(p => p.Id == followeeId);
                if (follower == null || followee == null) return;

                // Takip eden: kisi basina omur boyu bir kez (anahtar takip edilen kisiye bagli).
                if (!followee.IsAiAgent && !followee.IsDeleted)
                {
                    await engine.GrantAsync(followerId, "follow", $"follow:{followeeId}", Rule("follow").Xp);
                }
                await engine.EvaluateAsync(followerId, new[] { "following" });

                // Takip edilen: bot, silinmis ya da askiya alinmis takipci sayilmaz.
                if (!follower.IsAiAgent && !follower.IsBanned && !follower.IsDeleted)
                {
                    await engine.GrantAsync(followeeId, "follower", $"follower:{followerId}", Rule("follower").Xp);
                    await engine.EvaluateAsync(followeeId, new[] { "followers" });
                }
            });

        public Task OnUnfollowedAsync(int followerId, int followeeId) =>
            RunAsync(nameof(OnUnfollowedAsync), followerId, async engine =>
            {
                await engine.RevertAsync(followerId, $"follow:{followeeId}");
                await engine.RevertAsync(followeeId, $"follower:{followerId}");
            });

        public Task OnLikeChangedAsync(int ownerId, int likerId, string kind, int targetId, bool liked) =>
            RunAsync(nameof(OnLikeChangedAsync), ownerId, async engine =>
            {
                if (ownerId == likerId) return;
                var key = $"like:{(kind == "review" ? "r" : "p")}{targetId}:{likerId}";
                if (!liked)
                {
                    await engine.RevertAsync(ownerId, key);
                    return;
                }

                var likerIsHuman = await engine.Db.Users.AsNoTracking()
                    .AnyAsync(u => u.Id == likerId && !u.IsAiAgent && !u.IsBanned && !u.IsDeleted);
                if (!likerIsHuman) return;

                await engine.GrantAsync(ownerId, "like", key, Rule("like").Xp);
                await engine.EvaluateAsync(ownerId, new[] { "likes_received" });
            });

        public Task OnCollectionChangedAsync(int userId) =>
            RunAsync(nameof(OnCollectionChangedAsync), userId,
                engine => engine.EvaluateAsync(userId, new[] { "wishlist_games", "favorite_games", "listed_games", "curated_lists" }));

        public Task OnProfileUpdatedAsync(int userId) =>
            RunAsync(nameof(OnProfileUpdatedAsync), userId,
                engine => engine.EvaluateAsync(userId, new[] { "profile_complete" }));

        public Task OnListFollowedAsync(int listOwnerId) =>
            RunAsync(nameof(OnListFollowedAsync), listOwnerId,
                engine => engine.EvaluateAsync(listOwnerId, new[] { "list_max_followers" }));

        // ------------------------------------------------------------------
        // Bakim: gecis ve tam degerlendirme (GamificationBackfillJob ve testler)
        // ------------------------------------------------------------------

        /// <summary>
        /// Acilis bakiyesi + sessiz tam rozet degerlendirmesi. Tekrar calisirsa etkisizdir.
        /// "Kimse dusmez": acilis bakiyesi max(mevcut XP, mevcut seviyenin esigi).
        /// </summary>
        public async Task MigrateUserAsync(int userId)
        {
            using var scope = _scopeFactory.CreateScope();
            var engine = CreateEngine(scope, silent: true);
            await engine.EnsureOpeningAsync(userId);
            await engine.EvaluateAsync(userId, AllMetrics);
        }

        private static readonly string[] AllMetrics = GamificationCatalog.Badges.Select(b => b.Metric).Distinct().ToArray();

        private static XpRuleDef Rule(string key) => GamificationCatalog.Rule(key);

        private static string CommentKey(string kind, int commentId) =>
            $"comment:{(kind == "list" ? "l" : "r")}{commentId}";

        private async Task RunAsync(string operation, int userId, Func<Engine, Task> work)
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var engine = CreateEngine(scope, silent: false);
                await work(engine);
                if (engine.Touched.Count > 0)
                {
                    foreach (var touched in engine.Touched) _cache.Remove(AchievementsCacheKey(touched));
                }
            }
            catch (Exception ex)
            {
                // Oyunlastirma kullanicinin asil islemini asla dusurmez.
                _logger.LogError(ex, "gamification: {Operation} basarisiz (kullanici {UserId})", operation, userId);
            }
        }

        private Engine CreateEngine(IServiceScope scope, bool silent) => new(
            scope.ServiceProvider.GetRequiredService<GGHubDbContext>(),
            scope.ServiceProvider.GetService<INotificationService>(),
            _cache,
            _logger,
            silent);

        // ------------------------------------------------------------------
        // Okuma
        // ------------------------------------------------------------------

        public async Task<UserStatsDto> GetUserStatsAsync(int userId)
        {
            var locale = AppText.CurrentLocale();
            var stats = await _context.UserStats.AsNoTracking().FirstOrDefaultAsync(x => x.UserId == userId);

            var xp = stats?.CurrentXp ?? 0;
            var level = Math.Clamp(stats?.CurrentLevel ?? 1, 1, GamificationCatalog.MaxLevel);
            var current = GamificationCatalog.LevelDef(level);
            var isMax = level >= GamificationCatalog.MaxLevel;
            var next = isMax ? null : GamificationCatalog.LevelDef(level + 1);

            var progress = 100;
            if (next != null)
            {
                var range = next.RequiredXp - current.RequiredXp;
                progress = range > 0 ? (int)((double)(xp - current.RequiredXp) / range * 100) : 0;
            }

            var earned = await _context.UserAchievements.AsNoTracking()
                .Where(ua => ua.UserId == userId && ua.Achievement.IsActive)
                .OrderByDescending(ua => ua.EarnedAt)
                .Select(ua => new { ua.Achievement.Code, ua.Achievement.Title, ua.Achievement.Description, ua.Achievement.IconUrl, ua.EarnedAt })
                .ToListAsync();

            return new UserStatsDto
            {
                UserId = userId,
                CurrentLevel = level,
                LevelName = current.Name.For(locale),
                CurrentXp = xp,
                // Eski istemci sozlesmesi: en ust seviyede NextLevelXp = CurrentXp.
                NextLevelXp = next?.RequiredXp ?? xp,
                ProgressPercentage = Math.Clamp(progress, 0, 100),
                CurrentLevelXp = current.RequiredXp,
                RemainingXp = next == null ? 0 : Math.Max(0, next.RequiredXp - xp),
                IsMaxLevel = isMax,
                TotalReviews = stats?.TotalReviews ?? 0,
                TotalLists = stats?.TotalLists ?? 0,
                CurrentStreak = stats?.CurrentStreak ?? 0,
                LongestStreak = stats?.LongestStreak ?? 0,
                EarnedAchievementCount = earned.Count,
                TotalAchievementCount = GamificationCatalog.Badges.Count,
                RecentAchievements = earned.Take(8).Select(e => ToAchievementDto(e.Code, e.Title, e.Description, e.IconUrl, e.EarnedAt, locale)).ToList(),
            };
        }

        private static AchievementDto ToAchievementDto(string code, string title, string description, string iconUrl, DateTime earnedAt, string locale)
        {
            var def = GamificationCatalog.FindBadge(code);
            return new AchievementDto
            {
                Code = code,
                Title = def?.Title(locale) ?? title,
                Description = def?.Description(locale) ?? description,
                IconUrl = def?.IconUrl ?? iconUrl,
                EarnedAt = earnedAt,
                Family = def?.Family ?? string.Empty,
                Category = def?.Category ?? string.Empty,
                Tier = def?.Tier ?? 0,
                XpReward = def?.XpReward ?? 0,
            };
        }

        private static string AchievementsCacheKey(int userId) => $"gm-ach:{userId}";

        private sealed record AchievementSnapshot(Dictionary<string, int> Metrics, Dictionary<string, DateTime> Earned);

        public async Task<UserAchievementsDto> GetAchievementsAsync(int userId, bool includeProgress)
        {
            var locale = AppText.CurrentLocale();
            var snapshot = await _cache.GetOrCreateAsync(AchievementsCacheKey(userId), async entry =>
            {
                entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(2);
                var metrics = new Dictionary<string, int>();
                var calculator = new MetricCalculator(_context);
                foreach (var metric in AllMetrics)
                {
                    metrics[metric] = await calculator.GetAsync(userId, metric);
                }

                var earned = await _context.UserAchievements.AsNoTracking()
                    .Where(ua => ua.UserId == userId)
                    .Select(ua => new { ua.Achievement.Code, ua.EarnedAt })
                    .ToListAsync();

                return new AchievementSnapshot(
                    metrics,
                    earned.GroupBy(e => e.Code).ToDictionary(g => g.Key, g => g.Min(e => e.EarnedAt)));
            }) ?? new AchievementSnapshot(new(), new());

            var items = GamificationCatalog.Badges
                .OrderBy(b => b.SortOrder)
                .Select(b => new AchievementProgressDto
                {
                    Code = b.Code,
                    Family = b.Family,
                    Category = b.Category,
                    Tier = b.Tier,
                    Title = b.Title(locale),
                    Description = b.Description(locale),
                    IconUrl = b.IconUrl,
                    XpReward = b.XpReward,
                    Threshold = b.Threshold,
                    Current = includeProgress ? snapshot.Metrics.GetValueOrDefault(b.Metric) : null,
                    EarnedAt = snapshot.Earned.TryGetValue(b.Code, out var at) ? at : null,
                })
                .ToList();

            return new UserAchievementsDto
            {
                UserId = userId,
                EarnedCount = items.Count(i => i.EarnedAt != null),
                TotalCount = items.Count,
                Items = items,
            };
        }

        private sealed record LeaderboardRow(int UserId, string Username, string? ProfileImageUrl, int Level, int Xp);

        public async Task<LeaderboardPageDto> GetLeaderboardAsync(string? period, int page)
        {
            var normalizedPeriod = string.Equals(period, "week", StringComparison.OrdinalIgnoreCase) ? "week" : "all";
            var safePage = Math.Clamp(page, 1, LeaderboardMaxPage);
            var locale = AppText.CurrentLocale();

            var rows = await _cache.GetOrCreateAsync($"gm-lb:{normalizedPeriod}:{safePage}", async entry =>
            {
                entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(15);
                return normalizedPeriod == "week"
                    ? await QueryWeeklyAsync(safePage)
                    : await QueryAllTimeAsync(safePage);
            }) ?? new List<LeaderboardRow>();

            var hasMore = rows.Count > LeaderboardPageSize && safePage < LeaderboardMaxPage;
            return new LeaderboardPageDto
            {
                Period = normalizedPeriod,
                Page = safePage,
                PageSize = LeaderboardPageSize,
                HasMore = hasMore,
                Items = rows.Take(LeaderboardPageSize).Select((r, i) => new LeaderboardEntryDto
                {
                    Rank = (safePage - 1) * LeaderboardPageSize + i + 1,
                    UserId = r.UserId,
                    Username = r.Username,
                    ProfileImageUrl = r.ProfileImageUrl,
                    Level = r.Level,
                    LevelName = GamificationCatalog.LevelName(r.Level, locale),
                    Xp = r.Xp,
                }).ToList(),
            };
        }

        /// <summary>Liderlige girebilen hesaplar: gercek, aktif ve profili herkese acik insanlar.</summary>
        private IQueryable<User> RankableUsers() => _context.Users.AsNoTracking()
            .Where(u => !u.IsAiAgent && !u.IsDeleted && !u.IsBanned && !u.IsSeeded &&
                        u.ProfileVisibility == ProfileVisibilitySetting.Public);

        private async Task<List<LeaderboardRow>> QueryAllTimeAsync(int page)
        {
            return await _context.UserStats.AsNoTracking()
                .Where(s => s.CurrentXp > 0)
                .Join(RankableUsers(), s => s.UserId, u => u.Id, (s, u) => new { s, u })
                .OrderByDescending(x => x.s.CurrentXp)
                .ThenBy(x => x.s.UserId)
                .Skip((page - 1) * LeaderboardPageSize)
                .Take(LeaderboardPageSize + 1)
                .Select(x => new LeaderboardRow(x.u.Id, x.u.Username, x.u.ProfileImageUrl, x.s.CurrentLevel, x.s.CurrentXp))
                .ToListAsync();
        }

        private async Task<List<LeaderboardRow>> QueryWeeklyAsync(int page)
        {
            var since = DateTime.UtcNow.AddDays(-7);
            var totals = _context.XpTransactions.AsNoTracking()
                .Where(t => t.CreatedAt >= since && t.Reason != OpeningKey && t.Reason != RetroBadgeReason)
                .GroupBy(t => t.UserId)
                .Select(g => new { UserId = g.Key, Xp = g.Sum(t => t.Amount) })
                .Where(x => x.Xp > 0);

            return await totals
                .Join(RankableUsers(), t => t.UserId, u => u.Id, (t, u) => new { t, u })
                .OrderByDescending(x => x.t.Xp)
                .ThenBy(x => x.t.UserId)
                .Skip((page - 1) * LeaderboardPageSize)
                .Take(LeaderboardPageSize + 1)
                .Select(x => new LeaderboardRow(
                    x.u.Id,
                    x.u.Username,
                    x.u.ProfileImageUrl,
                    x.u.Stats != null ? x.u.Stats.CurrentLevel : 1,
                    x.t.Xp))
                .ToListAsync();
        }

        public async Task<XpHistoryPageDto> GetHistoryAsync(int userId, int page)
        {
            var safePage = Math.Clamp(page, 1, HistoryMaxPage);
            var rows = await _context.XpTransactions.AsNoTracking()
                .Where(t => t.UserId == userId && t.Amount != 0)
                .OrderByDescending(t => t.CreatedAt)
                .ThenByDescending(t => t.Id)
                .Skip((safePage - 1) * HistoryPageSize)
                .Take(HistoryPageSize + 1)
                .Select(t => new XpHistoryItemDto { Reason = t.Reason, Amount = t.Amount, CreatedAt = t.CreatedAt })
                .ToListAsync();

            return new XpHistoryPageDto
            {
                Page = safePage,
                PageSize = HistoryPageSize,
                HasMore = rows.Count > HistoryPageSize && safePage < HistoryMaxPage,
                Items = rows.Take(HistoryPageSize).ToList(),
            };
        }

        // ------------------------------------------------------------------
        // Motor: tek kapsamda (scope) calisan yazim mantigi
        // ------------------------------------------------------------------

        private sealed class Engine
        {
            public GGHubDbContext Db { get; }
            public HashSet<int> Touched { get; } = new();

            private readonly INotificationService? _notifications;
            private readonly IMemoryCache _cache;
            private readonly ILogger _logger;
            // Gecis aninda verilen geriye donuk rozetler bildirim yagdirmaz: acilis bakiyesi bu
            // motor icinde yeni yazildiysa (eski hesap) kalan isler sessizlesir.
            private bool _silent;

            public Engine(GGHubDbContext db, INotificationService? notifications, IMemoryCache cache, ILogger logger, bool silent)
            {
                Db = db;
                _notifications = notifications;
                _cache = cache;
                _logger = logger;
                _silent = silent;
            }

            private sealed record ApplyResult(bool Applied, int OldLevel, int NewLevel);

            public Task GrantAsync(int userId, string reason, string key, int amount) =>
                ApplyAsync(userId, reason, key, amount, revert: false);

            public Task RevertAsync(int userId, string key) =>
                ApplyAsync(userId, "revert", key, 0, revert: true);

            private async Task ApplyAsync(int userId, string reason, string key, int amount, bool revert)
            {
                var eligibility = await Db.Users.AsNoTracking()
                    .Where(u => u.Id == userId)
                    .Select(u => new { u.IsAiAgent, u.IsBanned, u.IsDeleted })
                    .FirstOrDefaultAsync();
                if (eligibility == null || eligibility.IsAiAgent) return;
                if (!revert && (eligibility.IsBanned || eligibility.IsDeleted)) return;

                var result = await InLockAsync(userId, async () =>
                {
                    var stats = await LockedStatsAsync(userId);
                    var oldLevel = stats.CurrentLevel;

                    int delta;
                    string entryKey;
                    string entryReason;
                    if (revert)
                    {
                        var original = await Db.XpTransactions
                            .Where(t => t.UserId == userId && t.DedupeKey == key && t.Amount > 0)
                            .Select(t => new { t.Amount, t.Reason })
                            .FirstOrDefaultAsync();
                        if (original == null) return new ApplyResult(false, oldLevel, oldLevel);

                        entryKey = $"revert:{key}";
                        if (await Db.XpTransactions.AnyAsync(t => t.UserId == userId && t.DedupeKey == entryKey))
                            return new ApplyResult(false, oldLevel, oldLevel);

                        delta = -original.Amount;
                        entryReason = original.Reason;
                    }
                    else
                    {
                        if (amount <= 0) return new ApplyResult(false, oldLevel, oldLevel);
                        if (await Db.XpTransactions.AnyAsync(t => t.UserId == userId && t.DedupeKey == key))
                            return new ApplyResult(false, oldLevel, oldLevel);

                        var cap = GamificationCatalog.Rules.TryGetValue(reason, out var rule) ? rule.DailyCap : null;
                        if (cap.HasValue)
                        {
                            // Geri alinan kazanclar da sayilir: ac-sil dongusu hak yenilemez.
                            var dayStart = DateTime.UtcNow.Date;
                            var today = await Db.XpTransactions.CountAsync(t =>
                                t.UserId == userId && t.Reason == reason && t.Amount > 0 && t.CreatedAt >= dayStart);
                            if (today >= cap.Value) return new ApplyResult(false, oldLevel, oldLevel);
                        }

                        entryKey = key;
                        delta = amount;
                        entryReason = reason;
                    }

                    Db.XpTransactions.Add(new XpTransaction
                    {
                        UserId = userId,
                        Amount = delta,
                        Reason = entryReason,
                        DedupeKey = entryKey,
                        CreatedAt = DateTime.UtcNow,
                    });

                    stats.CurrentXp = Math.Max(0, stats.CurrentXp + delta);
                    stats.CurrentLevel = GamificationCatalog.LevelForXp(stats.CurrentXp);
                    stats.UpdatedAt = DateTime.UtcNow;
                    await Db.SaveChangesAsync();
                    return new ApplyResult(true, oldLevel, stats.CurrentLevel);
                });

                if (result.Applied)
                {
                    Touched.Add(userId);
                    if (result.NewLevel != result.OldLevel)
                    {
                        await EvaluateAsync(userId, new[] { "level" });
                    }
                }
            }

            /// <summary>Gunluk ziyaret. Bugun zaten sayildiysa false (tam degerlendirme atlanir).</summary>
            public async Task<bool> TouchStreakAsync(int userId)
            {
                var today = DateOnly.FromDateTime(DateTime.UtcNow);
                var last = await Db.UserStats.AsNoTracking()
                    .Where(s => s.UserId == userId)
                    .Select(s => s.LastActiveOn)
                    .FirstOrDefaultAsync();
                if (last == today) return false;

                var human = await Db.Users.AsNoTracking()
                    .AnyAsync(u => u.Id == userId && !u.IsAiAgent && !u.IsBanned && !u.IsDeleted);
                if (!human) return false;

                var streak = await InLockAsync(userId, async () =>
                {
                    var stats = await LockedStatsAsync(userId);
                    if (stats.LastActiveOn == today) return 0;
                    stats.CurrentStreak = stats.LastActiveOn == today.AddDays(-1) ? stats.CurrentStreak + 1 : 1;
                    stats.LongestStreak = Math.Max(stats.LongestStreak, stats.CurrentStreak);
                    stats.LastActiveOn = today;
                    await Db.SaveChangesAsync();
                    return stats.CurrentStreak;
                });
                if (streak == 0) return false;

                var stamp = today.ToString("yyyyMMdd");
                await GrantAsync(userId, "daily", $"daily:{stamp}", GamificationCatalog.Rule("daily").Xp);
                if (streak == 7) await GrantAsync(userId, "streak7", $"streak7:{stamp}", GamificationCatalog.Rule("streak7").Xp);
                if (streak % 30 == 0) await GrantAsync(userId, "streak30", $"streak30:{stamp}", GamificationCatalog.Rule("streak30").Xp);
                return true;
            }

            /// <summary>Acilis bakiyesi. Kullanicinin ilk defter satiri; ikinci kez yazilmaz.</summary>
            public async Task EnsureOpeningAsync(int userId)
            {
                var exists = await Db.Users.AsNoTracking().AnyAsync(u => u.Id == userId && !u.IsAiAgent);
                if (!exists) return;
                await InLockAsync(userId, async () =>
                {
                    await LockedStatsAsync(userId);
                    return 0;
                });
            }

            private async Task<T> InLockAsync<T>(int userId, Func<Task<T>> body)
            {
                var strategy = Db.Database.CreateExecutionStrategy();
                return await strategy.ExecuteAsync(async () =>
                {
                    Db.ChangeTracker.Clear();
                    await using var tx = await Db.Database.BeginTransactionAsync();
                    await Db.Database.ExecuteSqlInterpolatedAsync($"SELECT pg_advisory_xact_lock({LockNamespace}, {userId})");
                    var value = await body();
                    await tx.CommitAsync();
                    return value;
                });
            }

            /// <summary>
            /// Kilit ALTINDA: istatistik satirini getirir, yoksa olusturur; acilis bakiyesi yoksa yazar.
            /// Acilis = max(mevcut XP, mevcut seviyenin esigi) - defterde zaten olan toplam.
            /// Boylece gecisten once XP kazanan kullanicinin seviyesi de dusmez.
            /// </summary>
            private async Task<UserStats> LockedStatsAsync(int userId)
            {
                var inserted = await Db.Database.ExecuteSqlInterpolatedAsync($@"
                    INSERT INTO ""UserStats"" (""UserId"", ""CurrentLevel"", ""CurrentXp"", ""TotalReviews"", ""TotalLists"", ""TotalComments"", ""UpdatedAt"", ""CurrentStreak"", ""LongestStreak"")
                    VALUES ({userId}, 1, 0, 0, 0, 0, {DateTime.UtcNow}, 0, 0)
                    ON CONFLICT (""UserId"") DO NOTHING");

                var stats = await Db.UserStats.FirstAsync(s => s.UserId == userId);

                var hasOpening = await Db.XpTransactions.AnyAsync(t => t.UserId == userId && t.DedupeKey == OpeningKey);
                if (!hasOpening)
                {
                    var legacyLevel = Math.Clamp(stats.CurrentLevel, 1, GamificationCatalog.MaxLevel);
                    var target = Math.Max(stats.CurrentXp, GamificationCatalog.LevelDef(legacyLevel).RequiredXp);
                    var ledgerSum = await Db.XpTransactions.Where(t => t.UserId == userId).SumAsync(t => (int?)t.Amount) ?? 0;

                    Db.XpTransactions.Add(new XpTransaction
                    {
                        UserId = userId,
                        Amount = target - ledgerSum,
                        Reason = OpeningKey,
                        DedupeKey = OpeningKey,
                        CreatedAt = DateTime.UtcNow,
                    });
                    stats.CurrentXp = target;
                    stats.CurrentLevel = GamificationCatalog.LevelForXp(target);
                    stats.UpdatedAt = DateTime.UtcNow;
                    await Db.SaveChangesAsync();
                    if (inserted == 0) _silent = true;
                }

                return stats;
            }

            /// <summary>Verilen metriklere bagli, henuz kazanilmamis rozetleri verir.</summary>
            public async Task EvaluateAsync(int userId, IEnumerable<string> metrics)
            {
                var human = await Db.Users.AsNoTracking()
                    .AnyAsync(u => u.Id == userId && !u.IsAiAgent && !u.IsBanned && !u.IsDeleted);
                if (!human) return;

                var wanted = metrics.ToHashSet();
                var codeToId = await AchievementIdsAsync();
                var earnedIds = (await Db.UserAchievements.AsNoTracking()
                    .Where(ua => ua.UserId == userId)
                    .Select(ua => ua.AchievementId)
                    .ToListAsync()).ToHashSet();

                var candidates = GamificationCatalog.Badges
                    .Where(b => wanted.Contains(b.Metric) && codeToId.ContainsKey(b.Code) && !earnedIds.Contains(codeToId[b.Code]))
                    .ToList();
                if (candidates.Count == 0) return;

                var calculator = new MetricCalculator(Db);
                var values = new Dictionary<string, int>();
                var granted = new List<BadgeDef>();

                foreach (var badge in candidates.OrderBy(b => b.SortOrder))
                {
                    if (!values.TryGetValue(badge.Metric, out var value))
                    {
                        value = await calculator.GetAsync(userId, badge.Metric);
                        values[badge.Metric] = value;
                    }
                    if (value < badge.Threshold) continue;

                    if (await InsertBadgeAsync(userId, codeToId[badge.Code]))
                    {
                        granted.Add(badge);
                        Touched.Add(userId);
                    }
                }

                // Rozet XP'si (seviye atlatip seviye rozetlerini tetikleyebilir; ApplyAsync zinciri halleder).
                // Gecisteki geriye donuk rozetler "badge_retro" olarak yazilir: haftalik liderlige girmez.
                var badgeReason = _silent ? RetroBadgeReason : "badge";
                foreach (var badge in granted.Where(b => b.XpReward > 0))
                {
                    await GrantAsync(userId, badgeReason, $"badge:{badge.Code}", badge.XpReward);
                }

                if (!_silent && granted.Count > 0)
                {
                    await NotifyAsync(userId, granted);
                }
            }

            private async Task<bool> InsertBadgeAsync(int userId, int achievementId)
            {
                // ON CONFLICT: ayni rozeti iki paralel istek ayni anda verirse ikincisi sessizce gecer.
                var rows = await Db.Database.ExecuteSqlInterpolatedAsync($@"
                    INSERT INTO ""UserAchievements"" (""UserId"", ""AchievementId"", ""Id"", ""EarnedAt"")
                    VALUES ({userId}, {achievementId}, 0, {DateTime.UtcNow})
                    ON CONFLICT (""UserId"", ""AchievementId"") DO NOTHING");
                return rows > 0;
            }

            private async Task<Dictionary<string, int>> AchievementIdsAsync()
            {
                return await _cache.GetOrCreateAsync("gm-achievement-ids", async entry =>
                {
                    entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(10);
                    var rows = await Db.Achievements.AsNoTracking()
                        .Where(a => a.IsActive && a.Code != "")
                        .Select(a => new { a.Code, a.Id })
                        .ToListAsync();
                    return rows.GroupBy(r => r.Code).ToDictionary(g => g.Key, g => g.Min(r => r.Id));
                }) ?? new Dictionary<string, int>();
            }

            private async Task NotifyAsync(int userId, List<BadgeDef> granted)
            {
                if (_notifications == null) return;
                try
                {
                    var username = await Db.Users.AsNoTracking()
                        .Where(u => u.Id == userId)
                        .Select(u => u.Username)
                        .FirstOrDefaultAsync();
                    if (username == null) return;
                    var link = $"/profiles/{username}";

                    var levelBadges = granted.Where(b => b.Family == "level").ToList();
                    var others = granted.Where(b => b.Family != "level").OrderByDescending(b => b.Tier).ThenByDescending(b => b.XpReward).ToList();

                    if (others.Count > 0)
                    {
                        var args = new Dictionary<string, string> { ["badgeCode"] = others[0].Code };
                        var key = "gamification.achievementUnlocked";
                        if (others.Count > 1)
                        {
                            key = "gamification.achievementsUnlocked";
                            args["count"] = others.Count.ToString();
                        }
                        await _notifications.CreateNotificationAsync(userId, NotificationType.AchievementUnlocked, key, args, link);
                    }

                    if (levelBadges.Count > 0)
                    {
                        var top = levelBadges.Max(b => b.Threshold);
                        await _notifications.CreateNotificationAsync(
                            userId,
                            NotificationType.LevelUp,
                            "gamification.levelUp",
                            new Dictionary<string, string> { ["levelNumber"] = top.ToString() },
                            link);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "gamification: bildirim gonderilemedi (kullanici {UserId})", userId);
                }
            }
        }

        // ------------------------------------------------------------------
        // Metrikler: rozet kosullarinin tek hesap yeri
        // ------------------------------------------------------------------

        private sealed class MetricCalculator
        {
            private readonly GGHubDbContext _db;

            public MetricCalculator(GGHubDbContext db) => _db = db;

            public async Task<int> GetAsync(int userId, string metric)
            {
                switch (metric)
                {
                    case "reviews":
                        return await _db.Reviews.CountAsync(r => r.UserId == userId);
                    case "deep_reviews":
                        return await _db.Reviews.CountAsync(r => r.UserId == userId && r.Content.Length > 500);
                    case "genres":
                        return await CountGenresAsync(userId);
                    case "posts":
                        return await _db.Posts.CountAsync(p => p.UserId == userId && p.RepostOfPostId == null);
                    case "curated_lists":
                        return await _db.UserLists.CountAsync(l => l.UserId == userId && l.Type == UserListType.Custom && l.UserListGames.Count >= 3);
                    case "listed_games":
                        return await _db.UserListGames
                            .Where(g => g.UserList.UserId == userId && g.UserList.Type == UserListType.Custom)
                            .Select(g => g.GameId)
                            .Distinct()
                            .CountAsync();
                    case "wishlist_games":
                        return await _db.UserListGames.CountAsync(g => g.UserList.UserId == userId && g.UserList.Type == UserListType.Wishlist);
                    case "favorite_games":
                        return await _db.UserListGames.CountAsync(g => g.UserList.UserId == userId && g.UserList.Type == UserListType.Favorites);
                    case "list_max_followers":
                        return await _db.UserLists
                            .Where(l => l.UserId == userId)
                            .Select(l => l.Followers.Count(f => f.FollowerUserId != userId))
                            .OrderByDescending(c => c)
                            .FirstOrDefaultAsync();
                    case "followers":
                        return await _db.Follows.CountAsync(f => f.FolloweeId == userId &&
                            !f.Follower.IsAiAgent && !f.Follower.IsBanned && !f.Follower.IsDeleted);
                    case "following":
                        return await _db.Follows.CountAsync(f => f.FollowerId == userId && !f.Followee.IsDeleted && !f.Followee.IsBanned);
                    case "comments":
                        return await _db.ReviewComments.CountAsync(c => c.UserId == userId && c.Review.UserId != userId) +
                               await _db.UserListComments.CountAsync(c => c.UserId == userId && c.UserList.UserId != userId);
                    case "likes_received":
                        return await _db.PostLikes.CountAsync(l => l.Post.UserId == userId && l.UserId != userId && !l.User.IsAiAgent) +
                               await _db.ReviewVotes.CountAsync(v => v.Review.UserId == userId && v.UserId != userId && v.Value == 1 && !v.User.IsAiAgent);
                    case "longest_streak":
                        return await _db.UserStats.Where(s => s.UserId == userId).Select(s => s.LongestStreak).FirstOrDefaultAsync();
                    case "level":
                        return await _db.UserStats.Where(s => s.UserId == userId).Select(s => s.CurrentLevel).FirstOrDefaultAsync();
                    case "account_age_days":
                        var createdAt = await _db.Users.Where(u => u.Id == userId).Select(u => (DateTime?)u.CreatedAt).FirstOrDefaultAsync();
                        return createdAt == null ? 0 : Math.Max(0, (int)(DateTime.UtcNow.Date - createdAt.Value.Date).TotalDays);
                    case "profile_complete":
                        return await _db.Users.AnyAsync(u => u.Id == userId &&
                            u.ProfileImageUrl != null && u.ProfileImageUrl != "" &&
                            u.HeaderImageUrl != null && u.HeaderImageUrl != "" &&
                            u.Bio != null && u.Bio != "") ? 1 : 0;
                    case "welcome":
                        return 1;
                    default:
                        return 0;
                }
            }

            private async Task<int> CountGenresAsync(int userId)
            {
                var jsons = await _db.Reviews.AsNoTracking()
                    .Where(r => r.UserId == userId && r.Game.GenresJson != null)
                    .Select(r => r.Game.GenresJson!)
                    .ToListAsync();

                var names = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
                foreach (var json in jsons)
                {
                    try
                    {
                        using var doc = JsonDocument.Parse(json);
                        if (doc.RootElement.ValueKind != JsonValueKind.Array) continue;
                        foreach (var item in doc.RootElement.EnumerateArray())
                        {
                            if (item.ValueKind == JsonValueKind.Object &&
                                (item.TryGetProperty("name", out var name) || item.TryGetProperty("Name", out name)) &&
                                name.ValueKind == JsonValueKind.String)
                            {
                                names.Add(name.GetString()!);
                            }
                        }
                    }
                    catch (JsonException)
                    {
                        // Bozuk tur verisi o oyunu saymaz.
                    }
                }
                return names.Count;
            }
        }
    }
}
