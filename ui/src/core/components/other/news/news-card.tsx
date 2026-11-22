"use client";

import { memo } from "react";
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
 * Haber gorseli. Katalog gorseli RAWG CDN'inde kucultulur; uretilen gorsel R2'de zaten 1280 px WebP.
 * Ikisi de /_next/image'dan GECMEZ: web sunucusunun RAM'ini gorsel optimizer'i tuketiyor.
 * Gorsel yoksa marka renkli zemin.
 */
export function NewsImage({ item, width, eager, className }: { item: NewsListItem; width: 640 | 1280; eager?: boolean; className?: string }) {
    const src = item.imageKind === "catalog" ? getGameImageUrl(item.imageUrl, width) : item.imageUrl;

    if (!src) {
        return (
            <div aria-hidden className={cn("flex items-center justify-center bg-linear-to-br from-primary/35 via-primary/10 to-background", className)}>
                <Newspaper className="h-10 w-10 text-primary/60" />
            </div>
        );
    }

    return <img src={src} alt="" loading={eager ? "eager" : "lazy"} decoding="async" className={cn("object-cover", className)} />;
}

export function useNewsTimeAgo() {
    const locale = useCurrentLocale();
    const dateLocale = locale === "tr" ? tr : enUS;
    return (iso: string) => formatDistanceToNow(new Date(iso), { addSuffix: true, locale: dateLocale });
}

/** Izgara karti: game-card ile ayni kart dili (bg-card, border, hover:border-primary/50, aspect-video). */
export const NewsCard = memo(function NewsCard({ item, eager = false }: { item: NewsListItem; eager?: boolean }) {
    const locale = useCurrentLocale();
    const t = useI18n();
    const timeAgo = useNewsTimeAgo();
    const { title, summary } = pickNewsText(item, locale);

    return (
        <Link href={buildLocalizedPathname(`/news/${item.slug}`, locale)} className="group block h-full">
            <article className="flex h-full flex-col overflow-hidden rounded-lg border border-border bg-card text-foreground transition-colors duration-300 hover:border-primary/50">
                <div className="relative aspect-video overflow-hidden">
                    <NewsImage item={item} width={640} eager={eager} className="h-full w-full transition-transform duration-300 group-hover:scale-105" />
                    <div className="absolute left-2 top-2">
                        <Badge variant="secondary" className="bg-background/85 backdrop-blur-sm">
                            {t(`news.categories.${item.category}`)}
                        </Badge>
                    </div>
                </div>
                <div className="flex flex-1 flex-col gap-2 p-4">
                    <h2 className="line-clamp-2 text-base font-semibold leading-snug">{title}</h2>
                    <p className="line-clamp-2 text-sm text-muted-foreground">{summary}</p>
                    <div className="mt-auto flex items-center gap-1.5 pt-1 text-xs text-muted-foreground">
                        <span className="truncate font-medium text-foreground/80">{item.sourceName}</span>
                        {item.sourceCount > 1 ? <span className="shrink-0">{t("news.sourceCount", { count: item.sourceCount - 1 })}</span> : null}
                        <span aria-hidden className="shrink-0">·</span>
                        <time dateTime={item.publishedAt} className="shrink-0">
                            {timeAgo(item.publishedAt)}
                        </time>
                    </div>
                </div>
            </article>
        </Link>
    );
});

/** One cikan haber: gundem sayfasindaki buyuk kart dili (gorsel uzerine gradyan + baslik). */
export const NewsFeaturedCard = memo(function NewsFeaturedCard({ item, eager = false }: { item: NewsListItem; eager?: boolean }) {
    const locale = useCurrentLocale();
    const t = useI18n();
    const timeAgo = useNewsTimeAgo();
    const { title } = pickNewsText(item, locale);

    return (
        <Link
            href={buildLocalizedPathname(`/news/${item.slug}`, locale)}
            className="group relative block h-52 overflow-hidden rounded-2xl ring-1 ring-white/10 transition-all duration-300 hover:-translate-y-1 hover:ring-white/30 md:h-56"
        >
            <NewsImage item={item} width={1280} eager={eager} className="absolute inset-0 h-full w-full transition-transform duration-700 group-hover:scale-105" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-black/10" />
            <div className="absolute inset-x-0 bottom-0 space-y-2 p-4">
                <div className="flex items-center gap-2 text-[11px] font-semibold text-white/80">
                    <span className="rounded-md bg-white/15 px-1.5 py-0.5 text-white backdrop-blur-sm">{t(`news.categories.${item.category}`)}</span>
                    <span className="truncate">{item.sourceName}</span>
                    <span aria-hidden>·</span>
                    <time dateTime={item.publishedAt} className="shrink-0">
                        {timeAgo(item.publishedAt)}
                    </time>
                </div>
                <h2 className="line-clamp-2 text-lg font-bold leading-snug text-white drop-shadow-lg md:text-xl">{title}</h2>
            </div>
        </Link>
    );
});
