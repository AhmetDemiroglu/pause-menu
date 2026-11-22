using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace GGHub.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddNews : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "NewsDailyArticleCap",
                table: "AiSettings",
                type: "integer",
                nullable: false,
                defaultValue: 40);

            migrationBuilder.AddColumn<int>(
                name: "NewsDailyGeneratedImageCap",
                table: "AiSettings",
                type: "integer",
                nullable: false,
                defaultValue: 8);

            migrationBuilder.AddColumn<bool>(
                name: "NewsEnabled",
                table: "AiSettings",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<decimal>(
                name: "NewsMonthlyBudgetTry",
                table: "AiSettings",
                type: "numeric(12,2)",
                precision: 12,
                scale: 2,
                nullable: false,
                defaultValue: 450m);

            migrationBuilder.CreateTable(
                name: "NewsArticles",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Slug = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
                    TitleTr = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    TitleEn = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    SummaryTr = table.Column<string>(type: "character varying(800)", maxLength: 800, nullable: false),
                    SummaryEn = table.Column<string>(type: "character varying(800)", maxLength: 800, nullable: false),
                    BodyTr = table.Column<string>(type: "character varying(6000)", maxLength: 6000, nullable: false),
                    BodyEn = table.Column<string>(type: "character varying(6000)", maxLength: 6000, nullable: false),
                    Category = table.Column<int>(type: "integer", nullable: false),
                    Importance = table.Column<int>(type: "integer", nullable: false),
                    ImageUrl = table.Column<string>(type: "character varying(600)", maxLength: 600, nullable: true),
                    ImageKind = table.Column<int>(type: "integer", nullable: false),
                    GameId = table.Column<int>(type: "integer", nullable: true),
                    PublishedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    IsHidden = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NewsArticles", x => x.Id);
                    table.ForeignKey(
                        name: "FK_NewsArticles_Games_GameId",
                        column: x => x.GameId,
                        principalTable: "Games",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "NewsFeedStates",
                columns: table => new
                {
                    FeedKey = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    ETag = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    LastModified = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    LastFetchedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ConsecutiveFailures = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NewsFeedStates", x => x.FeedKey);
                });

            migrationBuilder.CreateTable(
                name: "NewsRunLeases",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false),
                    Holder = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    ExpiresAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    LastCompletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    LastCompletedBy = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NewsRunLeases", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "NewsSkippedItems",
                columns: table => new
                {
                    Url = table.Column<string>(type: "character varying(800)", maxLength: 800, nullable: false),
                    Reason = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    SkippedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NewsSkippedItems", x => x.Url);
                });

            migrationBuilder.CreateTable(
                name: "NewsArticleSources",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    NewsArticleId = table.Column<int>(type: "integer", nullable: false),
                    SourceName = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    FeedKey = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    Url = table.Column<string>(type: "character varying(800)", maxLength: 800, nullable: false),
                    OriginalTitle = table.Column<string>(type: "character varying(400)", maxLength: 400, nullable: false),
                    Language = table.Column<string>(type: "character varying(8)", maxLength: 8, nullable: false),
                    PublishedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NewsArticleSources", x => x.Id);
                    table.ForeignKey(
                        name: "FK_NewsArticleSources_NewsArticles_NewsArticleId",
                        column: x => x.NewsArticleId,
                        principalTable: "NewsArticles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.InsertData(
                table: "NewsRunLeases",
                columns: new[] { "Id", "ExpiresAt", "Holder", "LastCompletedAt", "LastCompletedBy" },
                values: new object[] { 1, new DateTime(2000, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), null, null, null });

            migrationBuilder.CreateIndex(
                name: "IX_NewsArticles_Category_PublishedAt",
                table: "NewsArticles",
                columns: new[] { "Category", "PublishedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_NewsArticles_GameId",
                table: "NewsArticles",
                column: "GameId");

            migrationBuilder.CreateIndex(
                name: "IX_NewsArticles_IsHidden_PublishedAt",
                table: "NewsArticles",
                columns: new[] { "IsHidden", "PublishedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_NewsArticles_Slug",
                table: "NewsArticles",
                column: "Slug",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_NewsArticleSources_NewsArticleId",
                table: "NewsArticleSources",
                column: "NewsArticleId");

            migrationBuilder.CreateIndex(
                name: "IX_NewsArticleSources_Url",
                table: "NewsArticleSources",
                column: "Url",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_NewsSkippedItems_SkippedAt",
                table: "NewsSkippedItems",
                column: "SkippedAt");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "NewsArticleSources");

            migrationBuilder.DropTable(
                name: "NewsFeedStates");

            migrationBuilder.DropTable(
                name: "NewsRunLeases");

            migrationBuilder.DropTable(
                name: "NewsSkippedItems");

            migrationBuilder.DropTable(
                name: "NewsArticles");

            migrationBuilder.DropColumn(
                name: "NewsDailyArticleCap",
                table: "AiSettings");

            migrationBuilder.DropColumn(
                name: "NewsDailyGeneratedImageCap",
                table: "AiSettings");

            migrationBuilder.DropColumn(
                name: "NewsEnabled",
                table: "AiSettings");

            migrationBuilder.DropColumn(
                name: "NewsMonthlyBudgetTry",
                table: "AiSettings");
        }
    }
}
