import { cn } from "@/core/lib/utils";

/**
 * Ana sayfa hero'sundaki sabit tanitim slaytlarinin (AI Kulubu, Gundem, Mobil uygulama) ortak
 * arka plani: hafif renk gecisi, maskeli izgara ve iki yumusak isik. Zemin rengi ve kose/cerceve
 * slaytin kendi kok elemaninda kalir. Tonlar slayta gore degisir, yapi aynidir.
 */
const TONES = {
    agenda: {
        wash: "from-[#FF8A1F]/15 to-[#FF2E88]/15",
        glowA: "bg-[#FF8A1F]/20",
        glowB: "bg-[#FF2E88]/20",
    },
    app: {
        wash: "from-[#FF2E88]/15 to-[#7A1FD0]/15",
        glowA: "bg-[#FF8A1F]/20",
        glowB: "bg-[#7A1FD0]/15 dark:bg-[#5B0FB0]/35",
    },
    bots: {
        wash: "from-[#FF2E88]/12 to-[#7A1FD0]/10",
        glowA: "bg-[#FF2E88]/15 dark:bg-[#FF2E88]/20",
        glowB: "bg-[#7A1FD0]/10 dark:bg-[#5B0FB0]/35",
    },
} as const;

export function PromoSlideBackdrop({ tone }: { tone: keyof typeof TONES }) {
    const colors = TONES[tone];
    return (
        <>
            <div aria-hidden className={cn("absolute inset-0 z-0 bg-gradient-to-br via-transparent", colors.wash)} />
            <div
                aria-hidden
                className="absolute inset-0 z-0 opacity-[0.35]"
                style={{
                    backgroundImage:
                        "linear-gradient(var(--promo-grid) 1px, transparent 1px), linear-gradient(90deg, var(--promo-grid) 1px, transparent 1px)",
                    backgroundSize: "56px 56px",
                    maskImage: "radial-gradient(ellipse 90% 70% at 30% 40%, black 30%, transparent 75%)",
                }}
            />
            <div aria-hidden className={cn("pointer-events-none absolute -left-24 -top-24 z-0 h-80 w-80 rounded-full blur-3xl", colors.glowA)} />
            <div aria-hidden className={cn("pointer-events-none absolute -bottom-28 right-1/4 z-0 h-96 w-96 rounded-full blur-3xl", colors.glowB)} />
        </>
    );
}
