namespace GGHub.Core.Entities
{
    /// <summary>
    /// XP defteri. Her XP degisimi (kazanc ya da geri alma) bir satirdir; UserStats.CurrentXp
    /// bu satirlarin toplamidir.
    ///
    /// (UserId, DedupeKey) benzersiz: ayni olay ikinci kez XP kazandiramaz (ornegin "review:42").
    /// Geri alma, orijinal anahtarin basina "revert:" eklenmis ayri bir satirdir; boylece bir
    /// geri alma yalniz gercekten verilmis XP'yi ve yalniz bir kez dusurur.
    /// </summary>
    public class XpTransaction
    {
        public long Id { get; set; }
        public int UserId { get; set; }
        public User User { get; set; } = null!;
        public int Amount { get; set; }
        /// <summary>Katalogdaki kural anahtari: review, list, comment, badge, opening ...</summary>
        public string Reason { get; set; } = string.Empty;
        public string DedupeKey { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
