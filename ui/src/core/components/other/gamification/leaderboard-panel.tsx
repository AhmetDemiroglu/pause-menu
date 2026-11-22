"use client";

import { useState } from "react";
import Link from "next/link";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Crown } from "lucide-react";
import { getLeaderboard } from "@/api/gamification/gamification.api";
import { LevelEmblem } from "@/core/components/base/achievement-badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/core/components/ui/avatar";
import { Button } from "@/core/components/ui/button";
import { Skeleton } from "@/core/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/core/components/ui/tabs";
import { useCurrentLocale, useI18n } from "@/core/contexts/locale-context";
import { useAuth } from "@core/hooks/use-auth";
import { getImageUrl } from "@/core/lib/get-image-url";
import { cn } from "@/core/lib/utils";
import { buildLocalizedPathname } from "@/i18n/config";
import type { LeaderboardPeriod } from "@/models/gamification/gamification.model";

const RANK_STYLES = ["bg-yellow-500 text-black", "bg-gray-300 text-black", "bg-amber-700 text-white"];

/** Liderlik tablosu: bu hafta / tum zamanlar, 50'lik sayfalar (en fazla 200 sira). */
export function LeaderboardPanel() {
    const t = useI18n();
    const locale = useCurrentLocale();
    const { user } = useAuth();
    const [period, setPeriod] = useState<LeaderboardPeriod>("week");
    const formatter = new Intl.NumberFormat(locale);

    const { data, isLoading, isError, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
        queryKey: ["leaderboard", period],
        queryFn: ({ pageParam }) => getLeaderboard(period, pageParam),
        initialPageParam: 1,
        getNextPageParam: (last) => (last.hasMore ? last.page + 1 : undefined),
        staleTime: 5 * 60 * 1000,
    });

    const rows = data?.pages.flatMap((p) => p.items) ?? [];

    return (
        <div className="rounded-2xl border border-border/50 bg-card/60 p-4 md:p-5">
            <Tabs value={period} onValueChange={(value) => setPeriod(value as LeaderboardPeriod)}>
                <TabsList>
                    <TabsTrigger value="week">{t("gamification.leaderboardWeek")}</TabsTrigger>
                    <TabsTrigger value="all">{t("gamification.leaderboardAll")}</TabsTrigger>
                </TabsList>
            </Tabs>

            <div className="mt-4">
                {isLoading ? (
                    <div className="space-y-2">
                        {Array.from({ length: 6 }, (_, i) => (
                            <Skeleton key={i} className="h-12 rounded-lg" />
                        ))}
                    </div>
                ) : isError ? (
                    <div className="flex flex-col items-center gap-3 py-8 text-center">
                        <p className="text-sm text-muted-foreground">{t("gamification.loadError")}</p>
                        <Button variant="outline" size="sm" onClick={() => refetch()}>
                            {t("gamification.retry")}
                        </Button>
                    </div>
                ) : rows.length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">{t("gamification.leaderboardEmpty")}</p>
                ) : (
                    <ol className="space-y-1">
                        {rows.map((row) => {
                            const isMe = user?.username === row.username;
                            return (
                                <li key={row.userId}>
                                    <Link
                                        href={buildLocalizedPathname(`/profiles/${row.username}`, locale)}
                                        className={cn(
                                            "group flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                                            isMe && "bg-primary/5 ring-1 ring-primary/20",
                                        )}
                                    >
                                        <span
                                            className={cn(
                                                "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold tabular-nums",
                                                RANK_STYLES[row.rank - 1] ?? "bg-muted text-muted-foreground",
                                            )}
                                        >
                                            {row.rank === 1 ? <Crown className="h-3 w-3" aria-label="1" /> : row.rank}
                                        </span>
                                        <Avatar className="h-8 w-8 border border-border transition-colors group-hover:border-primary">
                                            <AvatarImage src={getImageUrl(row.profileImageUrl) || ""} size={48} alt={row.username} className="object-cover" />
                                            <AvatarFallback className="text-[10px]">{row.username.substring(0, 2).toUpperCase()}</AvatarFallback>
                                        </Avatar>
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-semibold transition-colors group-hover:text-primary">
                                                {row.username}
                                                {isMe && <span className="ml-1.5 text-[10px] font-medium text-primary">{t("gamification.leaderboardYou")}</span>}
                                            </p>
                                            <p className="truncate text-[11px] text-muted-foreground">
                                                {t("gamification.levelTooltip", { level: row.level, name: row.levelName })}
                                            </p>
                                        </div>
                                        <LevelEmblem level={row.level} size={24} />
                                        <span className="w-16 shrink-0 text-right text-xs font-semibold tabular-nums">{formatter.format(row.xp)} XP</span>
                                    </Link>
                                </li>
                            );
                        })}
                    </ol>
                )}

                {hasNextPage && (
                    <Button variant="ghost" size="sm" className="mt-2 w-full" disabled={isFetchingNextPage} onClick={() => fetchNextPage()}>
                        {t("gamification.seeAll")}
                    </Button>
                )}
            </div>
        </div>
    );
}
