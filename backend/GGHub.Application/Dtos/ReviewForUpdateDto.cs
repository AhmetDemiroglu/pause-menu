namespace GGHub.Application.Dtos
{
    public class ReviewForUpdateDto
    {
        public int Rating { get; set; }
        [System.ComponentModel.DataAnnotations.StringLength(5000)]
        public string Content { get; set; }
    }
}