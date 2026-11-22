import { NEWS_PAGE_SIZE, type NewsDetail, type NewsListItem } from "@/models/news/news.model";
import type { PaginatedResponse } from "@/models/system/api.model";
import { serverGet } from "@/api/server-fetch";

/** Haber listesinin ilk sayfasi (kategorisiz). API de 5 dk onbellekler; yeni haber en gec ~10 dk sonra gorunur. */
export const getNewsFirstPageServer = () =>
    serverGet<PaginatedResponse<NewsListItem>>(`/api/news?page=1&pageSize=${NEWS_PAGE_SIZE}`, { revalidate: 300, tags: ["news-list"] });

/** One cikanlar: son 48 saatin en onemli 3 haberi (API'de onem, kaynak sayisi, tazelik sirasi). */
export const getNewsFeaturedServer = () =>
    serverGet<NewsListItem[]>(`/api/news/featured?limit=3`, { revalidate: 300, tags: ["news-featured"] });

export const getNewsDetailServer = (slug: string) =>
    serverGet<NewsDetail>(`/api/news/${encodeURIComponent(slug)}`, { revalidate: 600, tags: [`news-${slug}`] });

/** Sitemap: son 1000 haber (slug + tarih). */
export const getNewsSitemapServer = () =>
    serverGet<PaginatedResponse<{ key: string; lastModified: string }>>(`/api/news/sitemap`, { revalidate: 3600, tags: ["sitemap-news"] });
