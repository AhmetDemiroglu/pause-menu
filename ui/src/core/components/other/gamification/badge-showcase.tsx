"use client";

import { useState } from "react";
import { Award, ChevronRight } from "lucide-react";
import { AchievementBadge } from "@/core/components/base/achievement-badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/core/components/ui/tooltip";
import { useCurrentLocale, useI18n } from "@/core/contexts/locale-context";
import { CATALOG_BADGES, tierName } from "@/core/gamification/catalog";
import type { UserStats } from "@/models/stats/user-stats.model";
import { AchievementsDialog } from "./achievements-dialog";

type BadgeShowcaseProps = {
    username: string;
    stats: UserStats;
};

/** Profil ozetindeki rozet vitrini: son 8 rozet, toplam sayac ve tum koleksiyon penceresi. */
export function BadgeShowcase({ username, stats }: BadgeShowcaseProps) {
    const t = useI18n();
    const locale = useCurrentLocale();
    const [open, setOpen] = useState(false);
    // Vitrin etiketi kisa: kademe metal rengi ve noktalarla zaten okunuyor ("Altin Elestirmen" -> "Elestirmen").
    // Tam ad ipucunda ve ekran okuyucu etiketinde kalir. Dil uyusmazsa tam ad gosterilir.
    const shortLabel = (title: string, tier?: number) => {
        const prefix = tier ? tierName(tier, locale) : null;
        return prefix && title.startsWith(`${prefix} `) ? title.slice(prefix.length + 1) : title;
    };
    // Her aileden yalniz en yuksek kademe: yan yana "Kidemli, Kidemli" gorunmesin.
    const recent = (stats.recentAchievements ?? []).reduce<typeof stats.recentAchievements>((acc, badge) => {
        const family = badge.family || badge.code || badge.title;
        const index = acc.findIndex((b) => (b.family || b.code || b.title) === family);
        if (index === -1) acc.push(badge);
        else if ((badge.tier ?? 0) > (acc[index].tier ?? 0)) acc[index] = badge;
        return acc;
    }, []);
    const total = stats.totalAchievementCount ?? CATALOG_BADGES.length;
    const earned = stats.earnedAchievementCount ?? recent.length;

    return (
        <div className="relative overflow-hidden rounded-xl border border-yellow-500/20 bg-linear-to-br from-card via-card/50 to-muted/50 p-4 shadow-sm backdrop-blur-sm">
            <div className="pointer-events-none absolute -top-10 -right-10 h-32 w-32 rounded-full bg-yellow-500/10 blur-[50px]" />

            <div className="mb-4 flex items-center gap-2">
                <div className="rounded-lg bg-yellow-500/10 p-1.5">
                    <Award className="h-5 w-5 text-yellow-600 dark:text-yellow-500" />
                </div>
                <h3 className="font-semibold tracking-tight text-foreground">{t("profileOverview.badgeCollection")}</h3>
                <span className="ml-auto text-xs tabular-nums text-muted-foreground">{t("gamification.badgesEarned", { earned, total })}</span>
            </div>

            <div className="min-h-20">
                {recent.length > 0 ? (
                    <TooltipProvider delayDuration={200}>
                        <ul className="grid grid-cols-4 gap-2">
                            {recent.slice(0, 8).map((badge) => (
                                <li key={badge.code ?? badge.title}>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <button
                                                type="button"
                                                onClick={() => setOpen(true)}
                                                className="group flex w-full flex-col items-center gap-1.5 rounded-lg border border-transparent p-1.5 transition-all duration-300 hover:-translate-y-0.5 hover:border-border/50 hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                                            >
                                                <AchievementBadge code={badge.code} legacyTitle={badge.title} size={48} label={t("gamification.badgeAlt", { name: badge.title })} />
                                                <span className="line-clamp-2 min-h-[2lh] w-full text-center text-[10px] leading-tight font-medium break-words text-muted-foreground transition-colors group-hover:text-primary">
                                                    {shortLabel(badge.title, badge.tier)}
                                                </span>
                                            </button>
                                        </TooltipTrigger>
                                        <TooltipContent side="top">
                                            <p className="text-xs font-semibold">{badge.title}</p>
                                            <p className="text-xs">{badge.description}</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </li>
                            ))}
                        </ul>
                    </TooltipProvider>
                ) : (
                    <div className="flex flex-col items-center justify-center space-y-2 rounded-lg border border-dashed border-border bg-muted/20 py-6 text-center">
                        <Award className="h-8 w-8 text-muted-foreground/30" />
                        <span className="text-xs text-muted-foreground">{t("profileOverview.noBadges")}</span>
                    </div>
                )}
            </div>

            <button
                type="button"
                onClick={() => setOpen(true)}
                className="mt-3 flex w-full items-center justify-center gap-1 rounded-lg border border-border/60 py-2 text-xs font-medium text-foreground/80 transition-colors hover:border-primary/40 hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
                {t("gamification.seeAll")}
                <ChevronRight className="h-3.5 w-3.5" />
            </button>

            <AchievementsDialog username={username} open={open} onOpenChange={setOpen} />
        </div>
    );
}
