"use client";

import type { ComponentType, ReactNode } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Gamepad2, HelpCircle, Layers, ShieldCheck, Sparkles, Trophy } from "lucide-react";
import { getUserStats } from "@/api/stats/stats.api";
import { PageHero } from "@core/components/base/page-hero";
import { LevelEmblem } from "@/core/components/base/achievement-badge";
import { FamilyCatalog } from "@/core/components/other/gamification/family-catalog";
import { LeaderboardPanel } from "@/core/components/other/gamification/leaderboard-panel";
import { Progress } from "@/core/components/ui/progress";
import { useCurrentLocale, useI18n } from "@/core/contexts/locale-context";
import { useAuth } from "@core/hooks/use-auth";
import { CATALOG_BADGES, CATALOG_LEVELS, CATALOG_RULES, CATALOG_TIERS, pickText } from "@/core/gamification/catalog";
import { buildLocalizedPathname } from "@/i18n/config";

// Metinler sayfanin kendisinde (diger yasal/bilgi sayfalariyla ayni kalip). Sayilar, kurallar ve
// rozet adlari ise catalog.json'dan gelir: sunucunun uyguladigi kurallarla birebir aynidir.
const COPY = {
    "en-US": {
        title: "Levels and Badges",
        subtitle: "Every contribution on Pause Menu earns XP. XP sets your level, and badges unlock as you reach goals.",
        meta: "{badges} badges · {levels} levels",
        yourStatus: "Your progress",
        viewMyBadges: "My badges",
        xpTitle: "How to earn XP",
        xpIntro: "These actions earn XP. The daily limit is how many times a day an action can earn XP.",
        colAction: "Action",
        colXp: "XP",
        colCap: "Daily limit",
        once: "Once",
        none: "None",
        badgeXp: "Every badge also pays XP by tier:",
        levelsTitle: "Levels",
        levelsIntro: "Your level comes from your total XP. If you delete content, the XP it earned is taken back and your level follows.",
        badgesTitle: "Badges",
        badgesIntro: "The badges fall into five categories. The frame shows the category and the metal shows the tier. A badge you earn is yours to keep.",
        leaderboardTitle: "Leaderboard",
        leaderboardIntro: "This week counts XP earned in the last 7 days, all time counts total XP. Bots, suspended accounts and private profiles are not listed. The table refreshes every 15 minutes.",
        fairTitle: "Fair play",
        fair: [
            "The same piece of content earns XP once. Deleting and posting it again earns nothing extra.",
            "Deleted reviews, lists, comments and posts give back the XP they earned.",
            "Commenting on your own content or liking yourself earns no XP.",
            "Every action has a daily limit, and deleting content does not refill it.",
            "AI accounts do not earn XP and never appear on the leaderboard.",
            "Accounts that abuse the rules can be suspended. Suspended accounts do not earn XP.",
            "Days reset at midnight UTC.",
        ],
        faqTitle: "Questions",
        faq: [
            { q: "Can my level go down?", a: "Your level comes from total XP. Deleting content takes back its XP, so your level can drop. Badges you earned stay." },
            { q: "Why did my badge not arrive right away?", a: "Most badges arrive right after the action. A few, like veteran and complete profile badges, are checked on your first visit of the day." },
            { q: "Who can see my XP if my profile is private?", a: "Your level, XP and badges are visible only to you and people who can see your profile. You are not listed on the leaderboard." },
            { q: "How is the streak counted?", a: "Each day you open Pause Menu your streak grows by one. Miss a day and it starts again. Day 7 and every 30th day pay bonus XP." },
        ],
    },
    tr: {
        title: "Seviyeler ve Rozetler",
        subtitle: "Pause Menu'de yaptığın her katkı XP kazandırır. XP seviyeni belirler, hedeflere ulaştıkça rozetler açılır.",
        meta: "{badges} rozet · {levels} seviye",
        yourStatus: "Senin durumun",
        viewMyBadges: "Rozetlerim",
        xpTitle: "XP nasıl kazanılır?",
        xpIntro: "Aşağıdaki eylemler XP kazandırır. Günlük sınır, bir eylemin aynı gün içinde en fazla kaç kez XP kazandırdığını gösterir.",
        colAction: "Eylem",
        colXp: "XP",
        colCap: "Günlük sınır",
        once: "Bir kez",
        none: "Yok",
        badgeXp: "Her rozet ayrıca kademesine göre XP kazandırır:",
        levelsTitle: "Seviyeler",
        levelsIntro: "Seviyen toplam XP'ne göre hesaplanır. Bir içeriği silersen o içerikten kazanılan XP geri alınır, seviyen de buna göre güncellenir.",
        badgesTitle: "Rozetler",
        badgesIntro: "Rozetler beş kategoriye ayrılır. Çerçeve kategoriyi, metal kademeyi gösterir. Kazandığın rozet kalıcıdır.",
        leaderboardTitle: "Liderlik tablosu",
        leaderboardIntro: "Bu hafta son 7 günde kazanılan XP'yi, tüm zamanlar toplam XP'yi sayar. Botlar, askıya alınmış hesaplar ve gizli profiller listelenmez. Tablo 15 dakikada bir yenilenir.",
        fairTitle: "Adil oyun",
        fair: [
            "Aynı içerik bir kez XP kazandırır. Silip yeniden paylaşmak ek XP getirmez.",
            "Silinen inceleme, liste, yorum ve gönderinin kazandırdığı XP geri alınır.",
            "Kendi içeriğine yorum yapmak ve kendini beğenmek XP kazandırmaz.",
            "Her eylemin günlük bir sınırı vardır. İçerik silmek bu sınırı yenilemez.",
            "Yapay zeka hesapları XP kazanmaz ve liderlik tablosunda yer almaz.",
            "Kuralları kötüye kullanan hesaplar askıya alınabilir. Askıdaki hesaplar XP kazanmaz.",
            "Günler UTC saatine göre, Türkiye saatiyle 03:00'te yenilenir.",
        ],
        faqTitle: "Sık sorulanlar",
        faq: [
            { q: "Seviyem düşebilir mi?", a: "Seviye toplam XP'den hesaplanır. İçerik silindiğinde o içeriğin XP'si geri alındığı için seviye düşebilir. Kazandığın rozetler kalıcıdır." },
            { q: "Rozetim neden hemen gelmedi?", a: "Rozetlerin çoğu eylemden hemen sonra gelir. Kıdem ve tam profil gibi birkaçı günün ilk ziyaretinde kontrol edilir." },
            { q: "Profilim gizliyse XP'mi kimler görür?", a: "Seviyen, XP'n ve rozetlerin yalnız sana ve profilini görebilenlere görünür. Liderlik tablosunda yer almazsın." },
            { q: "Seri nasıl hesaplanır?", a: "Pause Menu'yü açtığın her gün serin bir artar. Bir gün atlarsan seri yeniden başlar. 7. günde ve her 30. günde ek XP kazanırsın." },
        ],
    },
} as const;

