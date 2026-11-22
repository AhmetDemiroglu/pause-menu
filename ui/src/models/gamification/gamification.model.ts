export interface AchievementProgress {
    code: string;
    family: string;
    category: string;
    tier: number;
    title: string;
    description: string;
    iconUrl: string;
    xpReward: number;
    threshold: number;
    current: number;
    earnedAt: string | null;
}

export interface UserAchievements {
    userId: number;
    earnedCount: number;
    totalCount: number;
    items: AchievementProgress[];
}

export type LeaderboardPeriod = "all" | "week";

export interface LeaderboardEntry {
    rank: number;
    userId: number;
    username: string;
    profileImageUrl: string | null;
    level: number;
    levelName: string;
    xp: number;
}

export interface LeaderboardPage {
    period: LeaderboardPeriod;
    page: number;
    pageSize: number;
    hasMore: boolean;
    items: LeaderboardEntry[];
}
