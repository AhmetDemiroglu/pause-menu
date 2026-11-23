using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GGHub.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddTotalAiBudgetControls : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "GenerationPaused",
                table: "AiSettings",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<decimal>(
                name: "TotalDailyBudgetTry",
                table: "AiSettings",
                type: "numeric(12,2)",
                precision: 12,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "TotalMonthlyBudgetTry",
                table: "AiSettings",
                type: "numeric(12,2)",
                precision: 12,
                scale: 2,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "GenerationPaused",
                table: "AiSettings");

            migrationBuilder.DropColumn(
                name: "TotalDailyBudgetTry",
                table: "AiSettings");

            migrationBuilder.DropColumn(
                name: "TotalMonthlyBudgetTry",
                table: "AiSettings");
        }
    }
}
