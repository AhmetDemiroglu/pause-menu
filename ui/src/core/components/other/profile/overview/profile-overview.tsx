"use client";

import dynamic from "next/dynamic";
import { useQuery } from "@tanstack/react-query";
import { getUserStats } from "@/api/stats/stats.api";
import { getUserActivityFeed } from "@/api/activity/activity.api";
import ActivityFeed from "./activity-feed";
import { Skeleton } from "@/core/components/ui/skeleton";

const GamerDNAChart = dynamic(() => import("./gamer-dna-chart"), {
    loading: () => <Skeleton className="h-[300px] w-full rounded-xl" />,
    ssr: false,
});
import { Loader2, TrendingUp, Users, List, Star } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card";
import TopFiveGames from "./top-five-games";
import { useI18n } from "@/core/contexts/locale-context";
import { BadgeShowcase } from "@/core/components/other/gamification/badge-showcase";

interface ProfileOverviewProps {
    username: string;
}

export default function ProfileOverview({ username }: ProfileOverviewProps) {
    const t = useI18n();
    const { data: stats, isLoading: statsLoading } = useQuery({
        queryKey: ["user-stats", username],
        queryFn: () => getUserStats(username),
        staleTime: 3 * 60 * 1000,
    });

    const { data: activities, isLoading: activityLoading } = useQuery({
        queryKey: ["user-activity", username],
        queryFn: () => getUserActivityFeed(username),
        staleTime: 2 * 60 * 1000,
    });

    if (statsLoading || activityLoading) {
        return (
            <div className="flex justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!stats) return null;

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 animate-in fade-in-50 duration-500">
            <div className="md:col-span-1 space-y-3">
                <div className="h-[300px]">
                    <GamerDNAChart data={stats.gamerDna} username={username} />
                </div>

                <BadgeShowcase username={username} stats={stats} />

                <div className="grid grid-cols-2 gap-3">
                    <Card className="bg-primary/5 border-primary/10">
                        <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                            <Star className="h-5 w-5 text-primary mb-1" />
                            <span className="text-2xl font-bold">{stats.totalReviews}</span>
                            <span className="text-xs text-muted-foreground">{t("profileOverview.reviews")}</span>
                        </CardContent>
                    </Card>
                    <Card className="bg-pink-500/5 border-pink-500/10">
                        <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                            <List className="h-5 w-5 text-pink-500 mb-1" />
                            <span className="text-2xl font-bold">{stats.totalGamesListed}</span>
                            <span className="text-xs text-muted-foreground">{t("profileOverview.listed")}</span>
                        </CardContent>
                    </Card>
                    <Card className="bg-purple-500/5 border-purple-500/10 col-span-2">
                        <CardContent className="p-4 flex flex-row items-center justify-between">
                            <div className="flex flex-col">
                                <span className="text-2xl font-bold">{stats.totalFollowers}</span>
                                <span className="text-xs text-muted-foreground">{t("profileOverview.followers")}</span>
                            </div>
                            <Users className="h-8 w-8 text-purple-500/50" />
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* flex-1: kart kalan yuksekligi doldurur. Eskiden h-full idi; ustte Favori 5 karti
                varken sutun yuksekligine ek olarak onun boyu kadar tasip alttaki icerigin ustune biniyordu. */}
            <div className="flex flex-col gap-3 md:col-span-2">
                <TopFiveGames username={username} />

                {/* Baslik Favori Oyunlar kartiyla ayni: px-4 ve ikon kutusu. Eskiden px-0 idi, ikon kart cizgisine yapisiyordu. */}
                <Card className="flex-1 border-border/50 bg-card shadow-sm">
                    <CardHeader className="px-4 pt-0 pb-0.5">
                        <CardTitle className="flex items-center gap-2 text-sm font-bold">
                            <div className="rounded-md bg-green-500/10 p-1.5">
                                <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-500" />
                            </div>
                            {t("profileOverview.recentActivities")}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="px-4">
                        <ActivityFeed activities={activities || []} />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
