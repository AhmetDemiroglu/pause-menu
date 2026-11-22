using GGHub.Application.Dtos;
using GGHub.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GGHub.WebAPI.Controllers
{
    /// <summary>
    /// Oyun dunyasindan haberler: herkese acik okuma. Haberleri GGHub.Worker yazar; bu uclar yalniz
    /// okur ve servis 5 dk bellekte tutar. Sayfa boyutu 12 ya da 24, sayfa en fazla 50.
    /// </summary>
    [ApiController]
    [Route("api/news")]
    [AllowAnonymous]
    public class NewsController : ControllerBase
    {
        private readonly INewsService _service;

        public NewsController(INewsService service)
        {
            _service = service;
        }

        [HttpGet]
        public async Task<IActionResult> GetList(
            [FromQuery] int page = 1, [FromQuery] int pageSize = 12, [FromQuery] string? category = null,
            [FromQuery] string? search = null, [FromQuery] int? days = null,
            CancellationToken ct = default)
        {
            return Ok(await _service.GetListAsync(page, pageSize, category, search, days, ct));
        }

        [HttpGet("featured")]
        public async Task<IActionResult> GetFeatured([FromQuery] int limit = 3, CancellationToken ct = default)
        {
            return Ok(await _service.GetFeaturedAsync(limit, ct));
        }

        [HttpGet("{slug}")]
        public async Task<IActionResult> GetBySlug(string slug, CancellationToken ct)
        {
            var isAdmin = User.Identity?.IsAuthenticated == true && User.IsInRole("Admin");
            var dto = await _service.GetBySlugAsync(slug, includeHidden: isAdmin, ct);
            return dto is null ? NotFound() : Ok(dto);
        }

        [HttpGet("sitemap")]
        [ResponseCache(Duration = 3600, Location = ResponseCacheLocation.Any)]
        public async Task<IActionResult> GetSitemap(CancellationToken ct)
        {
            return Ok(await _service.GetSitemapAsync(ct));
        }
    }

    /// <summary>Yanlis ya da uygunsuz haberi yayindan kaldirma.</summary>
    [ApiController]
    [Route("api/admin/news")]
    [Authorize(Roles = "Admin")]
    public class NewsAdminController : ControllerBase
    {
        private readonly INewsService _service;

        public NewsAdminController(INewsService service)
        {
            _service = service;
        }

        [HttpPut("{id:int}/hidden")]
        public async Task<IActionResult> SetHidden(int id, [FromBody] NewsHiddenUpdateDto dto, CancellationToken ct)
        {
            return await _service.SetHiddenAsync(id, dto.Hidden, ct) ? NoContent() : NotFound();
        }
    }
}
