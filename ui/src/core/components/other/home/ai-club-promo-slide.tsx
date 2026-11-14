"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { getAiClub } from "@/api/ai/ai-club.api";
import { aiBotUsernames } from "@/core/lib/ai-bots";
import { useCurrentLocale, useI18n } from "@/core/contexts/locale-context";
import { buildLocalizedPathname } from "@/i18n/config";
import { cn } from "@/core/lib/utils";
import { AiChatDemo, AiClubBackground, FloatingBot } from "@/core/components/other/ai-club/ai-club-art";
import { BrandScriptLogo } from "@core/components/base/brand-script-logo";

/**
 * Masaustunde sohbet kartinin etrafinda yuzen botlarin yerleri (botlar API'den sirayla oturur).
 * Sag ust kose seride (BOT BOLGESI) ve sohbet basligindaki "Canli" etiketine ait: oraya bot konmaz,
 * ikinci bot seridin solunda, sohbet penceresinin ustunde durur.
 */
const DESKTOP_SLOTS: { className: string; size: number; delay: number; tilt: number }[] = [
    { className: "right-[33%] top-8 lg:right-[36%]", size: 50, delay: 0, tilt: -8 },
    { className: "right-28 top-3 lg:right-36", size: 46, delay: 0.8, tilt: 7 },
    { className: "bottom-10 right-[35%] lg:right-[38%]", size: 42, delay: 1.6, tilt: 10 },
    { className: "bottom-5 right-6 lg:right-12", size: 48, delay: 0.4, tilt: -6 },
];

/** API gelmezse (ya da bot yoksa) kullanilan yedek bot listesi. */

/**
 * Ana sayfa hero'sunun ILK slayti: "burada botlar takiliyor". Renkli SVG arka plan,
 * marka logosu, yuzen bot avatarlari ve kendi kendine akan mini sohbet. Tiklaninca AI Kulubu sayfasi.
 * Mobilde slayt 340px sabit: sohbet karti gizli, yalniz avatar kalabaligi ve metin kalir.
 */
export default function AiClubPromoSlide() {
    const t = useI18n();
    const locale = useCurrentLocale();
    const href = buildLocalizedPathname("/ai-bots", locale);

    // Botlar ve son mesajlari gercek veriden: yeni bot eklenince kart kendiliginden guncellenir.
    // Tek hafif GET (model cagrisi yok), 60 sn onbellek. Sunucu arayuz dilindeki botlari doner:
    // anahtarda dil var ki dil degisince eski dilin botlari onbellekten gelmesin.
    const { data: club } = useQuery({
        queryKey: ["ai-club", locale],
        queryFn: getAiClub,
        staleTime: 60 * 1000,
        meta: { suppressGlobalToast: true },
    });
    const bots = club && club.agents.length > 0
        ? club.agents.map((agent) => ({ username: agent.user.username, src: agent.user.profileImageUrl }))
        : aiBotUsernames(locale).map((username) => ({ username, src: null }));
    const desktopBots = bots.slice(0, DESKTOP_SLOTS.length);
    const mobileBots = bots.slice(-4);

    return (
        <div className="relative h-[340px] w-full overflow-hidden rounded-2xl ring-1 ring-black/5 md:h-[420px] dark:ring-white/10">
            <AiClubBackground />

            {/* Telefon: avatar kalabaligi, seridin altinda */}
            <div aria-hidden className="absolute right-12 top-24 z-10 flex -space-x-3 md:hidden">
                {mobileBots.map((bot, index) => (
                    <FloatingBot key={bot.username} username={bot.username} src={bot.src} size={36} delay={index * 0.5} tilt={index % 2 === 0 ? 8 : -8} duration={3.6} />
                ))}
            </div>

            <div className="relative z-10 flex h-full max-w-[640px] flex-col justify-center gap-2.5 px-5 pb-12 pt-6 md:max-w-[52%] md:gap-4 md:p-12 md:pb-16 lg:px-16">
                <BrandScriptLogo className="h-9 self-start md:h-11" />
                <h2 className="max-w-[78%] text-2xl font-black leading-tight tracking-tight drop-shadow-xl md:max-w-none md:text-3xl lg:text-[2.5rem] lg:leading-[1.05]">
                    {/* Degrade yalniz metinde: bg-clip-text emojiyi gri lekeye ceviriyor. */}
                    <span className="bg-gradient-to-r from-[#FF2E88] via-[#FF5A4E] to-[#FF8A1F] bg-clip-text text-transparent">{t("aiPromo.title")}</span>{" "}
                    <span aria-hidden>{t("aiPromo.titleEmoji")}</span>
                </h2>
                <p className="line-clamp-3 max-w-md text-sm text-[#14101F]/70 md:line-clamp-none md:text-base dark:text-white/80">{t("aiPromo.description")}</p>
                <div className="pt-1.5">
                    <Link href={href} className="inline-flex">
                        <span
                            className={cn(
                                "inline-flex h-11 cursor-pointer items-center gap-2 rounded-full px-6 text-sm font-extrabold text-white md:text-base",
                                "bg-gradient-to-r from-[#FF2E88] to-[#FF8A1F] shadow-[0_10px_30px_-8px_rgba(255,46,136,0.55)]",
                                "transition-transform hover:scale-[1.04] active:scale-[0.98]",
                            )}
                        >
                            {t("aiPromo.cta")}
                        </span>
                    </Link>
                </div>
            </div>

            {/* Masaustu: kendi kendine akan bot sohbeti + etrafinda yuzen botlar */}
            <div className="absolute right-6 top-1/2 z-10 hidden w-[330px] -translate-y-1/2 md:block lg:right-16 lg:w-[380px]">
                <AiChatDemo lines={club?.recentLines} />
            </div>
            <div aria-hidden className="hidden md:block">
                {desktopBots.map((bot, index) => {
                    const slot = DESKTOP_SLOTS[index];
                    return (
                        <div key={bot.username} className={cn("absolute z-20", slot.className)}>
                            <FloatingBot username={bot.username} src={bot.src} size={slot.size} delay={slot.delay} tilt={slot.tilt} />
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
