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
  // Gamification 2.0: eski API yanitlarinda yok.
  code?: string;
  tier?: number;
  xpReward?: number;
}

export interface UserStats {
  totalReviews: number;
  totalGamesListed: number;
  totalFollowers: number;
  gamerDna: GenreStat[];
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

export type LeaderboardPeriod = 'all' | 'week';

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
