import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AchievementBadge } from '@/src/components/gamification/AchievementBadge';
import { useTheme } from '@/src/hooks/use-theme';
import { useLocale } from '@/src/hooks/use-locale';
import { Spacing, FontSize, BorderRadius } from '@/src/constants/theme';
import { formatNumericDate } from '@/src/utils/date';

export type BadgeListItemData = {
  code: string;
  title: string;
  description: string;
  tier: number;
  xpReward: number;
  threshold: number;
  /** null: herkese acik katalog (ilerleme yok). */
  current: number | null;
  earnedAt: string | null;
};

/** Tek rozet satiri: rozet, ad, kademe, aciklama ve ilerleme ya da kazanilma tarihi. */
export function BadgeListItem({ item, showLocks }: { item: BadgeListItemData; showLocks: boolean }) {
  const { colors } = useTheme();
  const { messages, locale } = useLocale();
  const g = messages.gamification;
  const locked = showLocks && !item.earnedAt;
  const ratio = item.current !== null && item.threshold > 0 ? Math.min(1, item.current / item.threshold) : null;

  return (
    <View style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <AchievementBadge code={item.code} locked={locked} size={50} label={item.title} />
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: locked ? colors.textMuted : colors.text }]} numberOfLines={1}>
            {item.title}
          </Text>
        </View>
        <Text style={[styles.description, { color: colors.textSecondary }]}>{item.description}</Text>
        <View style={styles.metaRow}>
          {item.earnedAt ? (
            <Text style={[styles.meta, { color: '#10b981' }]}>
              {g.earnedOn.replace('{date}', formatNumericDate(item.earnedAt, locale))}
            </Text>
          ) : ratio !== null ? (
            <>
              <View style={[styles.bar, { backgroundColor: colors.surfaceHighlight }]}>
                <View style={[styles.barFill, { width: `${ratio * 100}%`, backgroundColor: colors.primary }]} />
              </View>
              <Text style={[styles.meta, { color: colors.textMuted }]}>
                {Math.min(item.current ?? 0, item.threshold)} / {item.threshold}
              </Text>
            </>
          ) : null}
          {item.xpReward > 0 ? (
            <Text style={[styles.meta, styles.xp, { color: colors.primary }]}>{g.rewardXp.replace('{xp}', String(item.xpReward))}</Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  body: { flex: 1, gap: 2 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  title: { flexShrink: 1, fontSize: FontSize.md, fontWeight: '700' },
  description: { fontSize: FontSize.sm, lineHeight: 18 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: 4 },
  meta: { fontSize: FontSize.xs },
  xp: { marginLeft: 'auto', fontWeight: '700' },
  bar: { flex: 1, height: 5, borderRadius: 3, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 3 },
});
