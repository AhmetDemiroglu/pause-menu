/* eslint-disable @next/next/no-img-element */
import { cn } from "@/core/lib/utils";

type Screen = "home" | "game" | "aibots";

/**
 * Tek telefon cercevesi. Ekran goruntusu sitenin temasina (light/dark) ve diline gore degisir:
 * iki gorsel de DOM'da, tema sinifi (dark:) hangisinin gorunecegini secer. JS tema durumu yok,
 * hydration farki olmaz. Gizli (display:none) lazy gorsel hic indirilmez.
 * Gorseller 400 px genis; telefon en fazla 220 px, ekran ~206 px: DPR 2'de ~1.9x, net kalir.
 */
function PhoneShot({ screen, lang, alt, className }: { screen: Screen; lang: "tr" | "en"; alt: string; className?: string }) {
    return (
        <div className={cn("relative rounded-[2.2rem] bg-zinc-900 p-[7px] shadow-[0_30px_70px_-20px_rgba(20,16,31,0.55)] ring-1 ring-white/10 dark:shadow-[0_30px_70px_-20px_rgba(0,0,0,0.9)]", className)}>
            <div className="absolute left-1/2 top-[11px] z-20 h-[14px] w-[58px] -translate-x-1/2 rounded-full bg-black" />
            <div className="overflow-hidden rounded-[1.75rem] bg-black">
                <img src={`/app-screens/${screen}-light-${lang}.webp`} alt={alt} width={400} height={870} loading="lazy" decoding="async" className="block h-auto w-full dark:hidden" />
                <img src={`/app-screens/${screen}-dark-${lang}.webp`} alt={alt} width={400} height={870} loading="lazy" decoding="async" className="hidden h-auto w-full dark:block" />
            </div>
        </div>
    );
}

/**
 * Mobil uygulama slaytinin sagindaki telefon kumesi: ortada ana sayfa, solda oyun detayi, sagda
 * AI Kulubu. Telefonlar slaytin altindan tasarak yukselir (slayt overflow-hidden). Dar slaytta
 * yalniz ortadaki telefon gorunur, 60rem'den genis slaytta yandakiler de acilir (container query:
 * ust elemanda @container olmali).
 */
export function AppPromoPhones({ locale, appName }: { locale: string; appName: string }) {
    const lang = locale === "tr" ? "tr" : "en";
    return (
        <div className="relative h-full w-[170px] @min-[60rem]:w-[390px] @6xl:w-[430px]">
            <div aria-hidden className="absolute left-0 top-24 z-0 hidden w-[165px] -rotate-[8deg] @min-[60rem]:block @6xl:w-[180px]">
                <PhoneShot screen="game" lang={lang} alt="" />
            </div>
            <div aria-hidden className="absolute right-0 top-24 z-0 hidden w-[165px] rotate-[8deg] @min-[60rem]:block @6xl:w-[180px]">
                <PhoneShot screen="aibots" lang={lang} alt="" />
            </div>
            <div className="absolute left-1/2 top-10 z-10 w-[170px] -translate-x-1/2 @min-[60rem]:top-12 @min-[60rem]:w-[200px] @6xl:w-[220px]">
                <div className="transition-transform duration-500 ease-out will-change-transform hover:-translate-y-3">
                    <PhoneShot screen="home" lang={lang} alt={appName} />
                </div>
            </div>
        </div>
    );
}
