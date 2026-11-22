"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, EyeOff, ExternalLink, Newspaper } from "lucide-react";
import { toast } from "sonner";
import { newsApi } from "@/api/news/news.api";
import { pickNewsBody, pickNewsText, type NewsDetail, type NewsListItem } from "@/models/news/news.model";
import { useAuth } from "@/core/hooks/use-auth";
import { useCurrentLocale, useI18n } from "@/core/contexts/locale-context";
import { buildLocalizedPathname } from "@/i18n/config";
import { getGameImageUrl } from "@/core/lib/get-image-url";
import { Badge } from "@/core/components/ui/badge";
import { Button } from "@/core/components/ui/button";
import { NewsImage, useNewsTimeAgo } from "./news-card";

/**
 * Haber detayi. Genis ekranda iki sutun: solda haber, sagda kaynaklar, ilgili oyun ve son haberler
 * (sayfanin iki yani bos kalmasin, sag sutun kayarken yerinde durur). Dar ekranda tek sutun.
 * Icerik sunucudan gelir (page.tsx) ve HTML'de cizilir; istemci yalniz admin gizleme yapar.
 */
export function NewsDetailView({ article, latest }: { article: NewsDetail; latest: NewsListItem[] }) {
    const t = useI18n();
    const locale = useCurrentLocale();
    const timeAgo = useNewsTimeAgo();
    const { user } = useAuth();
    const [hidden, setHidden] = useState(article.isHidden);
    const [hiding, setHiding] = useState(false);

    const { title, summary } = pickNewsText(article, locale);
    const paragraphs = pickNewsBody(article, locale)
        .split(/\n+/)
        .map((p) => p.trim())
        .filter(Boolean);
    const primary = article.sources[0];
    const isAdmin = user?.role === "Admin";
    const others = latest.filter((n) => n.id !== article.id).slice(0, 6);

    const caption =
        article.imageKind === "generated"
            ? t("news.representativeImage")
            : article.imageKind === "source" && article.imageCredit
              ? t("news.imageFromSource", { source: article.imageCredit })
              : article.imageKind === "catalog" && article.game
                ? t("news.imageFromGame", { game: article.game.name })
                : null;

    const hide = async () => {
        setHiding(true);
        try {
            await newsApi.setHidden(article.id, true);
            setHidden(true);
            toast.success(t("news.hideSuccess"));
        } catch {
            toast.error(t("news.hideError"));
        } finally {
            setHiding(false);
        }
    };

    return (
        <div className="space-y-6 pb-10">
            <Link
                href={buildLocalizedPathname("/news", locale)}
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
                <ArrowLeft className="h-4 w-4" />
                {t("news.backToNews")}
            </Link>

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_380px]">
                <article className="min-w-0 space-y-6">
                    {hidden ? <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{t("news.hidden")}</div> : null}

                    <header className="space-y-3">
                        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                            <Badge variant="secondary">{t(`news.categories.${article.category}`)}</Badge>
                            <time dateTime={article.publishedAt}>{timeAgo(article.publishedAt)}</time>
                        </div>
                        <h1 className="text-3xl font-black leading-tight tracking-tight md:text-4xl">{title}</h1>
                        <p className="text-lg text-muted-foreground">{summary}</p>
                    </header>

                    {article.imageKind !== "none" ? (
                        <figure className="space-y-2">
                            <div className="relative aspect-video overflow-hidden rounded-2xl border border-border">
                                <NewsImage item={article} width={1280} eager className="h-full w-full" />
                            </div>
                            {caption ? <figcaption className="text-xs text-muted-foreground">{caption}</figcaption> : null}
                        </figure>
                    ) : null}

                    <div className="space-y-4 text-base leading-relaxed text-foreground/90 md:text-[17px]">
                        {paragraphs.map((p, i) => (
                            <p key={i}>{p}</p>
                        ))}
                    </div>

                    {primary ? (
                        <Button asChild className="w-full sm:w-auto">
                            <a href={primary.url} target="_blank" rel="noopener nofollow">
                                {t("news.readAtSource", { source: primary.name })}
                                <ExternalLink className="h-4 w-4" />
                            </a>
                        </Button>
                    ) : null}

                    {isAdmin && !hidden ? (
                        <div>
                            <Button variant="outline" size="sm" className="cursor-pointer text-destructive" disabled={hiding} onClick={hide}>
                                <EyeOff className="h-4 w-4" />
                                {t("news.hide")}
                            </Button>
                        </div>
                    ) : null}
                </article>

                <aside className="min-w-0 space-y-6 lg:sticky lg:top-20 lg:self-start">
                    <section className="space-y-3 rounded-2xl border border-border bg-card p-4">
                        <div>
                            <h2 className="font-semibold">{t("news.sources")}</h2>
                            <p className="text-xs text-muted-foreground">{t("news.sourcesHint")}</p>
                        </div>
                        <ul className="space-y-2">
                            {article.sources.map((s) => (
                                <li key={s.url}>
                                    <a
                                        href={s.url}
                                        target="_blank"
                                        rel="noopener nofollow"
                                        className="group flex items-start gap-2.5 rounded-lg border border-border/70 p-2.5 transition-colors hover:border-primary/50"
                                    >
                                        <ExternalLink className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground group-hover:text-foreground" />
                                        <span className="min-w-0">
                                            <span className="block text-sm font-semibold">{s.name}</span>
                                            <span className="block break-words text-xs text-muted-foreground">{s.title}</span>
                                        </span>
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </section>

                    {article.game ? (
                        <section className="space-y-2">
                            <h2 className="text-sm font-semibold text-muted-foreground">{t("news.relatedGame")}</h2>
                            <Link
                                href={buildLocalizedPathname(`/games/${article.game.slug || article.game.id}`, locale)}
                                className="group flex items-center gap-3 overflow-hidden rounded-2xl border border-border bg-card p-2 transition-colors hover:border-primary/50"
                            >
                                {article.game.backgroundImage ? (
                                    <img
                                        src={getGameImageUrl(article.game.backgroundImage, 420)}
                                        alt=""
                                        loading="lazy"
                                        decoding="async"
                                        className="h-14 w-24 shrink-0 rounded-lg object-cover"
                                    />
                                ) : null}
                                <div className="min-w-0">
                                    <p className="font-semibold">{article.game.name}</p>
                                    {article.game.released ? <p className="text-xs text-muted-foreground">{article.game.released}</p> : null}
                                </div>
                            </Link>
                        </section>
                    ) : null}

                    {others.length > 0 ? (
                        <section className="space-y-3">
                            <div className="flex items-center gap-2">
                                <Newspaper className="h-4 w-4 text-primary" />
                                <h2 className="font-semibold">{t("news.moreNews")}</h2>
                            </div>
                            <ul className="space-y-3">
                                {others.map((n) => (
                                    <li key={n.id}>
                                        <Link href={buildLocalizedPathname(`/news/${n.slug}`, locale)} className="group flex gap-3">
                                            <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-lg border border-border">
                                                <NewsImage item={n} width={640} className="h-full w-full" />
                                            </div>
                                            <div className="min-w-0 space-y-1">
                                                <p className="text-sm font-semibold leading-snug group-hover:text-primary">{pickNewsText(n, locale).title}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {n.sourceName} · {timeAgo(n.publishedAt)}
                                                </p>
                                            </div>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    ) : null}
                </aside>
            </div>
        </div>
    );
}
