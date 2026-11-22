using System.ComponentModel.DataAnnotations;

namespace GGHub.Application.Dtos
{
    public class ReviewForCreationDto
    {
        [Required]
        public int GameId { get; set; }
        [Required]
        [Range(1, 10)]
        public int Rating { get; set; }
        [Required]
        // Ust sinir: uc anonim olarak tum incelemeleri tek yanitta donuyor; 20 MB'lik tek bir
        // inceleme her sayfa gosteriminde 20 MB sikistirma + aktarim demekti. Mobil 2000'de keser.
        [StringLength(5000)]
        public string Content { get; set; }
    }
}