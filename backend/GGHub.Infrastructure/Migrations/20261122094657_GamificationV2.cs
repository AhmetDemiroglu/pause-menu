using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace GGHub.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class GamificationV2 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "CurrentStreak",
                table: "UserStats",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<DateOnly>(
                name: "LastActiveOn",
                table: "UserStats",
                type: "date",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "LongestStreak",
                table: "UserStats",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "Category",
                table: "Achievements",
                type: "character varying(32)",
                maxLength: 32,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Code",
                table: "Achievements",
                type: "character varying(48)",
                maxLength: 48,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Family",
                table: "Achievements",
                type: "character varying(32)",
                maxLength: 32,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Metric",
                table: "Achievements",
                type: "character varying(32)",
                maxLength: 32,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "SortOrder",
                table: "Achievements",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "Threshold",
                table: "Achievements",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "Tier",
                table: "Achievements",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateTable(
                name: "XpTransactions",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UserId = table.Column<int>(type: "integer", nullable: false),
                    Amount = table.Column<int>(type: "integer", nullable: false),
                    Reason = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    DedupeKey = table.Column<string>(type: "character varying(96)", maxLength: 96, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_XpTransactions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_XpTransactions_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            // Mevcut rozet satirlarina kalici kod: basliktan eslenir (catalog.json legacyTitles).
            // Ayni baslik birden fazla satirda varsa yalniz en eski satir kodu alir, digerleri
            // legacy_<Id> olur ve kapatilir. Boylece asagidaki benzersiz indeks guvenle kurulur;
            // kazanilmis rozet satirlari (UserAchievements) hicbir sekilde degismez.
            migrationBuilder.Sql(@"
                WITH ranked AS (
                    SELECT ""Id"", ""Title"",
                           ROW_NUMBER() OVER (PARTITION BY ""Title"" ORDER BY ""Id"") AS rn
                    FROM ""Achievements""
                )
                UPDATE ""Achievements"" a
                SET ""Code"" = CASE
                        WHEN r.rn = 1 AND r.""Title"" = 'Novice' THEN 'welcome'
                        WHEN r.rn = 1 AND r.""Title"" = 'Critic' THEN 'critic_1'
                        WHEN r.rn = 1 AND r.""Title"" = 'Curator' THEN 'curator_1'
                        WHEN r.rn = 1 AND r.""Title"" = 'Popular' THEN 'popular_2'
                        WHEN r.rn = 1 AND r.""Title"" ~ '^Level [1-7]$' THEN 'level_' || substring(r.""Title"" from 7)
                        ELSE 'legacy_' || a.""Id""
                    END,
                    ""IsActive"" = CASE
                        WHEN r.rn = 1 AND (r.""Title"" IN ('Novice', 'Critic', 'Curator', 'Popular') OR r.""Title"" ~ '^Level [2-7]$') THEN a.""IsActive""
                        ELSE false
                    END
                FROM ranked r
                WHERE r.""Id"" = a.""Id"";
            ");

            migrationBuilder.CreateIndex(
                name: "IX_Achievements_Code",
                table: "Achievements",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_XpTransactions_CreatedAt",
                table: "XpTransactions",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_XpTransactions_UserId_CreatedAt",
                table: "XpTransactions",
                columns: new[] { "UserId", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_XpTransactions_UserId_DedupeKey",
                table: "XpTransactions",
                columns: new[] { "UserId", "DedupeKey" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "XpTransactions");

            migrationBuilder.DropIndex(
                name: "IX_Achievements_Code",
                table: "Achievements");

            migrationBuilder.DropColumn(
                name: "CurrentStreak",
                table: "UserStats");

            migrationBuilder.DropColumn(
                name: "LastActiveOn",
                table: "UserStats");

            migrationBuilder.DropColumn(
                name: "LongestStreak",
                table: "UserStats");

            migrationBuilder.DropColumn(
                name: "Category",
                table: "Achievements");

            migrationBuilder.DropColumn(
                name: "Code",
                table: "Achievements");

            migrationBuilder.DropColumn(
                name: "Family",
                table: "Achievements");

            migrationBuilder.DropColumn(
                name: "Metric",
                table: "Achievements");

            migrationBuilder.DropColumn(
                name: "SortOrder",
                table: "Achievements");

            migrationBuilder.DropColumn(
                name: "Threshold",
                table: "Achievements");

            migrationBuilder.DropColumn(
                name: "Tier",
                table: "Achievements");
        }
    }
}
