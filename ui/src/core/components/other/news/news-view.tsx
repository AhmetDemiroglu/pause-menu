"use client";

import { useState } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { Flame, Loader2, Newspaper, Search, X } from "lucide-react";
import { newsApi } from "@/api/news/news.api";
import { NEWS_CATEGORIES, type NewsCategory, type NewsListItem } from "@/models/news/news.model";
import type { PaginatedResponse } from "@/models/system/api.model";
import { useI18n } from "@/core/contexts/locale-context";
import { useInfiniteScroll } from "@/core/hooks/use-infinite-scroll";
import { PageHero } from "@core/components/base/page-hero";
import { Skeleton } from "@/core/components/ui/skeleton";
import { Input } from "@/core/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/core/components/ui/select";
import { useDebounce } from "@/core/hooks/use-debounce";
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
export function NewsView({
    initialFirstPage,
    initialFeatured,
}: {
    initialFirstPage: PaginatedResponse<NewsListItem> | null;
    initialFeatured: NewsListItem[] | null;
}) {
    const t = useI18n();
    const [category, setCategory] = useState<NewsCategory | typeof ALL>(ALL);
    const activeCategory = category === ALL ? null : category;
    const [searchInput, setSearchInput] = useState("");
    const searchTerm = useDebounce(searchInput.trim(), 350);
    const search = searchTerm.length >= 2 ? searchTerm : "";
    const [days, setDays] = useState(0);
    const isFiltering = search !== "" || days !== 0;

    const query = useInfiniteQuery({
        queryKey: ["news", activeCategory ?? ALL, search, days],
        queryFn: ({ pageParam }) => newsApi.list(pageParam, activeCategory, search, days),
        initialPageParam: 1,
        getNextPageParam: (lastPage) => (lastPage.page * lastPage.pageSize < lastPage.totalCount ? lastPage.page + 1 : undefined),
        initialData: activeCategory === null && !isFiltering && initialFirstPage ? { pages: [initialFirstPage], pageParams: [1] } : undefined,
        placeholderData: (previous) => previous,
        staleTime: 2 * 60 * 1000,
    });

    // One cikanlar en yeni 3 haber DEGIL: son 48 saatin en onemli haberleri (onem, kaynak sayisi, tazelik).
    const featuredQuery = useQuery({
        queryKey: ["news-featured"],
        queryFn: () => newsApi.featured(),
        initialData: initialFeatured ?? undefined,
        staleTime: 2 * 60 * 1000,
    });

    const items = query.data?.pages.flatMap((p) => p.items) ?? [];
    const total = query.data?.pages[0]?.totalCount ?? 0;
    const siteTotal = initialFirstPage?.totalCount ?? (isFiltering ? 0 : total);
    // Arama ya da tarih suzgeci varken one cikanlar gizlenir: kullanici yalniz sonuclari gorur.
    const featured = activeCategory === null && !isFiltering && items.length >= 6 ? (featuredQuery.data ?? []).slice(0, 3) : [];
    const showFeatured = featured.length > 0;
    const featuredIds = new Set(featured.map((f) => f.id));
    const rest = items.filter((i) => !featuredIds.has(i.id));

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
                        {siteTotal > 0 ? <span className="text-sky-300">{t("news.statsStories", { count: siteTotal })}</span> : null}
                        <span className="text-fuchsia-300">{t("news.statsSources", { count: SOURCE_COUNT })}</span>
                    </>
                }
                actions={
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <div className="relative sm:w-[230px]">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
                            <Input
                                type="search"
                                value={searchInput}
                                onChange={(event) => setSearchInput(event.target.value)}
                                placeholder={t("news.searchPlaceholder")}
                                aria-label={t("news.searchPlaceholder")}
                                maxLength={60}
                                className="border-white/15 bg-black/40 pl-9 pr-9 text-white backdrop-blur-md placeholder:text-white/45 [&::-webkit-search-cancel-button]:hidden"
                            />
                            {searchInput ? (
                                <button
                                    type="button"
                                    onClick={() => setSearchInput("")}
                                    aria-label={t("news.searchClear")}
                                    className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-white/60 transition-colors hover:bg-white/10 hover:text-white"
                                >
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            ) : null}
                        </div>
                        <Select value={String(days)} onValueChange={(value) => setDays(Number(value))}>
                            <SelectTrigger className="w-full cursor-pointer border-white/15 bg-black/40 text-white backdrop-blur-md sm:w-[170px]" aria-label={t("news.dateFilter")}>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="0" className="cursor-pointer">{t("news.dateAll")}</SelectItem>
                                <SelectItem value="1" className="cursor-pointer">{t("news.dateToday")}</SelectItem>
                                <SelectItem value="3" className="cursor-pointer">{t("news.date3")}</SelectItem>
                                <SelectItem value="7" className="cursor-pointer">{t("news.date7")}</SelectItem>
                                <SelectItem value="30" className="cursor-pointer">{t("news.date30")}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
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
                    {query.isError ? t("news.loadError") : isFiltering ? t("news.noResults") : t("news.empty")}
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
                        ) : isFiltering ? (
                            <div className="flex flex-wrap items-center gap-2">
                                <Search className="h-5 w-5 text-primary" />
                                <h2 className="text-xl font-bold text-foreground">{t("news.searchResults")}</h2>
                                <span className="text-xs text-muted-foreground">{t("news.resultCount", { count: total })}</span>
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
