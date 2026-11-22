import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/src/hooks/use-theme';
import { useLocale } from '@/src/hooks/use-locale';
import { BrandLogo } from '@/src/components/common/BrandLogo';
import { FontSize, Spacing, BorderRadius, Shadows } from '@/src/constants/theme';
import * as haptics from '@/src/utils/haptics';
import { TrendingGames } from './TrendingGames';
import { LeaderboardCard } from './LeaderboardCard';
import type { HomeGame, LeaderboardUser } from '@/src/models/home';

interface BentoGridProps {
  trendingGames: HomeGame[];
  leaderboard: LeaderboardUser[];
  showJoinCta: boolean;
}

export function BentoGrid({ trendingGames, leaderboard, showJoinCta }: BentoGridProps) {
  const { colors } = useTheme();
  const { messages } = useLocale();
  const router = useRouter();

  return (
    <View style={styles.container}>
      <TrendingGames games={trendingGames} />

      {/* Guncel kal karti: cikis takvimine ve oyun haberlerine goturur. */}
      <View style={[styles.agendaCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <BrandLogo variant="primary" height={22} style={styles.agendaLogo} />
        <Text style={[styles.agendaTitle, { color: colors.text }]}>{messages.agenda.homeCardTitle}</Text>
        <Text style={[styles.agendaDescription, { color: colors.textSecondary }]}>{messages.agenda.homeCardDescription}</Text>
        <View style={styles.agendaActions}>
          <Pressable
            style={({ pressed }) => [styles.agendaButton, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}
            onPress={() => {
              haptics.impactLight();
              router.push('/agenda');
            }}
          >
            <Ionicons name="calendar" size={16} color="#ffffff" />
            <Text style={[styles.agendaButtonText, { color: '#ffffff' }]}>{messages.nav.agenda}</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.agendaButton, styles.agendaButtonOutline, { borderColor: colors.border, opacity: pressed ? 0.85 : 1 }]}
            onPress={() => {
              haptics.impactLight();
              router.push('/news');
            }}
          >
            <Ionicons name="newspaper-outline" size={16} color={colors.text} />
            <Text style={[styles.agendaButtonText, { color: colors.text }]}>{messages.nav.news}</Text>
          </Pressable>
        </View>
      </View>

      <LeaderboardCard users={leaderboard} />

      {showJoinCta && (
        <LinearGradient
          colors={[colors.primary, colors.accent]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.ctaCard, Shadows.md]}
        >
          <BrandLogo variant="primary" height={44} tone="mono" />
          <Text style={styles.ctaTitle}>{messages.home.joinCta}</Text>
          <Text style={styles.ctaDescription}>{messages.home.joinDescription}</Text>
          <Pressable
            style={styles.ctaButton}
            onPress={() => {
              haptics.impactLight();
              router.push('/(auth)/register');
            }}
          >
            <Text style={styles.ctaButtonText}>{messages.home.signUp}</Text>
          </Pressable>
        </LinearGradient>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 0,
  },
  agendaCard: {
    gap: Spacing.xs,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  agendaActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  agendaButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  agendaButtonOutline: {
    borderWidth: 1,
  },
  agendaButtonText: {
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
  agendaLogo: {
    alignSelf: 'flex-start',
    marginBottom: 2,
  },
  agendaTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  agendaDescription: {
    fontSize: FontSize.sm,
  },
  ctaCard: {
    marginHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xxl,
    alignItems: 'center',
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  ctaTitle: {
    fontSize: FontSize.xxl,
    fontWeight: '700',
    color: '#ffffff',
  },
  ctaDescription: {
    fontSize: FontSize.md,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
  },
  ctaButton: {
    backgroundColor: '#ffffff',
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.md,
    marginTop: Spacing.sm,
  },
  ctaButtonText: {
    color: '#FF2E88',
    fontSize: FontSize.md,
    fontWeight: '700',
  },
});
