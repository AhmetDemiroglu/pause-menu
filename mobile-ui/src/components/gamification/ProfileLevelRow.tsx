import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useSharedValue, useAnimatedStyle, withDelay, withSpring } from 'react-native-reanimated';
import { getUserStats } from '@/src/api/stats';
import { Skeleton } from '@/src/components/common/Skeleton';
import { AchievementBadge, LevelEmblem } from '@/src/components/gamification/AchievementBadge';
import { useTheme } from '@/src/hooks/use-theme';
import { useLocale } from '@/src/hooks/use-locale';
import { Spacing, FontSize, BorderRadius, Springs } from '@/src/constants/theme';
import { CATALOG_BADGES, findBadge } from '@/src/gamification/catalog';
import * as haptics from '@/src/utils/haptics';

const fill = (template: string, values: Record<string, string | number>) =>
  Object.entries(values).reduce((text, [key, value]) => text.split(`{${key}}`).join(String(value)), template);

type ProfileLevelRowProps = {
  username: string;
  /** Kendi profili: XP cubugu ve kalan XP gosterilir. Baskasinin profilinde yalniz seviye ve rozetler. */
  showProgress: boolean;
};

/**
 * Profil basligindaki seviye + rozet satiri. Ekranlarin kullandigi ['userStats', username]
 * sorgusunu paylasir. Yuklenirken iskelet, gizli/engelli profilde (seviye 0) hicbir sey gosterir;
 * eskiden burada sahte "Lv. 1, 0/100 XP" yaziyordu. Ilerleme sunucunun yuzdesidir.
 */
export function ProfileLevelRow({ username, showProgress }: ProfileLevelRowProps) {
  const { colors } = useTheme();
  const { messages, locale } = useLocale();
  const router = useRouter();
  const g = messages.gamification;
  const { data: stats, isLoading } = useQuery({
    queryKey: ['userStats', username],
    queryFn: () => getUserStats(username),
    enabled: !!username,
  });

  const progress = useSharedValue(0);
  const percent = stats ? (stats.isMaxLevel ? 100 : Math.max(stats.progressPercentage, 2)) : 0;
  useEffect(() => {
    progress.value = withDelay(200, withSpring(percent / 100, Springs.bouncy));
  }, [percent, progress]);
  const fillStyle = useAnimatedStyle(() => ({ width: `${Math.min(Math.max(progress.value, 0), 1) * 100}%` }));

  if (isLoading) {
    return (
      <View style={styles.wrap}>
        <Skeleton width="100%" height={44} borderRadius={BorderRadius.lg} />
      </View>
    );
  }
  if (!stats || stats.currentLevel < 1) return null;

  const formatter = new Intl.NumberFormat(locale);
  const isMax = stats.isMaxLevel ?? stats.nextLevelXp <= stats.currentXp;
  const remaining = stats.remainingXp ?? Math.max(0, stats.nextLevelXp - stats.currentXp);
  // Her aileden yalniz en yuksek kademe (web vitriniyle ayni): yan yana iki "Kidemli" gorunmesin.
  const recent = (stats.recentAchievements ?? []).reduce<NonNullable<typeof stats.recentAchievements>>((acc, badge) => {
    const family = findBadge(badge.code, badge.title)?.family ?? badge.title;
    const index = acc.findIndex((b) => (findBadge(b.code, b.title)?.family ?? b.title) === family);
    if (index === -1) acc.push(badge);
    else if ((badge.tier ?? 0) > (acc[index].tier ?? 0)) acc[index] = badge;
    return acc;
  }, []);
  const earned = stats.earnedAchievementCount ?? recent.length;
  const total = stats.totalAchievementCount ?? CATALOG_BADGES.length;
  const levelTitle = fill(g.levelTooltip, { level: stats.currentLevel, name: stats.levelName });

  const openBadges = () => {
    haptics.impactLight();
    router.push(`/badges/${encodeURIComponent(username)}`);
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.levelRow}>
        <TouchableOpacity
          onPress={() => router.push('/levels-and-badges')}
          accessibilityRole="button"
          accessibilityLabel={`${levelTitle}. ${g.howItWorks}`}
          hitSlop={8}
        >
          <LevelEmblem level={stats.currentLevel} size={40} />
        </TouchableOpacity>
        <View style={styles.levelInfo}>
          <View style={styles.levelHeader}>
            <Text style={[styles.levelName, { color: colors.text }]} numberOfLines={1}>
              {levelTitle}
            </Text>
            {showProgress ? (
              <Text style={[styles.xpText, { color: colors.textMuted }]}>
                {isMax
                  ? `${formatter.format(stats.currentXp)} XP`
                  : fill(g.xpProgress, { current: formatter.format(stats.currentXp), next: formatter.format(stats.nextLevelXp) })}
              </Text>
            ) : null}
          </View>
          {showProgress ? (
            <>
              <View
                style={[styles.bar, { backgroundColor: colors.surfaceHighlight }]}
                accessibilityRole="progressbar"
                accessibilityValue={{ min: 0, max: 100, now: percent }}
              >
                <Animated.View style={[styles.barFill, { backgroundColor: colors.primary }, fillStyle]} />
              </View>
              <Text style={[styles.xpText, { color: colors.textMuted }]}>
                {isMax ? g.maxLevel : fill(g.xpToNext, { xp: formatter.format(remaining), level: stats.currentLevel + 1 })}
                {(stats.currentStreak ?? 0) > 1 ? `  ·  ${fill(g.streak, { days: stats.currentStreak ?? 0 })}` : ''}
              </Text>
            </>
          ) : null}
        </View>
      </View>

      <TouchableOpacity
        style={[styles.badgeStrip, { backgroundColor: colors.surfaceHighlight }]}
        onPress={openBadges}
        accessibilityRole="button"
        accessibilityLabel={`${messages.nav.screenTitles.badges}, ${fill(g.badgesEarned, { earned, total })}`}
      >
        <View style={styles.badges}>
          {recent.length > 0 ? (
            recent.slice(0, 5).map((badge) => (
              <AchievementBadge key={badge.code ?? badge.title} code={badge.code} legacyTitle={badge.title} size={30} />
            ))
          ) : (
            <Text style={[styles.xpText, { color: colors.textMuted }]} numberOfLines={1}>
              {g.noBadges}
            </Text>
          )}
        </View>
        <Text style={[styles.badgeCount, { color: colors.textSecondary }]}>{fill(g.badgesEarned, { earned, total })}</Text>
        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: 'stretch',
    marginTop: Spacing.lg,
    gap: Spacing.sm,
  },
  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  levelInfo: {
    flex: 1,
    gap: 3,
  },
  levelHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  levelName: {
    flexShrink: 1,
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  bar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
  },
  xpText: {
    fontSize: FontSize.xs,
  },
  badgeStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
  },
  badges: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    minHeight: 30,
    alignItems: 'center',
  },
  badgeCount: {
    fontSize: FontSize.xs,
    fontWeight: '600',
  },
});
