import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AchievementBadge } from '@/src/components/gamification/AchievementBadge';
import { useTheme } from '@/src/hooks/use-theme';
import { useLocale } from '@/src/hooks/use-locale';
import { Spacing, FontSize, BorderRadius } from '@/src/constants/theme';
import { pickText, type CatalogFamily } from '@/src/gamification/catalog';

/**
 * Herkese acik katalogda aile basina tek kart: ad, kisa aciklama, kademeler yan yana
 * (altlarinda esik ve XP). Web'deki FamilyCatalog ile ayni duzen.
 */
export function FamilyCard({ family }: { family: CatalogFamily }) {
  const { colors } = useTheme();
  const { messages, locale } = useLocale();
  const g = messages.gamification;
  const unit = family.unit ? pickText(family.unit, locale) : null;
  const showThreshold = family.badges.length > 1 || family.key === 'list_star';

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.name, { color: colors.text }]}>{pickText(family.name, locale)}</Text>
      <Text style={[styles.summary, { color: colors.textSecondary }]}>{pickText(family.summary, locale)}</Text>
      <View style={styles.tiers}>
        {family.badges.map((badge) => (
          <View key={badge.code} style={styles.tier}>
            <AchievementBadge
              code={badge.code}
              size={44}
              label={`${pickText(badge.title, locale)}: ${pickText(badge.description, locale)}`}
            />
            {showThreshold ? (
              <Text style={[styles.threshold, { color: colors.text }]}>
                {family.key === 'level'
                  ? g.levelShortLabel.replace('{level}', String(badge.threshold))
                  : `${badge.threshold}${unit ? ` ${unit}` : ''}`}
              </Text>
            ) : null}
            {badge.xpReward > 0 ? (
              <Text style={[styles.xp, { color: colors.primary }]}>+{badge.xpReward} XP</Text>
            ) : null}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    gap: 2,
  },
  name: { fontSize: FontSize.md, fontWeight: '700' },
  summary: { fontSize: FontSize.sm, lineHeight: 18 },
  tiers: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.sm },
  tier: { width: 56, alignItems: 'center' },
  threshold: { fontSize: 11, fontWeight: '700', marginTop: 2, textAlign: 'center' },
  xp: { fontSize: 10, fontWeight: '600', textAlign: 'center' },
});
