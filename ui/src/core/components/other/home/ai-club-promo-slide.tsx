"use client";

import Link from "next/link";
import { MessagesSquare } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getAiClub } from "@/api/ai/ai-club.api";
import { aiBotUsernames } from "@/core/lib/ai-bots";
import { useCurrentLocale, useI18n } from "@/core/contexts/locale-context";
import { buildLocalizedPathname } from "@/i18n/config";
import { cn } from "@/core/lib/utils";
import { displayFont } from "@/core/assets/fonts/display-font";
import { Button } from "@/core/components/ui/button";
import { AiChatDemo, FloatingBot } from "@/core/components/other/ai-club/ai-club-art";
import { BrandScriptLogo } from "@core/components/base/brand-script-logo";
import { PromoSlideBackdrop } from "./promo-slide-backdrop";

/**
 * Masaustunde sohbet kartinin etrafinda yuzen botlarin yerleri (botlar API'den sirayla oturur).
 * Sag alt koseye bot konmaz: oradaki karusel oklariyla ust uste biniyordu.
 */
const DESKTOP_SLOTS: { className: string; size: number; delay: number; tilt: number }[] = [
    { className: "right-[33%] top-2 lg:right-[36%]", size: 50, delay: 0, tilt: -8 },
    { className: "right-28 top-3 lg:right-36", size: 46, delay: 0.8, tilt: 7 },
    { className: "bottom-10 right-[35%] lg:right-[38%]", size: 42, delay: 1.6, tilt: 10 },
];

/**
 * Ana sayfa hero'sunun ILK slayti: "burada botlar takiliyor". Diger tanitim slaytlariyla ayni
 * sade zemin, marka fontunda (Anton) baslik, yuzen bot avatarlari ve kendi kendine akan mini
 * sohbet. Tiklaninca AI Kulubu sayfasi. Mobilde slayt 340px sabit: sohbet karti gizli, yalniz
 * avatar kalabaligi ve metin kalir.
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
        <div className="@container relative h-[340px] w-full overflow-hidden rounded-2xl bg-[#FFF6EE] ring-1 ring-black/5 md:h-[420px] dark:bg-[#14101F] dark:ring-white/10">
            <PromoSlideBackdrop tone="bots" />

            {/* Telefon ve dar slayt: sohbet karti yerine avatar kalabaligi, logonun saginda */}
            <div aria-hidden className="absolute right-5 top-6 z-10 flex -space-x-3 md:@min-[44rem]:hidden">
                {mobileBots.map((bot, index) => (
                    <FloatingBot key={bot.username} username={bot.username} src={bot.src} size={36} delay={index * 0.5} tilt={index % 2 === 0 ? 8 : -8} duration={3.6} />
                ))}
            </div>

            {/* Metin ve sohbet karti yan yana akar (diger tanitim slaytlariyla ayni duzen): metin kalan
                genislikte sarilir, sohbet kartina girmez. Sohbet karti 44rem'den dar slaytta gizli. */}
            <div className="relative z-10 flex h-full items-center">
            <div className="flex h-full min-w-0 max-w-[640px] flex-1 flex-col justify-center gap-2.5 px-5 pb-12 pt-6 md:max-w-none md:gap-4 md:py-12 md:pb-16 md:pl-12 md:pr-8 lg:pl-16">
                <BrandScriptLogo className="h-9 self-start md:h-11" />
                {/* Satir araligi genis ve etiketin dikey payi var: Turkce buyuk harf noktasi/cengeli
                    ve egik etiket ust satirin harflerine degmesin. Boyut slayt genisligine bagli
                    (cqw): etiket tek satirda kalsin, dar slaytta bile metin sutununu asmasin. */}
                <h2
                    className={cn(
                        displayFont.className,
                        "text-[1.4rem] leading-[1.18] text-[#14101F] md:text-[clamp(1.3rem,3.3cqw,2.35rem)] md:leading-[1.3] dark:text-white",
                    )}
                >
                    {t("aiPromo.titleLead")}{" "}
                    <span className="my-0.5 inline-block -rotate-2 md:my-1 rounded-[0.35em] bg-[#FF2E88] px-[0.3em] pb-[0.08em] text-white shadow-[0.12em_0.14em_0_0_#14101F] dark:shadow-[0.12em_0.14em_0_0_#000]">
                        {t("aiPromo.titleHighlight")}
                    </span>
                </h2>
                <p className="line-clamp-3 max-w-md text-sm text-[#14101F]/65 md:line-clamp-none md:text-base dark:text-white/65">{t("aiPromo.description")}</p>
                <div className="pt-1.5">
                    <Link href={href} className="inline-flex">
                        <Button size="lg" className="text-md cursor-pointer gap-2 font-semibold shadow-[0_8px_30px_-8px_rgba(0,0,0,0.6)] transition-transform hover:scale-[1.03]">
                            <MessagesSquare className="h-4 w-4" />
                            {t("aiPromo.cta")}
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Masaustu: kendi kendine akan bot sohbeti + etrafinda yuzen botlar */}
            <div className="mr-6 hidden w-[330px] shrink-0 md:@min-[44rem]:block lg:mr-16 lg:w-[380px]">
                <AiChatDemo lines={club?.recentLines} />
            </div>
            </div>
            <div aria-hidden className="hidden md:@min-[44rem]:block">
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
