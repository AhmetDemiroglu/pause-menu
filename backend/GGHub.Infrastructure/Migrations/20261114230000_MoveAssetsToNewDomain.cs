using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GGHub.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class MoveAssetsToNewDomain : Migration
    {
        private static readonly (string Table, string Column)[] AssetColumns =
        {
            ("Users", "ProfileImageUrl"),
            ("Users", "HeaderImageUrl"),
            ("PostImages", "Url"),
            ("Achievements", "IconUrl"),
            ("Games", "CoverImage"),
            ("Games", "BackgroundImage"),
        };

        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Yuklenen gorseller (R2) mutlak URL olarak saklaniyor. Varlik alan adi degistigi icin
            // "https://assets.<eski alan adi>/" ile baslayan her kayit yeni varlik alan adina tasinir.
            // Dosyalarin kendisi ayni bucket'ta kalir, yalnizca adres degisir. Tekrar calistirilabilir.
            foreach (var (table, column) in AssetColumns)
            {
                migrationBuilder.Sql(
                    $@"UPDATE ""{table}"" SET ""{column}"" = regexp_replace(""{column}"", '^https://assets\.[^/]+/', 'https://assets.pausemenu.app/') " +
                    $@"WHERE ""{column}"" ~ '^https://assets\.[^/]+/' AND ""{column}"" NOT LIKE 'https://assets.pausemenu.app/%';");
            }
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Veri tasimasi; geri alinmaz.
        }
    }
}
