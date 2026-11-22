import React, { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View, type ImageStyle, type StyleProp } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useTheme } from '@/src/hooks/use-theme';
import { useLocale } from '@/src/hooks/use-locale';
import { formatRelativeTime } from '@/src/utils/date';
import { getResizedGameImageUrl } from '@/src/utils/image';
import * as haptics from '@/src/utils/haptics';
import { BorderRadius, FontSize, Spacing } from '@/src/constants/theme';
import { pickNewsText, type NewsListItem } from '@/src/models/news';

/** Haber gorseli: katalog gorseli RAWG'de kucultulur, uretilen gorsel R2'de hazir. Yoksa marka renkli zemin. */
export function NewsImage({ item, width, style }: { item: NewsListItem; width: 640 | 1280; style?: StyleProp<ImageStyle> }) {
  const { colors } = useTheme();
  const [failed, setFailed] = useState(false);
  const uri = item.imageKind === 'catalog' ? getResizedGameImageUrl(item.imageUrl, width) : item.imageUrl ?? undefined;

  if (!uri || failed) {
    return (
      <LinearGradient
        colors={[`${colors.primary}66`, `${colors.primary}1A`, colors.background]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[style as object, styles.placeholder]}
      >
        <Ionicons name="newspaper-outline" size={34} color={colors.primary} />
      </LinearGradient>
    );
  }

  return <Image source={{ uri }} style={style} resizeMode="cover" onError={() => setFailed(true)} />;
}

/** Liste karti: ustte 16:9 gorsel, altta kategori, baslik, spot, kaynak ve zaman. */
export function NewsCard({ item }: { item: NewsListItem }) {
  const { colors } = useTheme();
  const { messages, locale } = useLocale();
  const router = useRouter();
  const { title, summary } = pickNewsText(item, locale);
  // Baslik kesilmez. Ozet 3 satiri asarsa kesilir ve "Devamini gor" cikar (satir sayisi olculur).
  const [summaryLines, setSummaryLines] = useState(0);

  return (
    <Pressable
      onPress={() => {
        haptics.selection();
        router.push(`/news/${item.slug}`);
      }}
      style={({ pressed }) => [styles.card, { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.85 : 1 }]}
    >
      <NewsImage item={item} width={640} style={styles.image} />
      <View style={styles.body}>
        <Text style={[styles.category, { color: colors.primary }]}>{messages.news.categories[item.category]}</Text>
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        {/* Gorunmez olcum kopyasi: tam metnin kac satir tuttugunu verir. */}
        <Text
          style={[styles.summary, styles.measure]}
          onTextLayout={(e) => setSummaryLines(e.nativeEvent.lines.length)}
          pointerEvents="none"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          {summary}
        </Text>
        <Text style={[styles.summary, { color: colors.textSecondary }]} numberOfLines={3}>
          {summary}
        </Text>
        {summaryLines > 3 ? <Text style={[styles.readMore, { color: colors.primary }]}>{messages.news.readMore}</Text> : null}
        <Text style={[styles.meta, { color: colors.textMuted }]}>
          {item.sourceName}
          {item.sourceCount > 1 ? ` ${messages.news.sourceCount.replace('{count}', String(item.sourceCount - 1))}` : ''}
          {' · '}
          {formatRelativeTime(item.publishedAt, locale)}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    aspectRatio: 16 / 9,
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  category: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: FontSize.md,
    fontWeight: '700',
    lineHeight: 21,
  },
  summary: {
    fontSize: FontSize.sm,
    lineHeight: 19,
  },
  meta: {
    fontSize: FontSize.xs,
    marginTop: 2,
  },
  measure: {
    position: 'absolute',
    opacity: 0,
    left: Spacing.md,
    right: Spacing.md,
  },
  readMore: {
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
});
