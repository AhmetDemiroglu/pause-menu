import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '@/src/hooks/use-theme';
import { useLocale } from '@/src/hooks/use-locale';
import { useTabBarHeight } from '@/src/hooks/use-tab-bar-height';
import { Spacing, FontSize, BorderRadius } from '@/src/constants/theme';
import { ScreenHeader } from '@/src/components/shell';
import { SwipeBackEdge } from '@/src/components/common/SwipeBackEdge';
import { Avatar } from '@/src/components/common/Avatar';
import { getLeaderboard } from '@/src/api/gamification';
import { LevelEmblem } from '@/src/components/gamification/AchievementBadge';
import { FamilyCard } from '@/src/components/gamification/FamilyCard';
import { useAuth } from '@/src/hooks/use-auth';
import {
  CATALOG_CATEGORIES,
  CATALOG_FAMILIES,
  CATALOG_LEVELS,
  CATALOG_RULES,
  CATALOG_TIERS,
  pickText,
} from '@/src/gamification/catalog';
import type { LeaderboardPeriod } from '@/src/models/stats';

const TIER_REWARDS = [10, 25, 50, 100, 200];

/**
 * Seviyeler ve rozetler nasil calisir: XP kurallari, seviye merdiveni, rozet katalogu, liderlik
 * ve adil oyun kurallari. Sayilar ve metinler web ile ayni catalog.json'dan gelir.
 */
export default function LevelsAndBadgesScreen() {
  const { colors } = useTheme();
  const { messages, locale } = useLocale();
  const tabBarHeight = useTabBarHeight();
  const g = messages.gamification;
  const p = g.page;
  const formatter = new Intl.NumberFormat(locale);

  return (
    <SwipeBackEdge>
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <ScreenHeader title={messages.nav.screenTitles.levels} />
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: tabBarHeight + Spacing.md }]}
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.title, { color: colors.text }]}>{messages.nav.screenTitles.levels}</Text>
          <Text style={[styles.intro, { color: colors.textSecondary }]}>{p.subtitle}</Text>

          <SectionTitle title={p.xpTitle} intro={p.xpIntro} />
          {CATALOG_RULES.map((rule) => (
            <View key={rule.key} style={[styles.card, styles.ruleRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[styles.ruleLabel, { color: colors.text }]}>{pickText(rule.label, locale)}</Text>
                <Text style={[styles.small, { color: colors.textSecondary }]}>{pickText(rule.note, locale)}</Text>
                <Text style={[styles.small, { color: colors.textMuted }]}>
                  {p.dailyCap.replace('{cap}', rule.dailyCap ? String(rule.dailyCap) : rule.key === 'register' ? p.once : p.none)}
                </Text>
              </View>
              <Text style={[styles.ruleXp, { color: colors.primary }]}>+{rule.xp}</Text>
            </View>
          ))}
          <Text style={[styles.small, { color: colors.textMuted }]}>
            {p.badgeXp} {CATALOG_TIERS.map((tier, i) => `${pickText(tier.name, locale)} ${TIER_REWARDS[i]}`).join(', ')}.
          </Text>

          <SectionTitle title={p.levelsTitle} intro={p.levelsIntro} />
          <View style={styles.levelGrid}>
            {CATALOG_LEVELS.map((level) => (
              <View key={level.number} style={[styles.card, styles.levelCell, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <LevelEmblem level={level.number} size={52} />
                <Text style={[styles.levelName, { color: colors.text }]}>{g.levelLabel.replace('{level}', String(level.number))}</Text>
                <Text style={[styles.small, { color: colors.textSecondary }]}>{pickText(level.name, locale)}</Text>
                <Text style={[styles.small, { color: colors.primary, fontWeight: '700' }]}>{formatter.format(level.requiredXp)} XP</Text>
              </View>
            ))}
          </View>

          <SectionTitle title={p.badgesTitle} intro={p.badgesIntro} />
          {CATALOG_CATEGORIES.map((category) => (
            <View key={category.key} style={{ gap: Spacing.sm }}>
              <Text style={[styles.categoryTitle, { color: colors.text }]}>{pickText(category.name, locale)}</Text>
              {CATALOG_FAMILIES.filter((f) => f.category === category.key).map((family) => (
                <FamilyCard key={family.key} family={family} />
              ))}
            </View>
          ))}

          <SectionTitle title={p.leaderboardTitle} intro={p.leaderboardIntro} />
          <Leaderboard />

          <SectionTitle title={p.fairTitle} />
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, gap: Spacing.sm }]}>
            {[p.fair1, p.fair2, p.fair3, p.fair4, p.fair5].map((line) => (
              <View key={line} style={styles.fairRow}>
                <View style={styles.dot} />
                <Text style={[styles.body, { color: colors.textSecondary }]}>{line}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    </SwipeBackEdge>
  );
}

function SectionTitle({ title, intro }: { title: string; intro?: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ marginTop: Spacing.lg, gap: 4 }}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
      {intro ? <Text style={[styles.small, { color: colors.textSecondary, lineHeight: 18 }]}>{intro}</Text> : null}
    </View>
  );
}

