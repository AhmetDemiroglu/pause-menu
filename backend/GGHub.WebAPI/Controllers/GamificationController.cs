using System.Security.Claims;
using GGHub.Application.Dtos.Stats;
using GGHub.Application.Interfaces;
using GGHub.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace GGHub.WebAPI.Controllers
{
    [Route("api/gamification")]
    [ApiController]
    public class GamificationController : ControllerBase
    {
        private readonly IGamificationService _gamificationService;
        private readonly GGHubDbContext _context;

        public GamificationController(IGamificationService gamificationService, GGHubDbContext context)
        {
            _gamificationService = gamificationService;
            _context = context;
        }

        private int? CurrentUserId =>
            int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : null;

        /// <summary>
        /// Eski istemcilerin (web profil basligi) kullandigi uc. Profil icerigi kapisindan gecer:
        /// gizli, engelli ya da silinmis profilde bos doner. Yazma YAPMAZ.
        /// </summary>
        [HttpGet("stats/{userId:int}")]
        [AllowAnonymous]
        public async Task<IActionResult> GetUserStats(int userId)
        {
            var user = await _context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId);
            if (user == null || !await ProfileContentAccess.CanViewContentAsync(_context, user, CurrentUserId))
            {
                return Ok(new UserStatsDto());
            }

            return Ok(await _gamificationService.GetUserStatsAsync(userId));
        }

        /// <summary>Tum rozet katalogu, kullanicinin kazandiklari ve her rozete ilerlemesi.</summary>
        [HttpGet("users/{username}/achievements")]
        [AllowAnonymous]
        public async Task<IActionResult> GetAchievements(string username)
        {
            var user = await ProfileContentAccess.GetViewableUserAsync(_context, username, CurrentUserId);
            if (user == null) return NotFound();

            return Ok(await _gamificationService.GetAchievementsAsync(user.Id));
        }

        /// <summary>period: all | week. Sayfa 50 satir, en fazla 4 sayfa; 15 dk onbellek.</summary>
        [HttpGet("leaderboard")]
        [AllowAnonymous]
        public async Task<IActionResult> GetLeaderboard([FromQuery] string? period, [FromQuery] int page = 1)
        {
            return Ok(await _gamificationService.GetLeaderboardAsync(period, page));
        }

        /// <summary>Oturum sahibinin XP hareketleri (yeniden eskiye).</summary>
        [HttpGet("me/history")]
        [Authorize]
        public async Task<IActionResult> GetMyHistory([FromQuery] int page = 1)
        {
            var userId = CurrentUserId;
            if (userId == null) return Unauthorized();
            return Ok(await _gamificationService.GetHistoryAsync(userId.Value, page));
        }
    }
}
