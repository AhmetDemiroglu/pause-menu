export interface GenreStat {
    name: string;
    percentage: number;
    color: string;
}

export interface Achievement {
    title: string;
    description: string;
    iconUrl: string;
    earnedAt: string;
    // Gamification 2.0: eski API yanitlarinda yok, bu yuzden istege bagli.
    code?: string;
    family?: string;
    category?: string;
    tier?: number;
    xpReward?: number;
}

export interface UserStats {
    totalReviews: number;
    totalGamesListed: number;
    totalFollowers: number;
    gamerDna: GenreStat[];

    // Gamification
    currentLevel: number;
    levelName: string;
    currentXp: number;
    nextLevelXp: number;
    progressPercentage: number;
    recentAchievements: Achievement[];
    totalLists: number;

    // Gamification 2.0 (eski API'de yok).
    currentLevelXp?: number;
    remainingXp?: number;
    isMaxLevel?: boolean;
    earnedAchievementCount?: number;
    totalAchievementCount?: number;
    currentStreak?: number;
    longestStreak?: number;
}
