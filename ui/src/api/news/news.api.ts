import { axiosInstance } from "@core/lib/axios";
import { NEWS_PAGE_SIZE, type NewsCategory, type NewsListItem } from "@/models/news/news.model";
import type { PaginatedResponse } from "@/models/system/api.model";

export const newsApi = {
    list: (page: number, category?: NewsCategory | null) =>
        axiosInstance
            .get<PaginatedResponse<NewsListItem>>("/news", { params: { page, pageSize: NEWS_PAGE_SIZE, category: category ?? undefined } })
            .then((res) => res.data),
    featured: () => axiosInstance.get<NewsListItem[]>("/news/featured", { params: { limit: 3 } }).then((res) => res.data),
    setHidden: (id: number, hidden: boolean) => axiosInstance.put(`/admin/news/${id}/hidden`, { hidden }),
};
