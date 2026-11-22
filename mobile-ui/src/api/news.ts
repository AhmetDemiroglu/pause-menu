import { axiosInstance } from './client';
import { NEWS_PAGE_SIZE, type NewsCategory, type NewsDetail, type NewsPage } from '../models/news';

/** Oyun dunyasindan haberler. Girissiz calisir; sunucu 5 dk onbellekler. */
export const newsApi = {
  list: async (page: number, category?: NewsCategory | null): Promise<NewsPage> => {
    const response = await axiosInstance.get<NewsPage>('/news', {
      params: { page, pageSize: NEWS_PAGE_SIZE, category: category ?? undefined },
    });
    return response.data;
  },
  get: async (slug: string): Promise<NewsDetail> => {
    const response = await axiosInstance.get<NewsDetail>(`/news/${encodeURIComponent(slug)}`);
    return response.data;
  },
};
