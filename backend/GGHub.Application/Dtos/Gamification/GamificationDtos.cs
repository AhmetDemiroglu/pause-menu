namespace GGHub.Application.Dtos.Gamification
{
    /// <summary>Katalogdaki bir rozet ve hedef kullanicinin ona gore durumu.</summary>
    public class AchievementProgressDto
    {
        public string Code { get; set; } = string.Empty;
        public string Family { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty;
        public int Tier { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string IconUrl { get; set; } = string.Empty;
        public int XpReward { get; set; }
        public int Threshold { get; set; }
        /// <summary>Hedef metrigin bugunku degeri (ilerleme cubugu icin). Esigi gecebilir.</summary>
        public int Current { get; set; }
        public DateTime? EarnedAt { get; set; }
    }

    public class UserAchievementsDto
    {
        public int UserId { get; set; }
        public int EarnedCount { get; set; }
        public int TotalCount { get; set; }
        public List<AchievementProgressDto> Items { get; set; } = new();
    }

    public class LeaderboardEntryDto
    {
        public int Rank { get; set; }
        public int UserId { get; set; }
        public string Username { get; set; } = string.Empty;
        public string? ProfileImageUrl { get; set; }
        public int Level { get; set; }
        public string LevelName { get; set; } = string.Empty;
        /// <summary>period=all icin toplam XP, period=week icin son 7 gunde kazanilan net XP.</summary>
        public int Xp { get; set; }
    }

    public class LeaderboardPageDto
    {
        public string Period { get; set; } = "all";
        public int Page { get; set; }
        public int PageSize { get; set; }
        public bool HasMore { get; set; }
        public List<LeaderboardEntryDto> Items { get; set; } = new();
    }

    public class XpHistoryItemDto
    {
        public string Reason { get; set; } = string.Empty;
        public int Amount { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class XpHistoryPageDto
    {
        public int Page { get; set; }
        public int PageSize { get; set; }
        public bool HasMore { get; set; }
        public List<XpHistoryItemDto> Items { get; set; } = new();
    }
}
