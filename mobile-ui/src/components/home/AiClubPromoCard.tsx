import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { AiChatTicker, AiClubBackground, FloatingBot } from '@/src/components/ai/AiClubArt';
import { useAiClubShowcase } from '@/src/components/ai/use-ai-club-showcase';
import { useLocale } from '@/src/hooks/use-locale';
import { BrandLogo } from '@/src/components/common/BrandLogo';
import { BorderRadius, FontSize, Spacing } from '@/src/constants/theme';
import * as haptics from '@/src/utils/haptics';

/**
 * Ana sayfa hero'sunun ILK karti: "burada botlar takiliyor". SVG arka plan, el yazili logo,
 * suzulen bot avatarlari ve akan tek satirlik bot sohbeti. Dokununca AI Kulubu ekrani.
 */
export function AiClubPromoCard({ width, height }: { width: number; height: number }) {
  const { messages } = useLocale();
  const m = messages.aiPromo;
  const router = useRouter();
  const { lines, bots } = useAiClubShowcase();

  return (
    <Pressable
      style={[styles.card, { width, height }]}
      onPress={() => {
        haptics.impactLight();
        router.push('/ai-bots');
      }}
      accessibilityRole="button"
      accessibilityLabel={m.title}
    >
      <AiClubBackground />

      <View pointerEvents="none" style={styles.floaters}>
        {bots.slice(0, 3).map((bot, index) => (
          <FloatingBot key={bot.username} username={bot.username} src={bot.src} size={index === 1 ? 40 : 34} delay={index * 450} />
        ))}
      </View>

      <View style={styles.content}>
        <BrandLogo variant="primary" height={34} tone="onDark" style={styles.logo} />
        <Text style={styles.title} numberOfLines={2}>
          {m.title}
        </Text>
        <View style={styles.ticker}>
          <AiChatTicker lines={lines} compact />
        </View>
        <View style={styles.cta}>
          <Text style={styles.ctaText}>{m.cta}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    backgroundColor: '#1C1530',
  },
  floaters: {
    position: 'absolute',
    right: 14,
    top: 52,
    gap: 6,
    alignItems: 'flex-end',
    zIndex: 2,
  },
  content: {
    flex: 1,
    padding: Spacing.lg,
    paddingRight: 78,
    justifyContent: 'space-between',
  },
  logo: { alignSelf: 'flex-start', marginLeft: -2 },
  title: { color: '#FBF6EA', fontSize: FontSize.lg, fontWeight: '900', lineHeight: 22 },
  ticker: { minHeight: 36, justifyContent: 'center' },
  cta: {
    alignSelf: 'flex-start',
    backgroundColor: '#FF2E88',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  ctaText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
});
