using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GGHub.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddNewsSourceImages : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ImageUrl",
                table: "NewsPendingItems",
                type: "character varying(800)",
                maxLength: 800,
                nullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "ImageUrl",
                table: "NewsArticles",
                type: "character varying(800)",
                maxLength: 800,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "character varying(600)",
                oldMaxLength: 600,
                oldNullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ImageCredit",
                table: "NewsArticles",
                type: "character varying(80)",
                maxLength: 80,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ImageUrl",
                table: "NewsPendingItems");

            migrationBuilder.DropColumn(
                name: "ImageCredit",
                table: "NewsArticles");

            migrationBuilder.AlterColumn<string>(
                name: "ImageUrl",
                table: "NewsArticles",
                type: "character varying(600)",
                maxLength: 600,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "character varying(800)",
                oldMaxLength: 800,
                oldNullable: true);
        }
    }
}
