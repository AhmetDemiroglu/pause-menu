import { axiosInstance } from "@core/lib/axios";
import type { TopUser, TopList, TopGame } from "@/models/analytics/analytics.model";

export const getTopUsers = (count: number = 5, humansOnly = false) => {
    return axiosInstance.get<TopUser[]>("/analytics/top-users", {
        params: { count, humansOnly },
    });
};

export const getTopLists = (count: number = 5, humansOnly = false) => {
    return axiosInstance.get<TopList[]>("/analytics/top-lists", {
        params: { count, humansOnly },
    });
};

export const getTopRatedGames = (count: number = 5, humansOnly = false) => {
    return axiosInstance.get<TopGame[]>("/analytics/top-games", {
        params: { count, humansOnly },
    });
};
