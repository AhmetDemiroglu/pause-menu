"use client";

import { Gamepad2, ListChecks, Star, Users, MessageCircle, Trophy } from "lucide-react";
import { AppDownloadCTA } from "@core/components/other/public/app-cta";
import { useCurrentLocale } from "@/core/contexts/locale-context";
import { BrandScriptLogo } from "@core/components/base/brand-script-logo";

const ICONS = [Gamepad2, ListChecks, Star, Users, MessageCircle, Trophy];
const COLORS = ["text-orange-600 dark:text-orange-400", "text-violet-600 dark:text-violet-400", "text-amber-600 dark:text-amber-400", "text-pink-600 dark:text-pink-400", "text-emerald-600 dark:text-emerald-400", "text-fuchsia-600 dark:text-fuchsia-400"];

const COPY = {
    "en-US": {
        badge: "Early access",
        titleLine: "Press pause. Find your people.",
        subtitle: "A social platform for gamers. Discover games, build lists, rate, and follow the community. All in one place.",
        footer: "© 2026 Pause Menu. Built for gamers.",
        features: [
            { title: "Discover games", desc: "Filter thousands of titles, dive into details, and see trends and similar games." },
            { title: "Build lists", desc: "Create your own collections and share them; follow other players' lists." },
            { title: "Rate and review", desc: "Score the games you play, write reviews, and see what the community thinks." },
            { title: "Follow the community", desc: "Follow players, watch your feed, and build your profile." },
            { title: "Message players", desc: "Connect directly with other gamers." },
            { title: "Level up", desc: "Earn XP, climb levels, and shape your Gamer DNA." },
        ],
    },
    tr: {
        badge: "Erken erişim",
        titleLine: "Mola ver. Ekibini bul.",
        subtitle: "Oyuncular için sosyal platform. Oyun keşfet, listeler oluştur, puanla ve topluluğu takip et. Hepsi tek yerde.",
        footer: "© 2026 Pause Menu. Oyuncular için üretildi.",
        features: [
            { title: "Oyun keşfet", desc: "Binlerce oyunu filtrele, detaylarına in, trendleri ve benzer oyunları gör." },
            { title: "Listeler oluştur", desc: "Kendi koleksiyonlarını yap, paylaş; başkalarının listelerini takip et." },
            { title: "Puanla ve incele", desc: "Oynadığın oyunları puanla, yorum yaz, topluluğun ne dediğini gör." },
            { title: "Topluluğu takip et", desc: "Oyuncuları takip et, akışını izle, profilini oluştur." },
            { title: "Mesajlaş", desc: "Diğer oyuncularla doğrudan mesajlaşarak bağlan." },
            { title: "İlerle ve kazan", desc: "XP topla, seviye atla, oyuncu kimliğini (Gamer DNA) oluştur." },
        ],
    },
} as const;

export function MarketingView() {
    const locale = useCurrentLocale();
    const t = COPY[locale] ?? COPY["en-US"];

    return (
        <div className="relative w-full p-5">
            {/* Hero */}
            <section className="relative overflow-hidden rounded-3xl bg-[#FFF6EE] px-6 py-16 text-center ring-1 ring-black/5 md:py-20 dark:bg-[#14101F] dark:ring-white/10">
                <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,46,136,0.18),_transparent_55%),radial-gradient(circle_at_bottom_right,_rgba(255,138,31,0.2),_transparent_60%)]"
                />
                <div className="relative flex flex-col items-center">
                    <h1 className="mt-6">
                        <span className="sr-only">Pause Menu</span>
                        <BrandScriptLogo priority className="mx-auto h-16 md:h-24" />
                    </h1>
                    <p className="mt-6 text-balance text-2xl font-extrabold tracking-tight text-[#14101F] md:text-4xl dark:text-white">{t.titleLine}</p>
                    <p className="mx-auto mt-5 max-w-2xl text-pretty text-base text-[#14101F]/70 md:text-lg dark:text-white/70">{t.subtitle}</p>
                </div>
            </section>

            {/* Features */}
            <section className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {t.features.map((f, i) => {
                    const Icon = ICONS[i];
                    return (
                        <div key={f.title} className="group rounded-2xl border border-border/50 bg-card/60 p-6 transition-colors hover:border-border">
                            <div className={`inline-flex h-11 w-11 items-center justify-center rounded-xl bg-secondary/50 ${COLORS[i]}`}>
                                <Icon className="h-5 w-5" />
                            </div>
                            <h3 className="mt-4 text-base font-semibold tracking-tight">{f.title}</h3>
                            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
                        </div>
                    );
                })}
            </section>

            <AppDownloadCTA />

            <p className="mt-8 text-center text-xs text-muted-foreground/60">{t.footer}</p>
        </div>
    );
}
