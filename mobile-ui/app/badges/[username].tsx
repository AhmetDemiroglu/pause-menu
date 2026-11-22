import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '@/src/hooks/use-theme';
import { useLocale } from '@/src/hooks/use-locale';
import { useTabBarHeight } from '@/src/hooks/use-tab-bar-height';
import { Spacing, FontSize, BorderRadius } from '@/src/constants/theme';
import { ScreenHeader } from '@/src/components/shell';
import { SwipeBackEdge } from '@/src/components/common/SwipeBackEdge';
import { getUserAchievements } from '@/src/api/gamification';
import { BadgeListItem } from '@/src/components/gamification/BadgeListItem';
import { CATALOG_CATEGORIES, pickText } from '@/src/gamification/catalog';

/** Kullanicinin tum rozet katalogu: kazanilanlar, kilitliler ve her rozete ilerleme. */
export default function BadgesScreen() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const { messages, locale } = useLocale();
  const tabBarHeight = useTabBarHeight();
  const g = messages.gamification;
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['userAchievements', username],
    queryFn: () => getUserAchievements(username!),
    enabled: !!username,
    staleTime: 60 * 1000,
  });

  return (
    <SwipeBackEdge>
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <ScreenHeader title={messages.nav.screenTitles.badges} />
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: tabBarHeight + Spacing.md }]}
          showsVerticalScrollIndicator={false}
        >
          {data ? (
            <Text style={[styles.count, { color: colors.text }]}>
              {g.badgesEarned.replace('{earned}', String(data.earnedCount)).replace('{total}', String(data.totalCount))}
            </Text>
          ) : null}
          <Text style={[styles.intro, { color: colors.textSecondary }]}>{g.allBadgesDescription}</Text>
          <TouchableOpacity
            onPress={() => router.push('/levels-and-badges')}
            accessibilityRole="link"
            hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
            style={{ alignSelf: 'flex-start', paddingVertical: 4 }}
          >
            <Text style={[styles.link, { color: colors.primary }]}>{g.howItWorks}</Text>
          </TouchableOpacity>

          {isLoading ? (
            <ActivityIndicator style={{ marginTop: Spacing.xl }} color={colors.primary} />
          ) : isError || !data ? (
            <View style={styles.center}>
              <Text style={{ color: colors.textMuted }}>{g.loadError}</Text>
              <TouchableOpacity
                style={[styles.retry, { borderColor: colors.border }]}
                onPress={() => refetch()}
                accessibilityRole="button"
              >
                <Text style={{ color: colors.text }}>{g.retry}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            CATALOG_CATEGORIES.map((category) => {
              const items = data.items.filter((i) => i.category === category.key);
              if (items.length === 0) return null;
              const earned = items.filter((i) => i.earnedAt).length;
              return (
                <View key={category.key} style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>{pickText(category.name, locale)}</Text>
                    <Text style={[styles.sectionCount, { color: colors.textMuted }]}>
                      {earned} / {items.length}
                    </Text>
                  </View>
                  {items.map((item) => (
                    <BadgeListItem key={item.code} item={item} showLocks />
                  ))}
                </View>
              );
            })
          )}
        </ScrollView>
      </View>
    </SwipeBackEdge>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.lg, gap: Spacing.sm },
  count: { fontSize: FontSize.xxl, fontWeight: '800' },
  intro: { fontSize: FontSize.sm, lineHeight: 20 },
  link: { fontSize: FontSize.sm, fontWeight: '700', marginBottom: Spacing.sm },
  center: { alignItems: 'center', gap: Spacing.md, marginTop: Spacing.xl },
  retry: { borderWidth: 1, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm },
  section: { gap: Spacing.sm, marginTop: Spacing.md },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: '700' },
  sectionCount: { fontSize: FontSize.sm },
});
