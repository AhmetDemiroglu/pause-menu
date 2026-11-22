import type { ReactNode } from "react";
import { BrandScriptLogo } from "@core/components/base/brand-script-logo";
import { cn } from "@/core/lib/utils";

/**
 * Icerik sayfalarinin sinematik baslik bandi (Oyun Gundemi, Oyun Haberleri). Koyu zemin, izgara dokusu,
 * iki renkli isik. Renk tonu sayfaya gore degisir, yapi ve olculer ayni kalir.
 */
const ACCENTS = {
    /** Oyun Gundemi (varsayilan): amber -> gul. */
    amber: {
        gradient: "from-amber-500/15 via-[#0D0915] to-rose-600/20",
        glowA: "bg-amber-500/10",
        glowB: "bg-rose-600/15",
    },
    /** Oyun Haberleri: gok mavisi -> fusya. */
    sky: {
        gradient: "from-sky-500/15 via-[#0D0915] to-fuchsia-600/20",
        glowA: "bg-sky-500/10",
        glowB: "bg-fuchsia-600/15",
    },
} as const;

export type PageHeroAccent = keyof typeof ACCENTS;

type PageHeroProps = {
    title: string;
    subtitle: string;
    accent?: PageHeroAccent;
    /** Baslik altindaki kucuk sayac satiri. */
    meta?: ReactNode;
    /** Sagdaki kontroller (arama, secimler). */
    actions?: ReactNode;
    className?: string;
};

export function PageHero({ title, subtitle, accent = "amber", meta, actions, className }: PageHeroProps) {
    const tone = ACCENTS[accent];

    return (
        <div className={cn("relative overflow-hidden rounded-2xl bg-[#0D0915] ring-1 ring-white/10", className)}>
            <div className={cn("absolute inset-0 bg-gradient-to-br", tone.gradient)} />
            <div
                aria-hidden
                className="absolute inset-0 opacity-[0.35]"
                style={{
                    backgroundImage:
                        "linear-gradient(rgba(255,255,255,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.045) 1px, transparent 1px)",
                    backgroundSize: "56px 56px",
                    maskImage: "radial-gradient(ellipse 90% 70% at 30% 40%, black 30%, transparent 75%)",
                }}
            />
            <div aria-hidden className={cn("pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full blur-3xl", tone.glowA)} />
            <div aria-hidden className={cn("pointer-events-none absolute -bottom-24 right-1/4 h-80 w-80 rounded-full blur-3xl", tone.glowB)} />

            <div className="relative flex flex-col gap-5 p-6 md:flex-row md:items-end md:justify-between md:p-8">
                <div className="space-y-2">
                    <BrandScriptLogo tone="dark" className="h-9 md:h-10" />
                    <h1 className="text-3xl font-black tracking-tight text-white md:text-4xl">{title}</h1>
                    <p className="max-w-2xl text-sm text-white/60">{subtitle}</p>
                    {meta ? <div className="flex flex-wrap items-center gap-3 pt-1 text-xs font-semibold">{meta}</div> : null}
                </div>
                {actions}
            </div>
        </div>
    );
}
