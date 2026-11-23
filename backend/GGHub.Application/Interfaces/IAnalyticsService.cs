using GGHub.Application.Dtos;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace GGHub.Application.Interfaces
{
    public interface IAnalyticsService
    {
        Task<IEnumerable<TopUserDto>> GetMostFollowedUsersAsync(int count = 5, bool humansOnly = false);
        Task<IEnumerable<TopListDto>> GetMostPopularListsAsync(int count = 5, bool humansOnly = false);
        Task<IEnumerable<TopGameDto>> GetHighestRatedGamesAsync(int count = 5, bool humansOnly = false);
    }
}