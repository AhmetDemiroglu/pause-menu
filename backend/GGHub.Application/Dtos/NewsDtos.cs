namespace GGHub.Application.Dtos
{
    /// <summary>
    /// Haber listesi ogesi. Iki dil birlikte doner (Game.Description / DescriptionTr deseni):
    /// istemci yerel diline gore secer, dil degisince yeniden istek gerekmez.
    /// Govde listede YOK: liste yukunu kucuk tutar.
    /// </summary>
    public class NewsListItemDto
    {
        public int Id { get; set; }
        public string Slug { get; set; } = null!;
        public string TitleTr { get; set; } = null!;
        public string TitleEn { get; set; } = null!;
        public string SummaryTr { get; set; } = null!;
        public string SummaryEn { get; set; } = null!;

        /// <summary>announcement | releaseDate | release | update | industry | hardware | esports | other</summary>
        public string Category { get; set; } = null!;

        public int Importance { get; set; }
        public string? ImageUrl { get; set; }

        /// <summary>none | catalog | generated</summary>
        public string ImageKind { get; set; } = null!;

        public DateTime PublishedAt { get; set; }

        /// <summary>Ilk (en eski) kaynagin adi; kartta gorunur.</summary>
        public string SourceName { get; set; } = null!;
        public int SourceCount { get; set; }
    }

    public class NewsSourceDto
    {
        public string Name { get; set; } = null!;
        public string Url { get; set; } = null!;
        public string Title { get; set; } = null!;
        public string Language { get; set; } = null!;
        public DateTime PublishedAt { get; set; }
    }

    public class NewsGameDto
    {
        public int Id { get; set; }
        public string Slug { get; set; } = null!;
        public string Name { get; set; } = null!;
        public string? BackgroundImage { get; set; }
        public string? Released { get; set; }
    }

    public class NewsDetailDto : NewsListItemDto
    {
        public string BodyTr { get; set; } = null!;
        public string BodyEn { get; set; } = null!;
        public List<NewsSourceDto> Sources { get; set; } = new();
        public NewsGameDto? Game { get; set; }
        public bool IsHidden { get; set; }
    }

    public class NewsHiddenUpdateDto
    {
        public bool Hidden { get; set; }
    }
}
