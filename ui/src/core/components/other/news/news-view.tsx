"use client";

import { useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { newsApi } from "@/api/news/news.api";
import { NEWS_CATEGORIES, type NewsCategory, type NewsListItem } from "@/models/news/news.model";
import type { PaginatedResponse } from "@/models/system/api.model";
import { useI18n } from "@/core/contexts/locale-context";
import { useInfiniteScroll } from "@/core/hooks/use-infinite-scroll";
import { Separator } from "@/core/components/ui/separator";
import { Skeleton } from "@/core/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/core/components/ui/tabs";
import { NewsCard, NewsFeaturedCard } from "./news-card";

const ALL = "all";

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
    const showFeatured = activeCategory === null && items.length >= 6;
    const featured = showFeatured ? items.slice(0, 3) : [];
    const rest = showFeatured ? items.slice(3) : items;

    const sentinelRef = useInfiniteScroll<HTMLDivElement>({
        enabled: !!query.hasNextPage,
        loading: query.isFetchingNextPage,
        onLoadMore: () => query.fetchNextPage(),
    });

    return (
        <div className="h-full w-full p-5">
            <div className="space-y-4">
                <div>
                    <h1 className="text-3xl font-bold">{t("news.title")}</h1>
                    <p className="mt-2 text-muted-foreground">{t("news.subtitle")}</p>
                </div>

                <Separator />

                {/* Dar ekranda sayfa tasmaz: yalniz sekme serisi kendi icinde yana kayar. */}
                <Tabs value={category} onValueChange={(v) => setCategory(v as NewsCategory | typeof ALL)}>
                    <div className="-mx-1 overflow-x-auto px-1 pb-1">
                        <TabsList aria-label={t("news.categoriesLabel")} className="w-max">
                            <TabsTrigger value={ALL} className="cursor-pointer px-3">
                                {t("news.all")}
                            </TabsTrigger>
                            {NEWS_CATEGORIES.map((c) => (
                                <TabsTrigger key={c} value={c} className="cursor-pointer px-3">
                                    {t(`news.categories.${c}`)}
                                </TabsTrigger>
                            ))}
                        </TabsList>
                    </div>
                </Tabs>
            </div>

            <div className="mt-6 space-y-6">
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
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                                {featured.map((item, i) => (
                                    <NewsFeaturedCard key={item.id} item={item} eager={i === 0} />
                                ))}
                            </div>
                        ) : null}

                        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {rest.map((item, i) => (
                                <NewsCard key={item.id} item={item} eager={!showFeatured && i < 4} />
                            ))}
                        </div>
                    </>
                )}

                <div ref={sentinelRef} className="flex h-10 items-center justify-center">
                    {query.isFetchingNextPage ? <Loader2 aria-label={t("news.loadingMore")} className="h-5 w-5 animate-spin text-muted-foreground" /> : null}
                </div>
            </div>
        </div>
    );
}

