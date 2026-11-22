import { axiosInstance } from './client';
import type { LeaderboardPage, LeaderboardPeriod, UserAchievements } from '../models/stats';

/** Tum rozet katalogu, kullanicinin kazandiklari ve ilerlemesi (gizlilik kapili; gizli profilde 404). */
export const getUserAchievements = (username: string): Promise<UserAchievements> =>
  axiosInstance
    .get<UserAchievements>(`/gamification/users/${encodeURIComponent(username)}/achievements`)
    .then((response) => response.data);

/** Liderlik: period=week|all, 50'lik sayfa, en fazla 4 sayfa. */
export const getLeaderboard = (period: LeaderboardPeriod, page = 1): Promise<LeaderboardPage> =>
  axiosInstance
    .get<LeaderboardPage>('/gamification/leaderboard', { params: { period, page } })
    .then((response) => response.data);
