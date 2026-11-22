using GGHub.Application.Dtos;
using GGHub.Application.DTOs.Common;

namespace GGHub.Application.Interfaces
{
    /// <summary>
    /// Haber okuma (herkese acik) ve admin gizleme. Haberleri YAZAN taraf burasi degil:
    /// GGHub.Worker icindeki NewsIngestJob. Railway yalniz okur.
    /// </summary>
    public interface INewsService
    {
        Task<PaginatedResult<NewsListItemDto>> GetListAsync(int page, int pageSize, string? category, CancellationToken ct = default);

        /// <summary>One cikanlar: son 48 saatin (azsa 7 gunun) gorselli haberleri, onem, kaynak sayisi, tazelik sirasiyla.</summary>
        Task<List<NewsListItemDto>> GetFeaturedAsync(int limit, CancellationToken ct = default);

        /// <summary>Bulunamazsa ya da gizliyse null (admin icin includeHidden).</summary>
        Task<NewsDetailDto?> GetBySlugAsync(string slug, bool includeHidden, CancellationToken ct = default);

        Task<bool> SetHiddenAsync(int id, bool hidden, CancellationToken ct = default);

        Task<PaginatedResult<SitemapEntryDto>> GetSitemapAsync(CancellationToken ct = default);
    }
}
