"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { getUserAchievements } from "@/api/gamification/gamification.api";
import { Button } from "@/core/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/core/components/ui/dialog";
import { Skeleton } from "@/core/components/ui/skeleton";
import { useI18n } from "@/core/contexts/locale-context";
import { useLocalizedHref } from "@/core/hooks/use-localized-href";
import { BadgeGrid } from "./badge-grid";

type AchievementsDialogProps = {
    username: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
};

/** Kullanicinin tum rozet katalogu: kazanilanlar, kilitliler ve her rozete ilerleme. */
export function AchievementsDialog({ username, open, onOpenChange }: AchievementsDialogProps) {
    const t = useI18n();
    const localizedHref = useLocalizedHref();
    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: ["user-achievements", username],
        queryFn: () => getUserAchievements(username),
        enabled: open,
        staleTime: 60 * 1000,
    });

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent size="xl" className="max-h-[88dvh] grid-rows-[auto_1fr] overflow-hidden p-0">
                <DialogHeader className="border-b border-border/50 px-6 pt-6 pb-4 text-left">
                    <DialogTitle className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                        {t("gamification.allBadgesTitle")}
                        {data && (
                            <span className="text-sm font-normal text-muted-foreground">
                                {t("gamification.badgesEarned", { earned: data.earnedCount, total: data.totalCount })}
                            </span>
                        )}
                    </DialogTitle>
                    <DialogDescription>
                        {t("gamification.allBadgesDescription")}{" "}
                        <Link href={localizedHref("/levels-and-badges")} className="font-medium text-primary hover:underline" onClick={() => onOpenChange(false)}>
                            {t("gamification.howItWorks")}
                        </Link>
                    </DialogDescription>
                </DialogHeader>
                <div className="min-h-0 overflow-y-auto px-6 pb-6">
                    {isLoading ? (
                        <div className="grid grid-cols-1 gap-2 pt-2 sm:grid-cols-2 lg:grid-cols-3">
                            {Array.from({ length: 9 }, (_, i) => (
                                <Skeleton key={i} className="h-[76px] rounded-xl" />
                            ))}
                        </div>
                    ) : isError || !data ? (
                        <div className="flex flex-col items-center gap-3 py-10 text-center">
                            <p className="text-sm text-muted-foreground">{t("gamification.loadError")}</p>
                            <Button variant="outline" size="sm" onClick={() => refetch()}>
                                {t("gamification.retry")}
                            </Button>
                        </div>
                    ) : (
                        <BadgeGrid className="pt-2" showLocks items={data.items} />
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
