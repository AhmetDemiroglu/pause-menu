using GGHub.Application.Interfaces;
using GGHub.Core.Entities;

namespace GGHub.Infrastructure.Services;

public static class TotalBudgetPolicy
{
    public static void EnsureAvailable(AiSettings settings, decimal spentUsd, decimal todayUsd, string month, string today)
    {
        var rate = settings.UsdToTryRate > 0 ? settings.UsdToTryRate : 1m;
        if (settings.GenerationPaused)
            throw new GeminiBudgetExceededException("paused", month, spentUsd, spentUsd);
        if (settings.TotalMonthlyBudgetTry is decimal monthly && spentUsd * rate >= monthly)
            throw new GeminiBudgetExceededException("total-monthly", month, spentUsd, monthly / rate);
        if (settings.TotalDailyBudgetTry is decimal daily && todayUsd * rate >= daily)
            throw new GeminiBudgetExceededException("total-daily", today, todayUsd, daily / rate);
    }
}