function Leaderboard() {
  const { colors } = useTheme();
  const { messages, locale } = useLocale();
  const { user } = useAuth();
  const router = useRouter();
  const g = messages.gamification;
  const [period, setPeriod] = useState<LeaderboardPeriod>('week');
  const formatter = new Intl.NumberFormat(locale);
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['leaderboard', period],
    queryFn: () => getLeaderboard(period, 1),
    staleTime: 5 * 60 * 1000,
  });

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, gap: Spacing.sm }]}>
      <View style={[styles.segment, { backgroundColor: colors.surfaceHighlight }]}>
        {(['week', 'all'] as const).map((value) => (
          <TouchableOpacity
            key={value}
            style={[styles.segmentItem, period === value && { backgroundColor: colors.card }]}
            onPress={() => setPeriod(value)}
            accessibilityRole="tab"
            accessibilityState={{ selected: period === value }}
          >
            <Text style={[styles.segmentText, { color: period === value ? colors.text : colors.textMuted }]}>
              {value === 'week' ? g.leaderboardWeek : g.leaderboardAll}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginVertical: Spacing.lg }} />
      ) : isError ? (
        <TouchableOpacity onPress={() => refetch()} accessibilityRole="button">
          <Text style={[styles.small, { color: colors.textMuted, textAlign: 'center', marginVertical: Spacing.lg }]}>
            {g.loadError} {g.retry}
          </Text>
        </TouchableOpacity>
      ) : !data || data.items.length === 0 ? (
        <Text style={[styles.small, { color: colors.textMuted, textAlign: 'center', marginVertical: Spacing.lg }]}>{g.leaderboardEmpty}</Text>
      ) : (
        data.items.slice(0, 20).map((row) => {
          const isMe = user?.username === row.username;
          return (
            <TouchableOpacity
              key={row.userId}
              style={[styles.leaderRow, isMe && { backgroundColor: colors.surfaceHighlight }]}
              onPress={() => router.push(`/profiles/${row.username}`)}
              accessibilityRole="link"
            >
              <Text style={[styles.rank, { color: colors.textSecondary }]}>{row.rank}</Text>
              <Avatar uri={row.profileImageUrl} name={row.username} size={32} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.ruleLabel, { color: colors.text }]} numberOfLines={1}>
                  {row.username}
                  {isMe ? `  ${g.leaderboardYou}` : ''}
                </Text>
                <Text style={[styles.small, { color: colors.textMuted }]} numberOfLines={1}>
                  {g.levelTooltip.replace('{level}', String(row.level)).replace('{name}', row.levelName)}
                </Text>
              </View>
              <LevelEmblem level={row.level} size={24} />
              <Text style={[styles.xpValue, { color: colors.text }]}>{formatter.format(row.xp)} XP</Text>
            </TouchableOpacity>
          );
        })
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.lg, gap: Spacing.sm },
  title: { fontSize: FontSize.xxxl, fontWeight: '800' },
  intro: { fontSize: FontSize.md, lineHeight: 22 },
  sectionTitle: { fontSize: FontSize.xl, fontWeight: '800' },
  categoryTitle: { fontSize: FontSize.md, fontWeight: '700', marginTop: Spacing.sm },
  card: { borderWidth: StyleSheet.hairlineWidth, borderRadius: BorderRadius.lg, padding: Spacing.md },
  ruleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  ruleLabel: { fontSize: FontSize.md, fontWeight: '600' },
  ruleXp: { fontSize: FontSize.lg, fontWeight: '800' },
  small: { fontSize: FontSize.xs },
  body: { flex: 1, fontSize: FontSize.sm, lineHeight: 20 },
  levelGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  levelCell: { width: '31%', alignItems: 'center', gap: 2 },
  levelName: { fontSize: FontSize.sm, fontWeight: '700', marginTop: 4 },
  fairRow: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start' },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10b981', marginTop: 7 },
  segment: { flexDirection: 'row', borderRadius: BorderRadius.md, padding: 3 },
  segmentItem: { flex: 1, alignItems: 'center', paddingVertical: 6, borderRadius: BorderRadius.sm },
  segmentText: { fontSize: FontSize.sm, fontWeight: '700' },
  leaderRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: 6, paddingHorizontal: 4, borderRadius: BorderRadius.md },
  rank: { width: 22, fontSize: FontSize.sm, fontWeight: '700', textAlign: 'center' },
  xpValue: { fontSize: FontSize.xs, fontWeight: '700', minWidth: 56, textAlign: 'right' },
});
