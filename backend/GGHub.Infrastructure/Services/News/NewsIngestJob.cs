using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace GGHub.Infrastructure.Services.News
{
    /// <summary>
    /// Haber botu, Mac'teki Worker'da 20 dakikada bir tur atar. Ana salter AiSettings.NewsEnabled
    /// (varsayilan kapali): kapaliyken her tur tek bir ayar okumasidir, ag ya da model cagrisi yok.
    /// Mac uyurken GitHub Actions saatte bir devralir (Worker --news-once); son tur 15 dakikadan
    /// yeniyse (Actions az once calistiysa) bu tur atlanir.
    /// </summary>
    public sealed class NewsIngestJob : BackgroundService
    {
        private static readonly TimeSpan Interval = TimeSpan.FromMinutes(20);
        private static readonly TimeSpan StartupDelay = TimeSpan.FromMinutes(1);

        private readonly IServiceScopeFactory _scopes;
        private readonly ILogger<NewsIngestJob> _logger;

        public NewsIngestJob(IServiceScopeFactory scopes, ILogger<NewsIngestJob> logger)
        {
            _scopes = scopes;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            try { await Task.Delay(StartupDelay, stoppingToken); }
            catch (OperationCanceledException) { return; }

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    using var scope = _scopes.CreateScope();
                    var runner = scope.ServiceProvider.GetRequiredService<NewsIngestRunner>();
                    var report = await runner.RunAsync(new NewsRunOptions
                    {
                        Holder = "mac",
                        SkipIfCompletedWithin = TimeSpan.FromMinutes(15)
                    }, stoppingToken);

                    if (report.Written > 0 || report.AttachedToExisting > 0 || report.FeedErrors.Count > 0)
                    {
                        _logger.LogInformation("[News] Tur bitti.\n{Report}", report.ToString());
                    }
                }
                catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
                {
                    return;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "[News] Tur hatasi.");
                }

                try { await Task.Delay(Interval, stoppingToken); }
                catch (OperationCanceledException) { return; }
            }
        }
    }
}
