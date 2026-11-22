import { axiosInstance } from "@/core/lib/axios";
import type { LeaderboardPage, LeaderboardPeriod, UserAchievements } from "@/models/gamification/gamification.model";

export const getUserAchievements = (username: string): Promise<UserAchievements> =>
    axiosInstance
        .get<UserAchievements>(`/gamification/users/${encodeURIComponent(username)}/achievements`)
        .then((response) => response.data);

export const getLeaderboard = (period: LeaderboardPeriod, page = 1): Promise<LeaderboardPage> =>
    axiosInstance
        .get<LeaderboardPage>("/gamification/leaderboard", { params: { period, page } })
        .then((response) => response.data);
