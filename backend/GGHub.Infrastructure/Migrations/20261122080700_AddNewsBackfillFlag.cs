using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GGHub.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddNewsBackfillFlag : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsBackfill",
                table: "NewsArticles",
                type: "boolean",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsBackfill",
                table: "NewsArticles");
        }
    }
}
