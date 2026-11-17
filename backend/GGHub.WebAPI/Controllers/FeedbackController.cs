using GGHub.Application.Dtos;
using GGHub.Application.Interfaces;
using GGHub.Core.Enums;
using GGHub.Infrastructure.Localization;
using GGHub.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using System.Net;
using System.Security.Claims;

namespace GGHub.WebAPI.Controllers
{
    /// <summary>
    /// Uygulama ici geri bildirim ve guvenlik bildirimi (cocuk guvenligi dahil).
    /// Misafir de gonderir. Kalici iz: her admine SystemAlert bildirimi (DB'de durur).
    /// E-posta ek kanaldir, basarisiz olursa istek yine basarili sayilir.
    /// </summary>
    [Route("api/[controller]")]
    [ApiController]
    [AllowAnonymous]
    public class FeedbackController : ControllerBase
    {
        private static readonly HashSet<string> Categories = new(StringComparer.Ordinal)
        {
            "child_safety", "harassment", "spam", "bug", "other"
        };

        private readonly GGHubDbContext _db;
        private readonly INotificationService _notifications;
        private readonly IEmailService _email;
        private readonly IConfiguration _config;
        private readonly ILogger<FeedbackController> _logger;

        public FeedbackController(
            GGHubDbContext db,
            INotificationService notifications,
            IEmailService email,
            IConfiguration config,
            ILogger<FeedbackController> logger)
        {
            _db = db;
            _notifications = notifications;
            _email = email;
            _config = config;
            _logger = logger;
        }

        [HttpPost]
        [EnableRateLimiting("FeedbackPolicy")]
        public async Task<IActionResult> Send(FeedbackForCreationDto dto)
        {
            var category = (dto.Category ?? "other").Trim().ToLowerInvariant();
            if (!Categories.Contains(category))
            {
                return BadRequest(new { message = AppText.Get("feedback.invalidCategory") });
            }

            var message = dto.Message.Trim();
            int? userId = null;
            var idClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (int.TryParse(idClaim, out var parsed)) userId = parsed;

            string sender = "guest";
            if (userId.HasValue)
            {
                var name = await _db.Users.AsNoTracking()
                    .Where(u => u.Id == userId.Value)
                    .Select(u => u.Username)
                    .FirstOrDefaultAsync();
                if (!string.IsNullOrEmpty(name)) sender = "@" + name;
            }
            if (!string.IsNullOrWhiteSpace(dto.ContactEmail)) sender += $" <{dto.ContactEmail.Trim()}>";

            var admins = await _db.Users.AsNoTracking()
                .Where(u => u.Role == "Admin" && !u.IsDeleted && !u.IsBanned && !u.IsAiAgent)
                .Select(u => u.Id)
                .ToListAsync();

            var args = new Dictionary<string, string>
            {
                ["category"] = category,
                ["sender"] = sender,
                ["message"] = message.Length > 500 ? message[..500] + "..." : message
            };

            foreach (var adminId in admins)
            {
                try
                {
                    await _notifications.CreateNotificationAsync(
                        recipientUserId: adminId,
                        type: NotificationType.SystemAlert,
                        messageKey: "admin.feedbackNotification",
                        messageArgs: args,
                        link: null,
                        actorUserId: null);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Geri bildirim admin bildirimi yazilamadi");
                }
            }

            _logger.LogWarning("Feedback received: category={Category} sender={Sender} length={Length}",
                category, sender, message.Length);

            var to = _config["EmailSettings:FromAddress"];
            if (!string.IsNullOrWhiteSpace(to))
            {
                try
                {
                    var subject = category == "child_safety"
                        ? "Pause Menu - CHILD SAFETY report"
                        : $"Pause Menu - Feedback ({category})";
                    var body = $"<p><b>Category:</b> {WebUtility.HtmlEncode(category)}</p>"
                             + $"<p><b>From:</b> {WebUtility.HtmlEncode(sender)}</p>"
                             + $"<p style=\"white-space:pre-wrap\">{WebUtility.HtmlEncode(message)}</p>";
                    await _email.SendEmailAsync(to, subject, body);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Geri bildirim e-postasi gonderilemedi");
                }
            }

            return Ok(new { message = AppText.Get("feedback.sent") });
        }
    }
}
