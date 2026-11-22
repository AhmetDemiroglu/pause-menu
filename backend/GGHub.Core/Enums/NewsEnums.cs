namespace GGHub.Core.Enums
{
    /// <summary>Haber kategorisi. Sayisal degerler DB'de ve istemcilerde kullanilir; sirayi degistirme.</summary>
    public enum NewsCategory
    {
        Announcement = 0,
        ReleaseDate = 1,
        Release = 2,
        Update = 3,
        Industry = 4,
        Hardware = 5,
        Esports = 6,
        Other = 7
    }

    public enum NewsImageKind
    {
        None = 0,
        /// <summary>Katalogdaki eslesen oyunun gorseli.</summary>
        Catalog = 1,
        /// <summary>Gemini ile uretilmis temsili gorsel.</summary>
        Generated = 2
    }
}
