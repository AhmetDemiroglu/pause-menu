"use client";

import { memo, useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { enUS, tr } from "date-fns/locale";
import { Newspaper } from "lucide-react";
import { Badge } from "@/core/components/ui/badge";
import { useCurrentLocale, useI18n } from "@/core/contexts/locale-context";
import { buildLocalizedPathname } from "@/i18n/config";
import { getGameImageUrl } from "@/core/lib/get-image-url";
import { cn } from "@/core/lib/utils";
import { pickNewsText, type NewsListItem } from "@/models/news/news.model";

/**
 * Haber gorseli. Kaynak gorseli yayincinin adresinden (referrer gonderilmez, bazi CDN'ler baska siteden
 * gelen istegi reddediyor), katalog gorseli RAWG'de kucultulur, uretilen gorsel R2'de hazir.
 * Hicbiri /_next/image'dan GECMEZ: web sunucusunun RAM'ini gorsel optimizer'i tuketiyor.
 */
export function NewsImage({ item, width, eager, className }: { item: NewsListItem; width: 640 | 1280; eager?: boolean; className?: string }) {
    const [failed, setFailed] = useState(false);
    const imgRef = useRef<HTMLImageElement>(null);
    const src = item.imageKind === "catalog" ? getGameImageUrl(item.imageUrl, width) : item.imageUrl;

    // Sunucuda cizilen img hidrasyondan once hata verirse onError hic cagrilmaz: yuklenince bir kez bak.
    useEffect(() => {
        const img = imgRef.current;
        if (img && img.complete && img.naturalWidth === 0) setFailed(true);
    }, [src]);

    if (!src || failed) {
        return (
            <div aria-hidden className={cn("flex items-center justify-center bg-linear-to-br from-primary/35 via-primary/10 to-background", className)}>
                <Newspaper className="h-10 w-10 text-primary/60" />
            </div>
        );
    }

    return (
        <img
            ref={imgRef}
            src={src}
            alt=""
            loading={eager ? "eager" : "lazy"}
            decoding="async"
            referrerPolicy="no-referrer"
            onError={() => setFailed(true)}
            className={cn("object-cover", className)}
        />
    );
}

export function useNewsTimeAgo() {
    const locale = useCurrentLocale();
    const dateLocale = locale === "tr" ? tr : enUS;
    return (iso: string) => formatDistanceToNow(new Date(iso), { addSuffix: true, locale: dateLocale });
}

/** Ozet 3 satiri asiyorsa kesilir ve altinda "Devamini gor" cikar; satir sayisi olculur, tahmin edilmez. */
function ClampedSummary({ text }: { text: string }) {
    const t = useI18n();
    const ref = useRef<HTMLParagraphElement>(null);
    const [clamped, setClamped] = useState(false);

    useLayoutEffect(() => {
        const el = ref.current;
        if (!el) return;
        const measure = () => setClamped(el.scrollHeight > el.clientHeight + 1);
        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(el);
        return () => observer.disconnect();
    }, [text]);

    return (
        <div>
            <p ref={ref} className="line-clamp-3 text-sm text-muted-foreground">
                {text}
            </p>
            {clamped ? <span className="text-sm font-medium text-primary">{t("news.readMore")}</span> : null}
        </div>
    );
}

/** Izgara karti: game-card ile ayni kart dili. Baslik kesilmez; kartlar satirda ayni boyda, alt bilgi dipte. */
export const NewsCard = memo(function NewsCard({ item, eager = false }: { item: NewsListItem; eager?: boolean }) {
    const locale = useCurrentLocale();
    const t = useI18n();
    const timeAgo = useNewsTimeAgo();
    const { title, summary } = pickNewsText(item, locale);

    return (
        <Link href={buildLocalizedPathname(`/news/${item.slug}`, locale)} className="group block h-full">
            <article className="flex h-full flex-col overflow-hidden rounded-lg border border-border bg-card text-foreground transition-colors duration-300 hover:border-primary/50">
                <div className="relative aspect-video shrink-0 overflow-hidden">
                    <NewsImage item={item} width={640} eager={eager} className="h-full w-full transition-transform duration-300 group-hover:scale-105" />
                    <div className="absolute left-2 top-2">
                        <Badge variant="secondary" className="bg-background/85 backdrop-blur-sm">
                            {t(`news.categories.${item.category}`)}
                        </Badge>
                    </div>
                </div>
                <div className="flex flex-1 flex-col gap-2 p-4">
                    <h2 className="text-base font-semibold leading-snug">{title}</h2>
                    <ClampedSummary text={summary} />
                    <div className="mt-auto flex flex-wrap items-center gap-x-1.5 gap-y-0.5 pt-1 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground/80">{item.sourceName}</span>
                        {item.sourceCount > 1 ? <span>{t("news.sourceCount", { count: item.sourceCount - 1 })}</span> : null}
                        <span aria-hidden>·</span>
                        <time dateTime={item.publishedAt}>{timeAgo(item.publishedAt)}</time>
                    </div>
                </div>
            </article>
        </Link>
    );
});

/** One cikan haber: gundem sayfasindaki buyuk kart dili. Baslik kesilmez, kart gerekirse uzar. */
export const NewsFeaturedCard = memo(function NewsFeaturedCard({ item, eager = false }: { item: NewsListItem; eager?: boolean }) {
    const locale = useCurrentLocale();
    const t = useI18n();
    const timeAgo = useNewsTimeAgo();
    const { title } = pickNewsText(item, locale);

    return (
        <Link
            href={buildLocalizedPathname(`/news/${item.slug}`, locale)}
            className="group relative flex min-h-56 flex-col justify-end overflow-hidden rounded-2xl ring-1 ring-white/10 transition-all duration-300 hover:-translate-y-1 hover:ring-white/30 md:min-h-64"
        >
            <NewsImage item={item} width={1280} eager={eager} className="absolute inset-0 h-full w-full transition-transform duration-700 group-hover:scale-105" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/45 to-black/10" />
            <div className="relative space-y-2 p-4">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-semibold text-white/80">
                    <span className="rounded-md bg-white/15 px-1.5 py-0.5 text-white backdrop-blur-sm">{t(`news.categories.${item.category}`)}</span>
                    <span>{item.sourceName}</span>
                    <span aria-hidden>·</span>
                    <time dateTime={item.publishedAt}>{timeAgo(item.publishedAt)}</time>
                </div>
                <h2 className="text-lg font-bold leading-snug text-white drop-shadow-lg md:text-xl">{title}</h2>
            </div>
        </Link>
    );
});
