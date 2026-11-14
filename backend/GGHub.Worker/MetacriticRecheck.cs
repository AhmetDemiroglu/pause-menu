using GGHub.Application.Interfaces;
using GGHub.Infrastructure.Persistence;
using GGHub.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace GGHub.Worker;

/// <summary>
/// "--recheck-metacritic &lt;baslangic&gt; [--apply]": verilen tarihten bugune kadar cikmis ve
/// Metacritic puani olan oyunlari yeniden sorgular. Eslestirici artik remake'i (ayni isim,
/// yillar farkli) reddettigi icin, eski kuralla orijinalin puanini almis kayitlar burada
/// "no_results"/"no_score" doner. Ornek: 2026 Ocarina of Time'da 1998 orijinalinin 96'si.
///
/// Varsayilan KURU KOSU: yalniz listeler. --apply verilirse bu kayitlarda puan silinir ve
/// durum isareti yazilir (MetacriticSyncJob normal araliklarla yeniden dener).
/// Gecici hatalar (timeout, http) atlanir, hicbir sey degismez.
/// </summary>
public static class MetacriticRecheck
{
    public static async Task<int> RunAsync(IServiceProvider services, string fromDate, bool apply)
    {
        using var scope = services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<GGHubDbContext>();
        var metacritic = scope.ServiceProvider.GetRequiredService<IMetacriticService>();

        var today = DateTime.UtcNow.ToString("yyyy-MM-dd");
        var games = await context.Games
            .Where(g => g.Metacritic != null && g.Released != null
                && string.Compare(g.Released, fromDate) >= 0
                && string.Compare(g.Released, today) <= 0)
            .OrderByDescending(g => g.RawgAdded ?? 0)
            .ToListAsync();

        Console.WriteLine($"{games.Count} oyun yeniden sorgulanacak ({fromDate} .. {today}), {(apply ? "UYGULA" : "kuru kosu")}.");

        var wrong = 0;
        var skipped = 0;
        foreach (var game in games)
        {
            var result = await metacritic.GetMetacriticScoreAsync(game.Name, game.Released);
            var status = result?.DebugInfo;

            if (status == MetacriticService.StatusSuccess)
            {
                if (result!.Score != game.Metacritic)
                    Console.WriteLine($"  FARKLI  {game.Name} ({game.Released}): katalog {game.Metacritic}, Metacritic {result.Score} (degistirilmedi)");
                continue;
            }

            if (status != MetacriticService.StatusNoResults && status != MetacriticService.StatusNoScore)
            {
                skipped++;
                continue;
            }

            wrong++;
            Console.WriteLine($"  YANLIS  {game.Name} ({game.Released}): katalog {game.Metacritic}, Metacritic: {status}");

            if (apply)
            {
                game.Metacritic = null;
                game.MetacriticUrl = MetacriticSyncJob.BuildStatusMarker(status);
                game.LastSyncedAt = DateTime.UtcNow;
                await context.SaveChangesAsync();
            }
        }

        Console.WriteLine($"Bitti: {wrong} yanlis puan{(apply ? " silindi" : " bulundu (silmek icin --apply)")}, {skipped} gecici hata yuzunden atlandi.");
        return 0;
    }
}
