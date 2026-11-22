"use client";

import dayjs from "dayjs";
import "dayjs/locale/tr";
import { AchievementBadge } from "@/core/components/base/achievement-badge";
import { Progress } from "@/core/components/ui/progress";
import { useCurrentLocale, useI18n } from "@/core/contexts/locale-context";
import { CATALOG_BADGES, CATALOG_CATEGORIES, pickText } from "@/core/gamification/catalog";
import { cn } from "@/core/lib/utils";

export type BadgeGridItem = {
    code: string;
    title: string;
    description: string;
    tier: number;
    xpReward: number;
    threshold: number;
    /** Ilerleme bilinmiyorsa (herkese acik katalog) null. */
    current: number | null;
    earnedAt: string | null;
};

type BadgeGridProps = {
    items: BadgeGridItem[];
    /** true: kazanilmamislar kilitli cizilir (kullanici koleksiyonu). false: katalog, hepsi renkli. */
    showLocks: boolean;
    className?: string;
};

/** Kategori basliklariyla gruplanmis rozet izgarasi. Profil penceresi ve aciklama sayfasi ortak kullanir. */
export function BadgeGrid({ items, showLocks, className }: BadgeGridProps) {
    const t = useI18n();
    const locale = useCurrentLocale();
    const byCode = new Map(items.map((i) => [i.code, i]));

    return (
        <div className={cn("space-y-6", className)}>
            {CATALOG_CATEGORIES.map((category) => {
                const group = CATALOG_BADGES.filter((b) => b.category === category.key)
                    .map((b) => byCode.get(b.code))
                    .filter((i): i is BadgeGridItem => !!i);
                if (group.length === 0) return null;
                const earned = group.filter((i) => i.earnedAt).length;

                return (
                    <section key={category.key} aria-labelledby={`badge-cat-${category.key}`}>
                        <div className="mb-3 flex items-baseline justify-between gap-2">
                            <h3 id={`badge-cat-${category.key}`} className="text-sm font-semibold tracking-tight">
                                {pickText(category.name, locale)}
                            </h3>
                            {showLocks && (
                                <span className="text-xs text-muted-foreground">
                                    {t("gamification.badgesEarned", { earned, total: group.length })}
                                </span>
                            )}
                        </div>
                        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                            {group.map((item) => (
                                <BadgeGridCell key={item.code} item={item} showLocks={showLocks} locale={locale} />
                            ))}
                        </ul>
                    </section>
                );
            })}
        </div>
    );
}

function BadgeGridCell({ item, showLocks, locale }: { item: BadgeGridItem; showLocks: boolean; locale: string }) {
    const t = useI18n();
    const locked = showLocks && !item.earnedAt;
    const progress = item.current !== null && item.threshold > 0 ? Math.min(100, (item.current / item.threshold) * 100) : null;

    return (
        <li
            className={cn(
                "flex items-center gap-3 rounded-xl border border-border/50 bg-card/60 p-3",
                locked && "bg-muted/20",
            )}
        >
            <AchievementBadge code={item.code} locked={locked} size={52} label={t("gamification.badgeAlt", { name: item.title })} />
            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                    <p className={cn("truncate text-sm font-semibold", locked && "text-muted-foreground")}>{item.title}</p>
                </div>
                <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{item.description}</p>
                <div className="mt-1.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                    {item.earnedAt ? (
                        <span className="text-emerald-600 dark:text-emerald-400">
                            {t("gamification.earnedOn", {
                                date: dayjs(item.earnedAt).locale(locale === "tr" ? "tr" : "en").format("D MMM YYYY"),
                            })}
                        </span>
                    ) : progress !== null ? (
                        <>
                            <Progress value={progress} className="h-1.5 flex-1 bg-muted" aria-label={item.title} />
                            <span className="shrink-0 tabular-nums">
                                {t("gamification.progress", { current: Math.min(item.current ?? 0, item.threshold), threshold: item.threshold })}
                            </span>
                        </>
                    ) : null}
                    {item.xpReward > 0 && <span className="ml-auto shrink-0 font-medium text-primary">{t("gamification.rewardXp", { xp: item.xpReward })}</span>}
                </div>
            </div>
        </li>
    );
}
