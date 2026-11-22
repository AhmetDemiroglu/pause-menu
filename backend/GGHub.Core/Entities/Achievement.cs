namespace GGHub.Core.Entities
{
    public class Achievement
    {
        public int Id { get; set; }
        public string Title { get; set; }
        public string Description { get; set; }
        public string IconUrl { get; set; }
        public int XpReward { get; set; }
        public string CriteriaJson { get; set; }
        public bool IsActive { get; set; } = true;

        // Gamification 2.0: rozetin kalici anahtari (catalog.json). Eslesme artik gorunen
        // Title ile degil bununla yapilir; Title/Description istek dilinde katalogdan uretilir.
        public string Code { get; set; } = string.Empty;
        public string Family { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty;
        public int Tier { get; set; }
        public string Metric { get; set; } = string.Empty;
        public int Threshold { get; set; }
        public int SortOrder { get; set; }
    }
}