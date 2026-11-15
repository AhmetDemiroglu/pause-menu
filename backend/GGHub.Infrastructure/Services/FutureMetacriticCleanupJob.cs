using GGHub.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace GGHub.Infrastructure.Services
{
    /// <summary>
    /// RAWG arada henüz çıkmamış oyunlara metacritic puanı verebiliyor (ör. 2027
    /// Tomb Raider'da puan olması). Yeni senkronizasyonlar zaten
    /// RawgGameService.SanitizeMetacritic ile temizleniyor; bu job sadece günde bir
    /// kez DB'de kalmış eski hatalı kayıtları toplu olarak null'a indirir.
    /// </summary>
    public class FutureMetacriticCleanupJob : BackgroundService
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly ILogger<FutureMetacriticCleanupJob> _logger;
        private readonly TimeSpan _interval;
        private readonly TimeSpan _initialDelay;
        private readonly bool _enabled;

        public FutureMetacriticCleanupJob(
            IServiceProvider serviceProvider,
            IConfiguration configuration,
            ILogger<FutureMetacriticCleanupJob> logger)
        {
            _serviceProvider = serviceProvider;
            _logger = logger;

            // Bayrak kontrolu job'in ICINDE: eskiden Program.cs'te durdugu icin, kayit yeri
            // degisince kontrol tamamen kayboluyordu ve job Enabled=false iken calisiyordu.
            // Varsayilan false: prod DB'ye yazan bir job kazara calismamali.
            _enabled = configuration.GetValue<bool>("Jobs:FutureMetacriticCleanup:Enabled");

            // Varsayılan: günde bir tur. Override edilebilir.
            var hours = configuration.GetValue<double?>("Jobs:FutureMetacriticCleanup:RunIntervalHours") ?? 24.0;
            _interval = TimeSpan.FromHours(hours);

            // İlk açılışta hemen değil, app stabil hale gelsin: 5 dakika beklesin.
            var startupMin = configuration.GetValue<double?>("Jobs:FutureMetacriticCleanup:StartupDelayMinutes") ?? 5.0;
            _initialDelay = TimeSpan.FromMinutes(startupMin);
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            if (!_enabled)
            {
                _logger.LogInformation("[FutureMetacriticCleanup] Job kapali.");
                return;
            }

            _logger.LogInformation(
                "[FutureMetacriticCleanup] Started. Initial delay: {Delay}. Interval: {Interval}.",
                _initialDelay, _interval);

            try
            {
                await Task.Delay(_initialDelay, stoppingToken);
            }
            catch (TaskCanceledException)
            {
                return;
            }

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await RunOnceAsync(stoppingToken);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "[FutureMetacriticCleanup] Run failed: {Message}", ex.Message);
                }

                try
                {
                    await Task.Delay(_interval, stoppingToken);
                }
                catch (TaskCanceledException)
                {
                    return;
                }
            }
        }

        private async Task RunOnceAsync(CancellationToken ct)
        {
            using var scope = _serviceProvider.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<GGHubDbContext>();

            var todayIso = DateTime.UtcNow.ToString("yyyy-MM-dd");
            var updated = await context.Games
                .Where(g => g.Metacritic != null
                            && g.Released != null
                            && string.Compare(g.Released, todayIso) > 0)
                .ExecuteUpdateAsync(s => s.SetProperty(g => g.Metacritic, (int?)null), ct);

            if (updated > 0)
            {
                _logger.LogInformation(
                    "[FutureMetacriticCleanup] Reset Metacritic on {Count} future-dated games.",
                    updated);
            }

            // RAWG ve IGDB kullanici puanlari cikistan once de birikebiliyor (GTA VI, 103 oyla 3.86).
            // Cikmamis oyunda puan gosterilmez; cikinca RawgUpcomingSyncJob (geri pencere) ve
            // IgdbEnrichJob (7 gunluk tazeleme) gercek puani yazar.
            // Tarih karsilastirmasi GameRelease ile ayni gun siniri: Turkiye (UTC+3).
            var trToday = DateTime.UtcNow.AddHours(3).ToString("yyyy-MM-dd");
            var signalFrom = DateTime.UtcNow - GGHub.Core.Specifications.GameRelease.UpcomingSignalLifetime;
            var ratingsCleared = await context.Games
                .Where(g => (g.Rating != null || g.IgdbRating != null)
                            && ((g.Released != null && g.Released.Length == 10 && string.Compare(g.Released, trToday) > 0)
                                || (g.Released == null && g.UpcomingSeenAt != null && g.UpcomingSeenAt > signalFrom)))
                .ExecuteUpdateAsync(s => s
                    .SetProperty(g => g.Rating, (double?)null)
                    .SetProperty(g => g.IgdbRating, (double?)null), ct);

            if (ratingsCleared > 0)
            {
                _logger.LogInformation(
                    "[FutureMetacriticCleanup] Cleared RAWG/IGDB user ratings on {Count} unreleased games.",
                    ratingsCleared);
            }

            // Yalniz IGDB'den gelen satirlarda (RawgId < -1e9) eski ingest IGDB puanini RAWG puani
            // (/20) ve IGDB elestirmen ortalamasini Metacritic diye yaziyordu. RAWG puani bu
            // satirlarda HICBIR zaman gercek olamaz. Metacritic yalniz dogrulanmamissa (MetacriticUrl
            // bos) silinir: MetacriticSyncJob onu gercek kaynaktan yeniden sorgular.
            var igdbFloor = -IgdbCatalogService.IgdbRawgIdOffset;
            var igdbRawgCleared = await context.Games
                .Where(g => g.RawgId < igdbFloor && g.Rating != null)
                .ExecuteUpdateAsync(s => s.SetProperty(g => g.Rating, (double?)null), ct);
            var igdbMetaCleared = await context.Games
                .Where(g => g.RawgId < igdbFloor && g.Metacritic != null && g.MetacriticUrl == null)
                .ExecuteUpdateAsync(s => s.SetProperty(g => g.Metacritic, (int?)null), ct);
            if (igdbRawgCleared > 0 || igdbMetaCleared > 0)
            {
                _logger.LogInformation(
                    "[FutureMetacriticCleanup] IGDB-only rows: cleared {Rawg} fake RAWG ratings, {Meta} unverified Metacritic scores.",
                    igdbRawgCleared, igdbMetaCleared);
            }
        }
    }
}
