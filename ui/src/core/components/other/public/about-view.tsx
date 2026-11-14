"use client";

import { Gamepad2, Users, Share2, Sparkles, Compass, ListChecks, Bot } from "lucide-react";
import { BrandScriptLogo } from "@core/components/base/brand-script-logo";
import { The_Girl_Next_Door } from "next/font/google";
import { useI18n } from "@/core/contexts/locale-context";

// latin-ext sart: yoksa Turkce ı/İ/ş/ğ glifleri yedek fonttan gelip bozuk gorunuyor.
const font = The_Girl_Next_Door({
    subsets: ["latin", "latin-ext"],
    weight: ["400"],
    display: "swap",
    preload: false,
});

export function AboutView() {
    const t = useI18n();

    return (
        <div className="w-full h-full p-5">
            <div className="space-y-6">
                <section className="relative overflow-hidden rounded-3xl bg-[#FFF6EE] px-6 py-10 text-center ring-1 ring-black/5 md:px-12 md:py-14 dark:bg-[#14101F] dark:ring-white/10">
                    <div aria-hidden className="pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full bg-[#FF2E88]/20 blur-3xl" />
                    <div aria-hidden className="pointer-events-none absolute -bottom-28 -right-16 h-96 w-96 rounded-full bg-[#FF8A1F]/20 blur-3xl" />
                    <div aria-hidden className="pointer-events-none absolute bottom-0 left-1/3 h-56 w-56 rounded-full bg-[#7A1FD0]/10 blur-3xl dark:bg-[#5B0FB0]/30" />
                    <div className="relative z-10 flex flex-col items-center gap-5">
                        <span className="inline-flex items-center gap-2 rounded-full bg-white/70 px-4 py-1.5 text-xs font-medium text-[#14101F]/70 ring-1 ring-black/10 dark:bg-white/10 dark:text-white/70 dark:ring-white/15">
                            <Gamepad2 className="h-4 w-4 text-[#FF2E88]" />
                            {t("about.badge")}
                        </span>
                        <BrandScriptLogo priority className="h-16 md:h-20" />
                        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#FF2E88]">{t("footer.tagline")}</p>
                        <h1 className="text-2xl font-bold tracking-tight text-[#14101F] md:text-3xl dark:text-white">{t("about.title")}</h1>
                        <p className={`${font.className} max-w-2xl text-lg leading-relaxed text-[#14101F]/75 md:text-2xl dark:text-white/80`}>{t("about.subtitle")}</p>
                    </div>
                </section>

                <div className="grid gap-5 md:grid-cols-3">
                    <div className="rounded-2xl border border-border/40 bg-background/30 p-5 flex flex-col gap-2">
                        <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-1">
                            <Compass className="h-4 w-4" />
                        </div>
                        <h2 className="text-sm font-semibold tracking-tight">{t("about.discoverTitle")}</h2>
                        <p className="text-xs text-muted-foreground leading-relaxed">{t("about.discoverDescription")}</p>
                    </div>
                    <div className="rounded-2xl border border-border/40 bg-background/30 p-5 flex flex-col gap-2">
                        <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-1">
                            <ListChecks className="h-4 w-4" />
                        </div>
                        <h2 className="text-sm font-semibold tracking-tight">{t("about.listTitle")}</h2>
                        <p className="text-xs text-muted-foreground leading-relaxed">{t("about.listDescription")}</p>
                    </div>
                    <div className="rounded-2xl border border-border/40 bg-background/30 p-5 flex flex-col gap-2">
                        <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-1">
                            <Users className="h-4 w-4" />
                        </div>
                        <h2 className="text-sm font-semibold tracking-tight">{t("about.connectTitle")}</h2>
                        <p className="text-xs text-muted-foreground leading-relaxed">{t("about.connectDescription")}</p>
                    </div>
                </div>

                <div className="rounded-2xl border border-border/40 bg-background/40 p-5 space-y-5">
                    <h2 className="text-base md:text-lg font-semibold tracking-tight flex items-center gap-2">
                        {t("about.whyTitle")}
                        <Sparkles className="h-4 w-4 text-primary" />
                    </h2>
                    <p className="text-sm text-muted-foreground leading-relaxed">{t("about.whyDescription")}</p>
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="flex gap-3 items-start">
                            <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center mt-0.5">
                                <Share2 className="h-4 w-4" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-sm font-semibold">{t("about.socialTitle")}</h3>
                                <p className="text-xs text-muted-foreground leading-relaxed">{t("about.socialDescription")}</p>
                            </div>
                        </div>
                        <div className="flex gap-3 items-start">
                            <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center mt-0.5">
                                <Gamepad2 className="h-4 w-4" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-sm font-semibold">{t("about.profileTitle")}</h3>
                                <p className="text-xs text-muted-foreground leading-relaxed">{t("about.profileDescription")}</p>
                            </div>
                        </div>
                        <div className="flex gap-3 items-start">
                            <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center mt-0.5">
                                <Users className="h-4 w-4" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-sm font-semibold">{t("about.similarPlayersTitle")}</h3>
                                <p className="text-xs text-muted-foreground leading-relaxed">{t("about.similarPlayersDescription")}</p>
                            </div>
                        </div>
                        <div className="flex gap-3 items-start">
                            <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center mt-0.5">
                                <Compass className="h-4 w-4" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-sm font-semibold">{t("about.explorationTitle")}</h3>
                                <p className="text-xs text-muted-foreground leading-relaxed">{t("about.explorationDescription")}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="rounded-2xl border border-border/40 bg-background/20 p-5 space-y-5">
                    <h2 className="text-base md:text-lg font-semibold tracking-tight">{t("about.howTitle")}</h2>
                    <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
                        <div className="flex-1 rounded-xl bg-muted/5 border border-border/30 p-4 space-y-1">
                            <p className="text-xs uppercase tracking-wide text-muted-foreground/70">{t("about.step1Label")}</p>
                            <p className="text-sm font-semibold">{t("about.step1Title")}</p>
                            <p className="text-xs text-muted-foreground leading-relaxed">{t("about.step1Description")}</p>
                        </div>
                        <div className="hidden md:flex h-10 w-10 rounded-full border border-border/40 items-center justify-center text-muted-foreground/70 shrink-0">→</div>
                        <div className="flex-1 rounded-xl bg-muted/5 border border-border/30 p-4 space-y-1">
                            <p className="text-xs uppercase tracking-wide text-muted-foreground/70">{t("about.step2Label")}</p>
                            <p className="text-sm font-semibold">{t("about.step2Title")}</p>
                            <p className="text-xs text-muted-foreground leading-relaxed">{t("about.step2Description")}</p>
                        </div>
                        <div className="hidden md:flex h-10 w-10 rounded-full border border-border/40 items-center justify-center text-muted-foreground/70 shrink-0">→</div>
                        <div className="flex-1 rounded-xl bg-muted/5 border border-border/30 p-4 space-y-1">
                            <p className="text-xs uppercase tracking-wide text-muted-foreground/70">{t("about.step3Label")}</p>
                            <p className="text-sm font-semibold">{t("about.step3Title")}</p>
                            <p className="text-xs text-muted-foreground leading-relaxed">{t("about.step3Description")}</p>
                        </div>
                    </div>
                </div>

                <div className="rounded-2xl border border-violet-500/30 bg-violet-500/5 p-5 space-y-2">
                    <h2 className="text-base md:text-lg font-semibold tracking-tight flex items-center gap-2">
                        <Bot className="h-4 w-4 text-violet-500" />
                        {t("about.aiTitle")}
                    </h2>
                    <p className="text-sm text-muted-foreground leading-relaxed">{t("about.aiDescription")}</p>
                </div>
            </div>
        </div>
    );
}
