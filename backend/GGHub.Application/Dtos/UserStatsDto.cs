namespace GGHub.Application.Dtos.Stats
{
    public class UserStatsDto
    {
        public int TotalReviews { get; set; }
        public int TotalGamesListed { get; set; }
        public int TotalFollowers { get; set; }
        public int UserId { get; set; }
        public int CurrentLevel { get; set; }
        public string LevelName { get; set; }
        public int CurrentXp { get; set; }
        public int NextLevelXp { get; set; }
        public int ProgressPercentage { get; set; }
        public int TotalLists { get; set; }
        public List<AchievementDto> RecentAchievements { get; set; } = new();

        // Gamification 2.0 (yalniz ekleme; eski alanlarin anlami degismedi).
        /// <summary>Mevcut seviyenin baslangic esigi.</summary>
        public int CurrentLevelXp { get; set; }
        /// <summary>Sonraki seviyeye kalan XP; en ust seviyede 0.</summary>
        public int RemainingXp { get; set; }
        public bool IsMaxLevel { get; set; }
        public int EarnedAchievementCount { get; set; }
        public int TotalAchievementCount { get; set; }
        public int CurrentStreak { get; set; }
        public int LongestStreak { get; set; }
        public List<GenreStatDto> GamerDna { get; set; } = new(); 
    }

    public class GenreStatDto
    {
        public string Name { get; set; } = string.Empty;
        public int Percentage { get; set; }
        public string Color { get; set; } = string.Empty;
    }
}