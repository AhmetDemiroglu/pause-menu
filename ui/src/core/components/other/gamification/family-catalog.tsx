"use client";

import { AchievementBadge } from "@/core/components/base/achievement-badge";
import { useCurrentLocale, useI18n } from "@/core/contexts/locale-context";
import { CATALOG_CATEGORIES, CATALOG_FAMILIES, pickText } from "@/core/gamification/catalog";

/**
 * Herkese acik rozet katalogu: aile basina tek kart. Kademeler yan yana, altlarinda esik ve XP.
 * 66 rozeti tek tek satir yapmak sayfayi gereksiz uzatiyordu; kullanicinin kendi ilerlemesi
 * profildeki koleksiyon penceresinde (BadgeGrid) durur.
 */
export function FamilyCatalog() {
    const t = useI18n();
    const locale = useCurrentLocale();

    return (
        <div className="space-y-6">
            {CATALOG_CATEGORIES.map((category) => {
                const families = CATALOG_FAMILIES.filter((f) => f.category === category.key);
                if (families.length === 0) return null;
                const count = families.reduce((n, f) => n + f.badges.length, 0);

                return (
                    <section key={category.key} aria-labelledby={`family-cat-${category.key}`}>
                        <div className="mb-3 flex items-baseline justify-between gap-2">
                            <h3 id={`family-cat-${category.key}`} className="text-sm font-semibold tracking-tight">
                                {pickText(category.name, locale)}
                            </h3>
                            <span className="text-xs text-muted-foreground">{t("gamification.badgeCount", { count })}</span>
                        </div>
                        <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                            {families.map((family) => {
                                const unit = family.unit ? pickText(family.unit, locale) : null;
                                return (
                                    <li key={family.key} className="rounded-2xl border border-border/50 bg-card/60 p-4">
                                        <p className="text-sm font-semibold">{pickText(family.name, locale)}</p>
                                        <p className="mt-0.5 text-xs text-muted-foreground">{pickText(family.summary, locale)}</p>
                                        <ol className="mt-3 flex flex-wrap gap-x-3 gap-y-2">
                                            {family.badges.map((badge) => (
                                                <li key={badge.code} className="flex w-14 flex-col items-center text-center">
                                                    <AchievementBadge
                                                        code={badge.code}
                                                        size={44}
                                                        label={`${pickText(badge.title, locale)}: ${pickText(badge.description, locale)}`}
                                                    />
                                                    {family.badges.length > 1 || family.key === "list_star" ? (
                                                        <span className="mt-1 text-[11px] leading-tight font-semibold tabular-nums">
                                                            {family.key === "level" ? t("gamification.levelShortLabel", { level: badge.threshold }) : badge.threshold}
                                                            {unit && family.key !== "level" ? ` ${unit}` : ""}
                                                        </span>
                                                    ) : null}
                                                    {badge.xpReward > 0 ? (
                                                        <span className="text-[10px] leading-tight font-medium text-primary">+{badge.xpReward} XP</span>
                                                    ) : null}
                                                </li>
                                            ))}
                                        </ol>
                                    </li>
                                );
                            })}
                        </ul>
                    </section>
                );
            })}
        </div>
    );
}
