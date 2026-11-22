using GGHub.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace GGHub.Infrastructure.Services
{
    /// <summary>
    /// Gamification 2.0 gecisi: acilis bakiyesi olmayan her hesap icin acilis bakiyesi yazar ve
    /// hak ettigi rozetleri SESSIZCE verir (bildirim yok). 200'erli partiler, partiler arasi kisa
    /// mola; tekrar calisirsa yapacak isi kalmamistir (acilis anahtari benzersiz).
    ///
    /// Aktif kullanicilar ilk olaylarinda zaten acilis bakiyesi alir (GamificationService); bu is
    /// uzun suredir girmeyenleri ve rozet gecmisini tamamlar. Yalniz Production'da (ya da localhost
    /// veritabaninda) kaydedilir: gelistirme baglantisi canli veritabanina gidiyor.
    /// </summary>
    public class GamificationBackfillJob : BackgroundService
    {
        private const int BatchSize = 200;

        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ILogger<GamificationBackfillJob> _logger;

        public GamificationBackfillJob(IServiceScopeFactory scopeFactory, ILogger<GamificationBackfillJob> logger)
        {
            _scopeFactory = scopeFactory;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            try
            {
                // Acilis yogunlugu (migration, diger seeder'lar) gecsin.
                await Task.Delay(TimeSpan.FromSeconds(45), stoppingToken);
                var total = 0;
                var lastId = 0;

                while (!stoppingToken.IsCancellationRequested)
                {
                    List<int> batch;
                    using (var scope = _scopeFactory.CreateScope())
                    {
                        var db = scope.ServiceProvider.GetRequiredService<GGHubDbContext>();
                        batch = await db.Users.AsNoTracking()
                            .Where(u => u.Id > lastId && !u.IsAiAgent && !u.IsDeleted &&
                                        !db.XpTransactions.Any(t => t.UserId == u.Id && t.DedupeKey == GamificationService.OpeningKey))
                            .OrderBy(u => u.Id)
                            .Select(u => u.Id)
                            .Take(BatchSize)
                            .ToListAsync(stoppingToken);
                    }

                    if (batch.Count == 0) break;

                    foreach (var userId in batch)
                    {
                        using var scope = _scopeFactory.CreateScope();
                        var service = scope.ServiceProvider.GetRequiredService<GamificationService>();
                        try
                        {
                            await service.MigrateUserAsync(userId);
                        }
                        catch (Exception ex)
                        {
                            _logger.LogWarning(ex, "gamification-backfill: kullanici {UserId} atlandi", userId);
                        }
                    }

                    total += batch.Count;
                    lastId = batch[^1];
                    _logger.LogInformation("gamification-backfill: {Total} hesap islendi", total);
                    await Task.Delay(TimeSpan.FromSeconds(2), stoppingToken);
                }

                _logger.LogInformation("gamification-backfill: tamamlandi ({Total} hesap)", total);
            }
            catch (OperationCanceledException)
            {
                // Kapanis.
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "gamification-backfill: durdu");
            }
        }
    }
}
