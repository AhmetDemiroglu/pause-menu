"use client";

import { useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Flame, Loader2, Newspaper } from "lucide-react";
import { newsApi } from "@/api/news/news.api";
import { NEWS_CATEGORIES, type NewsCategory, type NewsListItem } from "@/models/news/news.model";
import type { PaginatedResponse } from "@/models/system/api.model";
import { useI18n } from "@/core/contexts/locale-context";
import { useInfiniteScroll } from "@/core/hooks/use-infinite-scroll";
import { PageHero } from "@core/components/base/page-hero";
import { Skeleton } from "@/core/components/ui/skeleton";
import { NewsCard, NewsFeaturedCard } from "./news-card";

const ALL = "all";
/** Haber botunun okudugu kaynak sayisi (backend NewsSources.All). */
const SOURCE_COUNT = 20;

export function NewsGridSkeleton({ count = 8 }: { count?: number }) {
    return (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="overflow-hidden rounded-lg border border-border bg-card">
                    <Skeleton className="aspect-video w-full rounded-none" />
                    <div className="space-y-2 p-4">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-2/3" />
                        <Skeleton className="h-3 w-1/2" />
                    </div>
                </div>
            ))}
        </div>
    );
}

/**
 * Haber listesi. Kategorisiz ilk sayfa sunucuda cizilir (page.tsx -> initialFirstPage), botlar API'ye
 * gitmeden icerigi gorur. Kategori secimi istemci durumudur: URL'ye yazilmaz, sorgu varyanti uretmez.
 * Sayfa kabi ve baslik bandi Oyun Gundemi ile ayni (PageHero).
 */
export function NewsView({ initialFirstPage }: { initialFirstPage: PaginatedResponse<NewsListItem> | null }) {
    const t = useI18n();
    const [category, setCategory] = useState<NewsCategory | typeof ALL>(ALL);
    const activeCategory = category === ALL ? null : category;

    const query = useInfiniteQuery({
        queryKey: ["news", activeCategory ?? ALL],
        queryFn: ({ pageParam }) => newsApi.list(pageParam, activeCategory),
        initialPageParam: 1,
        getNextPageParam: (lastPage) => (lastPage.page * lastPage.pageSize < lastPage.totalCount ? lastPage.page + 1 : undefined),
        initialData: activeCategory === null && initialFirstPage ? { pages: [initialFirstPage], pageParams: [1] } : undefined,
        staleTime: 2 * 60 * 1000,
    });

    const items = query.data?.pages.flatMap((p) => p.items) ?? [];
    const total = query.data?.pages[0]?.totalCount ?? initialFirstPage?.totalCount ?? 0;
    const showFeatured = activeCategory === null && items.length >= 6;
    const featured = showFeatured ? items.slice(0, 3) : [];
    const rest = showFeatured ? items.slice(3) : items;

    const sentinelRef = useInfiniteScroll<HTMLDivElement>({
        enabled: !!query.hasNextPage,
        loading: query.isFetchingNextPage,
        onLoadMore: () => query.fetchNextPage(),
    });

    const pills: Array<{ key: NewsCategory | typeof ALL; label: string }> = [
        { key: ALL, label: t("news.all") },
        ...NEWS_CATEGORIES.map((c) => ({ key: c, label: t(`news.categories.${c}`) })),
    ];

    return (
        <div className="space-y-8">
            <PageHero
                accent="sky"
                title={t("news.title")}
                subtitle={t("news.subtitle")}
                meta={
                    <>
                        {total > 0 ? <span className="text-sky-300">{t("news.statsStories", { count: total })}</span> : null}
                        <span className="text-fuchsia-300">{t("news.statsSources", { count: SOURCE_COUNT })}</span>
                    </>
                }
            />

            {/* Filtre haplari Oyun Gundemi'ndeki gibi. Dar ekranda sayfa tasmaz, yalniz hap serisi yana kayar. */}
            <div aria-label={t("news.categoriesLabel")} className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
                {pills.map((pill) => (
                    <button
                        key={pill.key}
                        type="button"
                        aria-pressed={category === pill.key}
                        onClick={() => setCategory(pill.key)}
                        className={`shrink-0 cursor-pointer rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                            category === pill.key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                        }`}
                    >
                        {pill.label}
                    </button>
                ))}
            </div>

            {query.isPending ? (
                <NewsGridSkeleton />
            ) : items.length === 0 ? (
                // Veri varken tazeleme hatasi icerigi silmez; hata yalniz hic veri yoksa gorunur.
                <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                    {query.isError ? t("news.loadError") : t("news.empty")}
                </div>
            ) : (
                <>
                    {featured.length > 0 ? (
                        <section className="space-y-4">
                            <div className="flex items-center gap-2">
                                <Flame className="h-5 w-5 text-amber-400" />
                                <h2 className="text-xl font-bold text-foreground">{t("news.featured")}</h2>
                            </div>
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                                {featured.map((item, i) => (
                                    <NewsFeaturedCard key={item.id} item={item} eager={i === 0} />
                                ))}
                            </div>
                        </section>
                    ) : null}

                    <section className="space-y-4">
                        {featured.length > 0 ? (
                            <div className="flex items-center gap-2">
                                <Newspaper className="h-5 w-5 text-primary" />
                                <h2 className="text-xl font-bold text-foreground">{t("news.latest")}</h2>
                            </div>
                        ) : null}
                        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {rest.map((item, i) => (
                                <NewsCard key={item.id} item={item} eager={!showFeatured && i < 4} />
                            ))}
                        </div>
                    </section>
                </>
            )}

            <div ref={sentinelRef} className="flex h-10 items-center justify-center">
                {query.isFetchingNextPage ? <Loader2 aria-label={t("news.loadingMore")} className="h-5 w-5 animate-spin text-muted-foreground" /> : null}
            </div>
        </div>
    );
}
