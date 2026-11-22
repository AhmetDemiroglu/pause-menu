/** Backend NewsDtos aynasi (api/news). Iki dil birlikte gelir; ekran yerel dile gore secer. */
export type NewsCategory = 'announcement' | 'releaseDate' | 'release' | 'update' | 'industry' | 'hardware' | 'esports' | 'other';

export const NEWS_CATEGORIES: NewsCategory[] = ['announcement', 'releaseDate', 'release', 'update', 'industry', 'hardware', 'esports'];

/** API yalniz 12 ya da 24 kabul eder. */
export const NEWS_PAGE_SIZE = 12;

export interface NewsListItem {
  id: number;
  slug: string;
  titleTr: string;
  titleEn: string;
  summaryTr: string;
  summaryEn: string;
  category: NewsCategory;
  importance: number;
  imageUrl: string | null;
  imageKind: 'none' | 'catalog' | 'generated';
  publishedAt: string;
  sourceName: string;
  sourceCount: number;
}

export interface NewsSource {
  name: string;
  url: string;
  title: string;
  language: string;
  publishedAt: string;
}

export interface NewsDetail extends NewsListItem {
  bodyTr: string;
  bodyEn: string;
  sources: NewsSource[];
  game: { id: number; slug: string; name: string; backgroundImage: string | null; released: string | null } | null;
  isHidden: boolean;
}

export interface NewsPage {
  items: NewsListItem[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export const pickNewsText = (item: NewsListItem, locale: string) =>
  locale === 'tr' ? { title: item.titleTr, summary: item.summaryTr } : { title: item.titleEn, summary: item.summaryEn };

export const pickNewsBody = (item: NewsDetail, locale: string) => (locale === 'tr' ? item.bodyTr : item.bodyEn);
