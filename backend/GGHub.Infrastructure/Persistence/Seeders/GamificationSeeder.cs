using System.Text.Json;
using GGHub.Core.Entities;
using GGHub.Core.Gamification;
using Microsoft.EntityFrameworkCore;

namespace GGHub.Infrastructure.Persistence.Seeders
{
    /// <summary>
    /// Levels ve Achievements tablolarini catalog.json ile esitler (upsert, Code anahtariyla).
    ///
    /// Eskiden yalniz BOS tabloya yaziyordu: yeni rozet canli veritabanina hic ulasmiyordu.
    /// Simdi her acilista katalogla esitler; katalogda olmayan eski kayitlar silinmez,
    /// IsActive=false olur (kazananlarin satirlari bozulmasin).
    ///
    /// DIKKAT: yazan bir seeder. Program.cs'te Migrate() SONRASINDA ve yalniz Production (ya da
    /// localhost veritabani) kosulunda calisir; gelistirme baglantisi canli veritabanina gidiyor.
    /// </summary>
    public static class GamificationSeeder
    {
        public static async Task SeedAsync(GGHubDbContext context)
        {
            await SyncLevelsAsync(context);
            await SyncAchievementsAsync(context);
        }

        private static async Task SyncLevelsAsync(GGHubDbContext context)
        {
            var existing = await context.Levels.ToListAsync();
            foreach (var def in GamificationCatalog.Levels)
            {
                var row = existing.Where(l => l.LevelNumber == def.Number).OrderBy(l => l.Id).FirstOrDefault();
                if (row == null)
                {
                    context.Levels.Add(new Level { LevelNumber = def.Number, Name = def.Name.Tr, RequiredXp = def.RequiredXp });
                    continue;
                }
                row.Name = def.Name.Tr;
                row.RequiredXp = def.RequiredXp;
            }
            await context.SaveChangesAsync();
        }

        private static async Task SyncAchievementsAsync(GGHubDbContext context)
        {
            var existing = await context.Achievements.ToListAsync();
            var byCode = existing
                .Where(a => !string.IsNullOrEmpty(a.Code))
                .GroupBy(a => a.Code)
                .ToDictionary(g => g.Key, g => g.OrderBy(a => a.Id).First());

            // Kod alani bos eski satirlar (migration'dan once eklenmis olabilir): basliktan eslenir.
            foreach (var row in existing.Where(a => string.IsNullOrEmpty(a.Code)))
            {
                if (GamificationCatalog.LegacyTitles.TryGetValue(row.Title ?? string.Empty, out var code) && !byCode.ContainsKey(code))
                {
                    row.Code = code;
                    byCode[code] = row;
                }
                else
                {
                    row.Code = $"legacy_{row.Id}";
                    row.IsActive = false;
                }
            }

            var catalogCodes = new HashSet<string>();
            foreach (var def in GamificationCatalog.Badges)
            {
                catalogCodes.Add(def.Code);
                if (!byCode.TryGetValue(def.Code, out var row))
                {
                    row = new Achievement { Code = def.Code };
                    context.Achievements.Add(row);
                    byCode[def.Code] = row;
                }

                row.Title = def.TitleText.En;
                row.Description = def.DescriptionText.En;
                row.IconUrl = def.IconUrl;
                row.XpReward = def.XpReward;
                row.CriteriaJson = JsonSerializer.Serialize(new { metric = def.Metric, threshold = def.Threshold });
                row.Family = def.Family;
                row.Category = def.Category;
                row.Tier = def.Tier;
                row.Metric = def.Metric;
                row.Threshold = def.Threshold;
                row.SortOrder = def.SortOrder;
                row.IsActive = true;
            }

            foreach (var row in byCode.Values.Where(a => !catalogCodes.Contains(a.Code)))
            {
                row.IsActive = false;
            }

            await context.SaveChangesAsync();
        }
    }
}
