namespace GGHub.Application.Dtos
{
    public class GameQueryParams
    {
        // Sunucu tarafi sinir: uc anonim; pageSize=100000 tum Games tablosunu (~100 bin satir) tek
        // yanitta dondururdu. En buyuk istemci sayfasi 50; sayfa numarasi da makul bir tavanda.
        private int _page = 1;
        private int _pageSize = 20;
        public int Page { get => _page; set => _page = Math.Clamp(value, 1, 1000); }
        public int PageSize { get => _pageSize; set => _pageSize = Math.Clamp(value, 1, 100); }
        public string? Search { get; set; } 
        public string? Genres { get; set; }
        public string? Platforms { get; set; }
        public string? Ordering { get; set; }
        public string? Dates { get; set; }
    }
}