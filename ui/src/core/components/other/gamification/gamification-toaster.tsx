"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Award, ChevronsUp } from "lucide-react";
import { Confetti } from "@/core/components/other/birthday/confetti";
import { useAuth } from "@core/hooks/use-auth";
import { useI18n } from "@/core/contexts/locale-context";
import { useLocalizedHref } from "@/core/hooks/use-localized-href";
import { NotificationType, type NotificationDto } from "@/models/notifications/notification.model";
import { GAMIFICATION_EVENT } from "./gamification-events";

/**
 * Rozet ve seviye kutlamasi: SignalR bildirimi gelince kisa konfeti + toast, ve kullanicinin
 * istatistik / rozet onbellegini tazeler. Konfeti prefers-reduced-motion altinda cizilmez (globals.css).
 */
export function GamificationToaster() {
    const t = useI18n();
    const router = useRouter();
    const localizedHref = useLocalizedHref();
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const [celebrating, setCelebrating] = useState(0);

    useEffect(() => {
        const onEvent = (event: Event) => {
            const notification = (event as CustomEvent<NotificationDto>).detail;
            if (!notification) return;
            const isLevel = notification.type === NotificationType.LevelUp;

            if (user?.username) {
                queryClient.invalidateQueries({ queryKey: ["user-stats", user.username] });
                queryClient.invalidateQueries({ queryKey: ["user-achievements", user.username] });
            }

            setCelebrating((n) => n + 1);
            const Icon = isLevel ? ChevronsUp : Award;
            toast(isLevel ? t("gamification.levelUpToast") : t("gamification.unlockedToast"), {
                description: notification.message,
                icon: <Icon className={isLevel ? "h-5 w-5 text-violet-500" : "h-5 w-5 text-amber-500"} />,
                duration: 6000,
                action: notification.link
                    ? { label: t("gamification.viewCollection"), onClick: () => router.push(localizedHref(notification.link!)) }
                    : undefined,
            });
        };

        window.addEventListener(GAMIFICATION_EVENT, onEvent);
        return () => window.removeEventListener(GAMIFICATION_EVENT, onEvent);
    }, [t, router, localizedHref, queryClient, user?.username]);

    useEffect(() => {
        if (!celebrating) return;
        const timer = window.setTimeout(() => setCelebrating(0), 5000);
        return () => window.clearTimeout(timer);
    }, [celebrating]);

    return celebrating ? <Confetti key={celebrating} /> : null;
}
