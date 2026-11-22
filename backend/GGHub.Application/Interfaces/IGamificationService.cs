using GGHub.Application.Dtos.Gamification;
using GGHub.Application.Dtos.Stats;

namespace GGHub.Application.Interfaces
{
    /// <summary>
    /// Gamification 2.0 giris kapisi. On* metotlari olay bildirir; XP miktari, gunluk tavan,
    /// tekrar korumasi ve rozet kurallari servisin icindedir (catalog.json). Hicbiri istisna
    /// firlatmaz: oyunlastirma hatasi kullanicinin asil islemini asla dusurmez.
    /// </summary>
    public interface IGamificationService
    {
        Task OnRegisteredAsync(int userId);
        /// <summary>Giris ve token yenileme: gunluk ziyaret, seri ve tam rozet degerlendirmesi (gunde bir kez).</summary>
        Task OnActiveAsync(int userId);
        Task OnReviewCreatedAsync(int userId, int reviewId, int contentLength);
        Task OnReviewDeletedAsync(int userId, int reviewId);
        Task OnListGameAddedAsync(int userId, int listId);
        Task OnListDeletedAsync(int userId, int listId);
        /// <param name="kind">"review" ya da "list".</param>
        Task OnCommentCreatedAsync(int userId, string kind, int commentId, int contentOwnerId, int contentLength);
        Task OnCommentDeletedAsync(int userId, string kind, int commentId);
        Task OnPostCreatedAsync(int userId, int postId, bool qualifies);
        Task OnPostDeletedAsync(int userId, int postId);
        Task OnFollowedAsync(int followerId, int followeeId);
        Task OnUnfollowedAsync(int followerId, int followeeId);
        /// <param name="kind">"post" ya da "review".</param>
        Task OnLikeChangedAsync(int ownerId, int likerId, string kind, int targetId, bool liked);
        Task OnCollectionChangedAsync(int userId);
        Task OnProfileUpdatedAsync(int userId);
        Task OnListFollowedAsync(int listOwnerId);

        Task<UserStatsDto> GetUserStatsAsync(int userId);
        Task<UserAchievementsDto> GetAchievementsAsync(int userId);
        Task<LeaderboardPageDto> GetLeaderboardAsync(string? period, int page);
        Task<XpHistoryPageDto> GetHistoryAsync(int userId, int page);
    }
}
