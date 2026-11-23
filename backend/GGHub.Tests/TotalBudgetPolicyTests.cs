using GGHub.Application.Interfaces;
using GGHub.Core.Entities;
using GGHub.Infrastructure.Services;

namespace GGHub.Tests;

public class TotalBudgetPolicyTests
{
    [Fact]
    public void Missing_caps_preserve_existing_source_budgets()
        => TotalBudgetPolicy.EnsureAvailable(new AiSettings(), 1000m, 100m, "2026-11", "2026-11-23");

    [Theory]
    [InlineData(199, 19)]
    [InlineData(0, 0)]
    public void Spending_below_both_caps_is_allowed(int month, int day)
        => TotalBudgetPolicy.EnsureAvailable(new AiSettings { UsdToTryRate = 1m, TotalMonthlyBudgetTry = 200m, TotalDailyBudgetTry = 20m }, month, day, "2026-11", "2026-11-23");

    [Theory]
    [InlineData(200, 19, "total-monthly")]
    [InlineData(201, 19, "total-monthly")]
    [InlineData(199, 20, "total-daily")]
    [InlineData(199, 21, "total-daily")]
    public void Reaching_either_cap_blocks_new_calls(int month, int day, string source)
    {
        var error = Assert.Throws<GeminiBudgetExceededException>(() => TotalBudgetPolicy.EnsureAvailable(
            new AiSettings { UsdToTryRate = 1m, TotalMonthlyBudgetTry = 200m, TotalDailyBudgetTry = 20m }, month, day, "2026-11", "2026-11-23"));
        Assert.Equal(source, error.BudgetSource);
    }

    [Fact]
    public void Exchange_rate_is_applied_before_comparing_caps()
        => Assert.Throws<GeminiBudgetExceededException>(() => TotalBudgetPolicy.EnsureAvailable(
            new AiSettings { UsdToTryRate = 50m, TotalMonthlyBudgetTry = 100m }, 2m, 0m, "2026-11", "2026-11-23"));

    [Fact]
    public void Zero_cap_stops_even_zero_cost_generation()
        => Assert.Throws<GeminiBudgetExceededException>(() => TotalBudgetPolicy.EnsureAvailable(
            new AiSettings { TotalDailyBudgetTry = 0m }, 0m, 0m, "2026-11", "2026-11-23"));

    [Fact]
    public void Manual_pause_overrides_unlimited_budgets_and_zero_spend()
    {
        var error = Assert.Throws<GeminiBudgetExceededException>(() => TotalBudgetPolicy.EnsureAvailable(
            new AiSettings { GenerationPaused = true }, 0m, 0m, "2026-11", "2026-11-23"));
        Assert.Equal("paused", error.BudgetSource);
    }

    [Fact]
    public void Next_day_can_resume_when_month_has_capacity()
        => TotalBudgetPolicy.EnsureAvailable(new AiSettings { UsdToTryRate = 1m, TotalMonthlyBudgetTry = 200m, TotalDailyBudgetTry = 20m }, 20m, 0m, "2026-11", "2026-11-24");
}
