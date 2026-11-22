"use client";

import { useId, useMemo } from "react";
import { findBadge } from "@/core/gamification/catalog";
import { renderBadgeSvg, renderLevelSvg } from "@/core/gamification/badge-art";
import { cn } from "@/core/lib/utils";

type AchievementBadgeProps = {
    /** Rozet kodu (Gamification 2.0). Eski API yanitlarinda yoksa legacyTitle'dan eslenir. */
    code?: string | null;
    legacyTitle?: string | null;
    /** Ekran okuyucu adi. Bos verilirse rozet dekoratif sayilir. */
    label?: string;
    locked?: boolean;
    size?: number;
    className?: string;
};

/**
 * Rozet: catalog + badge-art'tan satir ici SVG. Statik dosya yerine satir ici cizim, kilitli
 * hali ve boyutu ayni kaynaktan uretir. Ayni sayfada onlarca rozet oldugu icin gradyan id'leri
 * useId ile benzersizlesir. Bilinmeyen kod bile bos kalmaz (genel yildiz rozeti).
 */
export function AchievementBadge({ code, legacyTitle, label, locked, size = 48, className }: AchievementBadgeProps) {
    const reactId = useId();
    const badge = findBadge(code, legacyTitle);
    const svg = useMemo(() => {
        const idPrefix = `ab${reactId.replace(/[^a-zA-Z0-9]/g, "")}`;
        return badge
            ? renderBadgeSvg(badge, { locked, idPrefix })
            : renderBadgeSvg({ family: "unknown", category: "special", tier: 0, threshold: 0 }, { locked, idPrefix });
    }, [badge, locked, reactId]);

    return (
        <span
            role={label ? "img" : undefined}
            aria-label={label}
            aria-hidden={label ? undefined : true}
            className={cn("inline-block shrink-0 [&>svg]:h-full [&>svg]:w-full", className)}
            style={{ width: size, height: size }}
            dangerouslySetInnerHTML={{ __html: svg }}
        />
    );
}

type LevelEmblemProps = {
    level: number;
    label?: string;
    size?: number;
    className?: string;
};

/** Seviye amblemi (1-7): profil basligi, liderlik ve seviye merdiveni. */
export function LevelEmblem({ level, label, size = 32, className }: LevelEmblemProps) {
    const reactId = useId();
    const svg = useMemo(
        () => renderLevelSvg(level, { idPrefix: `lv${reactId.replace(/[^a-zA-Z0-9]/g, "")}` }),
        [level, reactId],
    );

    return (
        <span
            role={label ? "img" : undefined}
            aria-label={label}
            aria-hidden={label ? undefined : true}
            className={cn("inline-block shrink-0 [&>svg]:h-full [&>svg]:w-full", className)}
            style={{ width: size, height: size }}
            dangerouslySetInnerHTML={{ __html: svg }}
        />
    );
}
