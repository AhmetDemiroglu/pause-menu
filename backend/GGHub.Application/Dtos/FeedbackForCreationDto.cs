using System.ComponentModel.DataAnnotations;

namespace GGHub.Application.Dtos
{
    /// <summary>
    /// Uygulama ici genel geri bildirim / guvenlik bildirimi. Google Play Cocuk Guvenligi
    /// politikasi "uygulamadan cikmadan geri bildirim" yolu ister; misafir de gonderebilir.
    /// </summary>
    public class FeedbackForCreationDto
    {
        /// <summary>child_safety | harassment | spam | bug | other</summary>
        [Required]
        [MaxLength(32)]
        public string Category { get; set; } = "other";

        [Required]
        [MinLength(3)]
        [MaxLength(2000)]
        public string Message { get; set; } = string.Empty;

        [EmailAddress]
        [MaxLength(200)]
        public string? ContactEmail { get; set; }
    }
}
