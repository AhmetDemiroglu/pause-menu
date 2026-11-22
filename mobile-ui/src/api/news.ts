import { axiosInstance } from './client';
import { NEWS_PAGE_SIZE, type NewsCategory, type NewsDetail, type NewsListItem, type NewsPage } from '../models/news';

/** Oyun dunyasindan haberler. Girissiz calisir; sunucu 5 dk onbellekler. */
export const newsApi = {
  /** search: baslik, ozet, kaynak ve oyun adinda arar. days: son 1, 3, 7 ya da 30 gun. */
  list: async (page: number, category?: NewsCategory | null, search?: string, days?: number): Promise<NewsPage> => {
    const response = await axiosInstance.get<NewsPage>('/news', {
      params: { page, pageSize: NEWS_PAGE_SIZE, category: category ?? undefined, search: search || undefined, days: days || undefined },
    });
    return response.data;
  },
  /** One cikanlar: son 48 saatin en onemli haberleri (oyun basina en fazla bir haber). */
  featured: async (limit = 6): Promise<NewsListItem[]> => {
    const response = await axiosInstance.get<NewsListItem[]>('/news/featured', { params: { limit } });
    return response.data;
  },
  get: async (slug: string): Promise<NewsDetail> => {
    const response = await axiosInstance.get<NewsDetail>(`/news/${encodeURIComponent(slug)}`);
    return response.data;
  },
};
