namespace GGHub.Application.Dtos
{
    public class AchievementDto
    {
        // Gorunen ad ve aciklama ISTEK dilinde katalogdan uretilir (Gamification 2.0).
        // Eski istemciler yalniz Title/Description/IconUrl/EarnedAt okur; yeni alanlar eklendi.
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string IconUrl { get; set; } = string.Empty;
        public DateTime EarnedAt { get; set; }
        public string Code { get; set; } = string.Empty;
        public string Family { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty;
        public int Tier { get; set; }
        public int XpReward { get; set; }
    }
}