const TIER_REWARDS = [10, 25, 50, 100, 200];

export function LevelsView() {
    const t = useI18n();
    const locale = useCurrentLocale();
    const copy = COPY[locale as keyof typeof COPY] ?? COPY["en-US"];
    const formatter = new Intl.NumberFormat(locale);

    return (
        <div className="w-full space-y-8 p-5">
            <PageHero
                title={copy.title}
                subtitle={copy.subtitle}
                meta={
                    <span className="text-xs font-medium text-white/60">
                        {copy.meta.replace("{badges}", String(CATALOG_BADGES.length)).replace("{levels}", String(CATALOG_LEVELS.length))}
                    </span>
                }
                actions={<HeroEmblems />}
            />

            <YourStatus copy={copy} />

            <Section id="xp" icon={Sparkles} title={copy.xpTitle} intro={copy.xpIntro}>
                <div className="overflow-hidden rounded-2xl border border-border/50 bg-card/60">
                    <table className="w-full text-sm">
                        <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
                            <tr>
                                <th scope="col" className="px-4 py-2.5 font-medium">{copy.colAction}</th>
                                <th scope="col" className="w-20 px-4 py-2.5 text-right font-medium">{copy.colXp}</th>
                                <th scope="col" className="hidden w-32 px-4 py-2.5 text-right font-medium sm:table-cell">{copy.colCap}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                            {CATALOG_RULES.map((rule) => (
                                <tr key={rule.key}>
                                    <td className="px-4 py-3">
                                        <p className="font-medium">{pickText(rule.label, locale)}</p>
                                        <p className="mt-0.5 text-xs text-muted-foreground">{pickText(rule.note, locale)}</p>
                                        <p className="mt-0.5 text-xs text-muted-foreground sm:hidden">
                                            {copy.colCap}: {rule.dailyCap ?? (rule.key === "register" ? copy.once : copy.none)}
                                        </p>
                                    </td>
                                    <td className="px-4 py-3 text-right font-semibold tabular-nums text-primary">+{rule.xp}</td>
                                    <td className="hidden px-4 py-3 text-right tabular-nums text-muted-foreground sm:table-cell">
                                        {rule.dailyCap ?? (rule.key === "register" ? copy.once : copy.none)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                    {copy.badgeXp}{" "}
                    {CATALOG_TIERS.map((tier, i) => `${pickText(tier.name, locale)} ${TIER_REWARDS[i]}`).join(", ")}.
                </p>
            </Section>

            <Section id="levels" icon={Layers} title={copy.levelsTitle} intro={copy.levelsIntro}>
                <ol className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
                    {CATALOG_LEVELS.map((level) => (
                        <li key={level.number} className="flex flex-col items-center rounded-2xl border border-border/50 bg-card/60 p-4 text-center">
                            <LevelEmblem level={level.number} size={64} label={t("gamification.levelAlt", { level: level.number })} />
                            <p className="mt-2 text-sm font-semibold">{t("gamification.levelLabel", { level: level.number })}</p>
                            <p className="text-xs text-muted-foreground">{pickText(level.name, locale)}</p>
                            <p className="mt-1 text-xs font-medium tabular-nums text-primary">{formatter.format(level.requiredXp)} XP</p>
                        </li>
                    ))}
                </ol>
            </Section>

            <Section id="badges" icon={Trophy} title={copy.badgesTitle} intro={copy.badgesIntro}>
                <FamilyCatalog />
            </Section>

            <Section id="leaderboard" icon={Gamepad2} title={copy.leaderboardTitle} intro={copy.leaderboardIntro}>
                <LeaderboardPanel />
            </Section>

            <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-border/50 bg-card/60 p-6">
                    <h2 className="flex items-center gap-2 text-lg font-bold">
                        <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                        {copy.fairTitle}
                    </h2>
                    <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                        {copy.fair.map((line) => (
                            <li key={line} className="flex gap-2">
                                <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                                <span>{line}</span>
                            </li>
                        ))}
                    </ul>
                </div>
                <div className="rounded-2xl border border-border/50 bg-card/60 p-6">
                    <h2 className="flex items-center gap-2 text-lg font-bold">
                        <HelpCircle className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                        {copy.faqTitle}
                    </h2>
                    <dl className="mt-3 space-y-3 text-sm">
                        {copy.faq.map((item) => (
                            <div key={item.q}>
                                <dt className="font-semibold">{item.q}</dt>
                                <dd className="mt-0.5 text-muted-foreground">{item.a}</dd>
                            </div>
                        ))}
                    </dl>
                </div>
            </div>
        </div>
    );
}

function HeroEmblems() {
    return (
        <div aria-hidden className="hidden items-end gap-1 md:flex">
            {[2, 4, 6, 7].map((level, i) => (
                <LevelEmblem key={level} level={level} size={44 + i * 8} />
            ))}
        </div>
    );
}

function Section({
    id,
    icon: Icon,
    title,
    intro,
    children,
}: {
    id: string;
    icon: ComponentType<{ className?: string }>;
    title: string;
    intro: string;
    children: ReactNode;
}) {
    return (
        <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-24">
            <h2 id={`${id}-title`} className="flex items-center gap-2 text-xl font-bold tracking-tight">
                <Icon className="h-5 w-5 text-primary" />
                {title}
            </h2>
            <p className="mt-1 mb-4 max-w-3xl text-sm text-muted-foreground">{intro}</p>
            {children}
        </section>
    );
}

function YourStatus({ copy }: { copy: (typeof COPY)[keyof typeof COPY] }) {
    const t = useI18n();
    const locale = useCurrentLocale();
    const { user } = useAuth();
    const username = user?.username;
    const { data: stats } = useQuery({
        queryKey: ["user-stats", username],
        queryFn: () => getUserStats(username!),
        enabled: !!username,
        staleTime: 3 * 60 * 1000,
    });

    if (!username || !stats || stats.currentLevel < 1) return null;
    const formatter = new Intl.NumberFormat(locale);
    const isMax = stats.isMaxLevel ?? stats.nextLevelXp <= stats.currentXp;
    const remaining = stats.remainingXp ?? Math.max(0, stats.nextLevelXp - stats.currentXp);

    return (
        <div className="flex flex-col gap-4 rounded-2xl border border-primary/20 bg-primary/5 p-5 sm:flex-row sm:items-center">
            <LevelEmblem level={stats.currentLevel} size={64} label={t("gamification.levelAlt", { level: stats.currentLevel })} />
            <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-muted-foreground">{copy.yourStatus}</p>
                <p className="text-lg font-bold">{t("gamification.levelTooltip", { level: stats.currentLevel, name: stats.levelName })}</p>
                <Progress
                    value={isMax ? 100 : Math.max(stats.progressPercentage, 2)}
                    aria-label={t("gamification.levelLabel", { level: stats.currentLevel })}
                    className="mt-2 h-2.5 bg-secondary/60"
                    indicatorClassName="bg-linear-to-r from-violet-600 via-purple-500 to-fuchsia-500"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                    {formatter.format(stats.currentXp)} XP ·{" "}
                    {isMax ? t("gamification.maxLevel") : t("gamification.xpToNext", { xp: formatter.format(remaining), level: stats.currentLevel + 1 })}
                    {stats.earnedAchievementCount !== undefined &&
                        ` · ${t("gamification.badgesEarned", { earned: stats.earnedAchievementCount, total: stats.totalAchievementCount ?? CATALOG_BADGES.length })}`}
                </p>
            </div>
            <Link
                href={buildLocalizedPathname(`/profiles/${username}`, locale)}
                className="inline-flex h-9 shrink-0 items-center justify-center rounded-md border border-border bg-background px-4 text-sm font-medium transition-colors hover:border-primary/40 hover:text-primary"
            >
                {copy.viewMyBadges}
            </Link>
        </div>
    );
}
