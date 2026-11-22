import React from 'react';
import { ActivityIndicator, Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { useQuery } from '@tanstack/react-query';
import { ScreenWrapper } from '@/src/components/common/ScreenWrapper';
import { ScreenHeader } from '@/src/components/shell';
import { EmptyState } from '@/src/components/common/EmptyState';
import { NewsImage } from '@/src/components/news/NewsCard';
import { useTheme } from '@/src/hooks/use-theme';
import { useLocale } from '@/src/hooks/use-locale';
import { useTabBarHeight } from '@/src/hooks/use-tab-bar-height';
import { newsApi } from '@/src/api/news';
import { formatRelativeTime } from '@/src/utils/date';
import { getResizedGameImageUrl } from '@/src/utils/image';
import * as haptics from '@/src/utils/haptics';
import { BorderRadius, FontSize, Spacing } from '@/src/constants/theme';
import { pickNewsBody, pickNewsText } from '@/src/models/news';

/** Kaynak yazi uygulama ici tarayicida acilir; acilamazsa sistem tarayicisi. */
const openSource = async (url: string) => {
  haptics.impactLight();
  try {
    await WebBrowser.openBrowserAsync(url);
  } catch {
    Linking.openURL(url).catch(() => undefined);
  }
};

/** Haber detayi (web /news/[slug] karsiligi). */
export default function NewsDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { colors } = useTheme();
  const { messages, locale } = useLocale();
  const m = messages.news;
  const router = useRouter();
  const tabBarHeight = useTabBarHeight();

  const { data: article, isPending, isError, refetch } = useQuery({
    queryKey: ['news-detail', slug],
    queryFn: () => newsApi.get(slug!),
    enabled: !!slug,
    staleTime: 10 * 60 * 1000,
  });

  if (isPending) {
    return (
      <ScreenWrapper noPadding safeArea={false}>
        <ScreenHeader />
        <ActivityIndicator style={{ marginTop: Spacing.xl }} color={colors.primary} />
      </ScreenWrapper>
    );
  }

  if (isError || !article) {
    return (
      <ScreenWrapper noPadding safeArea={false}>
        <ScreenHeader />
        <EmptyState
          icon="newspaper-outline"
          title={m.loadError}
          action={
            <Pressable onPress={() => refetch()}>
              <Text style={[styles.retryText, { color: colors.primary }]}>{messages.common.retry}</Text>
            </Pressable>
          }
        />
      </ScreenWrapper>
    );
  }

  const { title, summary } = pickNewsText(article, locale);
  const paragraphs = pickNewsBody(article, locale)
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
  const primary = article.sources[0];
  const caption =
    article.imageKind === 'generated' ? m.representativeImage : article.game ? m.imageFromGame.replace('{game}', article.game.name) : null;

  return (
    <ScreenWrapper noPadding safeArea={false}>
      <ScreenHeader />
      <ScrollView contentContainerStyle={{ paddingBottom: tabBarHeight + Spacing.xl }} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <View style={styles.metaRow}>
            <Text style={[styles.category, { color: colors.primary }]}>{m.categories[article.category]}</Text>
            <Text style={[styles.meta, { color: colors.textMuted }]}>{formatRelativeTime(article.publishedAt, locale)}</Text>
          </View>
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          <Text style={[styles.summary, { color: colors.textSecondary }]}>{summary}</Text>
        </View>

        {article.imageKind !== 'none' ? (
          <View style={styles.figure}>
            <NewsImage item={article} width={1280} style={styles.cover} />
            {caption ? <Text style={[styles.caption, { color: colors.textMuted }]}>{caption}</Text> : null}
          </View>
        ) : null}

        <View style={styles.content}>
          {paragraphs.map((p, i) => (
            <Text key={i} style={[styles.paragraph, { color: colors.text }]}>
              {p}
            </Text>
          ))}

          {primary ? (
            <Pressable onPress={() => openSource(primary.url)} style={({ pressed }) => [styles.primaryButton, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}>
              <Text style={styles.primaryButtonText} numberOfLines={1}>
                {m.readAtSource.replace('{source}', primary.name)}
              </Text>
              <Ionicons name="open-outline" size={16} color="#ffffff" />
            </Pressable>
          ) : null}

          {article.game ? (
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>{m.relatedGame}</Text>
              <Pressable
                onPress={() => {
                  haptics.selection();
                  router.push(`/game/${article.game!.slug || article.game!.id}`);
                }}
                style={[styles.gameRow, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                {article.game.backgroundImage ? (
                  <Image source={{ uri: getResizedGameImageUrl(article.game.backgroundImage, 420) }} style={styles.gameThumb} resizeMode="cover" />
                ) : null}
                <View style={{ flex: 1 }}>
                  <Text style={[styles.gameName, { color: colors.text }]} numberOfLines={1}>
                    {article.game.name}
                  </Text>
                  {article.game.released ? <Text style={[styles.meta, { color: colors.textMuted }]}>{article.game.released}</Text> : null}
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </Pressable>
            </View>
          ) : null}

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.section}>
            <Text style={[styles.sourcesTitle, { color: colors.text }]}>{m.sources}</Text>
            <Text style={[styles.meta, { color: colors.textSecondary }]}>{m.sourcesHint}</Text>
            {article.sources.map((s) => (
              <Pressable key={s.url} onPress={() => openSource(s.url)} style={[styles.sourceRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Ionicons name="open-outline" size={16} color={colors.textMuted} style={{ marginTop: 2 }} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.sourceName, { color: colors.text }]}>{s.name}</Text>
                  <Text style={[styles.meta, { color: colors.textSecondary }]}>{s.title}</Text>
                </View>
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  category: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  meta: {
    fontSize: FontSize.sm,
    lineHeight: 19,
  },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: '800',
    lineHeight: 32,
  },
  summary: {
    fontSize: FontSize.md,
    lineHeight: 23,
  },
  figure: {
    marginVertical: Spacing.lg,
    gap: Spacing.xs,
  },
  cover: {
    width: '100%',
    aspectRatio: 16 / 9,
  },
  caption: {
    fontSize: FontSize.xs,
    paddingHorizontal: Spacing.lg,
  },
  paragraph: {
    fontSize: FontSize.md,
    lineHeight: 25,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: FontSize.md,
    fontWeight: '700',
    flexShrink: 1,
  },
  section: {
    gap: Spacing.sm,
  },
  sectionLabel: {
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  gameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
  },
  gameThumb: {
    width: 88,
    height: 50,
    borderRadius: BorderRadius.sm,
  },
  gameName: {
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: Spacing.sm,
  },
  sourcesTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
  },
  sourceRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  sourceName: {
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
  retryText: {
    fontSize: FontSize.md,
    fontWeight: '600',
  },
});
