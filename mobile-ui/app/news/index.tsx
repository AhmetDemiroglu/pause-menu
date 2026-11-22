import React, { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { ScreenWrapper } from '@/src/components/common/ScreenWrapper';
import { ScreenHeader } from '@/src/components/shell';
import { EmptyState } from '@/src/components/common/EmptyState';
import { SearchField } from '@/src/components/common/SearchField';
import { Skeleton } from '@/src/components/common/Skeleton';
import { NewsCard, NewsImage } from '@/src/components/news/NewsCard';
import { useTheme } from '@/src/hooks/use-theme';
import { useLocale } from '@/src/hooks/use-locale';
import { useDebounce } from '@/src/hooks/use-debounce';
import { useTabBarHeight } from '@/src/hooks/use-tab-bar-height';
import { newsApi } from '@/src/api/news';
import { formatRelativeTime } from '@/src/utils/date';
import * as haptics from '@/src/utils/haptics';
import { BorderRadius, FontSize, Spacing } from '@/src/constants/theme';
import { NEWS_CATEGORIES, pickNewsText, type NewsCategory, type NewsListItem } from '@/src/models/news';

type Filter = NewsCategory | 'all';

const FEATURED_WIDTH = 280;
const FEATURED_HEIGHT = 190;

/**
 * Oyun haberleri (web /news karsiligi). Girissiz okunur. Iki dil birlikte geldigi icin sorgu
 * anahtarinda dil yok: dil degisince ayni veri yeni dilde cizilir.
 * Ustte arama + tarih, altinda one cikanlar seridi (takvimdeki vitrinle ayni dil), sonra liste.
 */
export default function NewsScreen() {
  const { colors } = useTheme();
  const { messages } = useLocale();
  const m = messages.news;
  const tabBarHeight = useTabBarHeight();
  const [filter, setFilter] = useState<Filter>('all');
  const [searchInput, setSearchInput] = useState('');
  const [days, setDays] = useState(0);
  const debounced = useDebounce(searchInput.trim(), 350);
  const search = debounced.length >= 2 ? debounced : '';
  const category = filter === 'all' ? null : filter;
  const isFiltering = search !== '' || days !== 0;

  const query = useInfiniteQuery({
    queryKey: ['news', filter, search, days],
    queryFn: ({ pageParam }) => newsApi.list(pageParam, category, search, days),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page * last.pageSize < last.totalCount ? last.page + 1 : undefined),
    staleTime: 2 * 60 * 1000,
  });
  const featuredQuery = useQuery({ queryKey: ['news-featured'], queryFn: () => newsApi.featured(6), staleTime: 2 * 60 * 1000 });

  const all = query.data?.pages.flatMap((p) => p.items) ?? [];
  const showFeatured = category === null && !isFiltering && (featuredQuery.data?.length ?? 0) > 0;
  const featured = showFeatured ? featuredQuery.data! : [];
  const featuredIds = new Set(featured.map((f) => f.id));
  const items = all.filter((i) => !featuredIds.has(i.id));

  const filters: { key: Filter; label: string }[] = [
    { key: 'all', label: m.all },
    ...NEWS_CATEGORIES.map((c) => ({ key: c as Filter, label: m.categories[c] })),
  ];
  const dateOptions: { key: number; label: string }[] = [
    { key: 0, label: m.dateAll },
    { key: 1, label: m.dateToday },
    { key: 3, label: m.date3 },
    { key: 7, label: m.date7 },
    { key: 30, label: m.date30 },
  ];

  const chip = (key: string, label: string, active: boolean, onPress: () => void) => (
    <Pressable
      key={key}
      onPress={() => {
        haptics.selection();
        onPress();
      }}
      style={[styles.chip, { backgroundColor: active ? colors.primary : colors.surface, borderColor: colors.border }]}
    >
      <Text style={[styles.chipText, { color: active ? '#ffffff' : colors.text }]}>{label}</Text>
    </Pressable>
  );

  return (
    <ScreenWrapper noPadding safeArea={false}>
      <ScreenHeader title={messages.nav.screenTitles.news} />
      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <View style={styles.cardWrap}>
            <NewsCard item={item} />
          </View>
        )}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        ListHeaderComponent={
          <View style={styles.header}>
            <SearchField value={searchInput} onChangeText={setSearchInput} placeholder={m.searchPlaceholder} clearLabel={m.searchClear} style={styles.inset} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
              {dateOptions.map((d) => chip(`d${d.key}`, d.label, days === d.key, () => setDays(d.key)))}
            </ScrollView>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
              {filters.map((f) => chip(f.key, f.label, f.key === filter, () => setFilter(f.key)))}
            </ScrollView>

            {showFeatured ? (
              <View>
                <View style={[styles.sectionTitleRow, styles.inset]}>
                  <Ionicons name="flame" size={18} color={colors.warning ?? colors.primary} />
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>{m.featured}</Text>
                </View>
                <FlatList
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  data={featured}
                  keyExtractor={(n) => `f-${n.id}`}
                  contentContainerStyle={styles.featuredList}
                  snapToInterval={FEATURED_WIDTH + Spacing.md}
                  decelerationRate="fast"
                  renderItem={({ item }) => <FeaturedCard item={item} />}
                />
                <View style={[styles.sectionTitleRow, styles.inset]}>
                  <Ionicons name="newspaper-outline" size={18} color={colors.primary} />
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>{m.latest}</Text>
                </View>
              </View>
            ) : isFiltering && !query.isPending ? (
              <Text style={[styles.resultCount, styles.inset, { color: colors.textSecondary }]}>
                {m.resultCount.replace('{count}', String(query.data?.pages[0]?.totalCount ?? 0))}
              </Text>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          query.isPending ? (
            <View style={[styles.skeletons, styles.inset]}>
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} width="100%" height={260} borderRadius={BorderRadius.lg} />
              ))}
            </View>
          ) : (
            <EmptyState
              icon="newspaper-outline"
              title={query.isError ? m.loadError : isFiltering ? m.noResults : m.empty}
              action={
                query.isError ? (
                  <Pressable onPress={() => query.refetch()}>
                    <Text style={[styles.retryText, { color: colors.primary }]}>{messages.common.retry}</Text>
                  </Pressable>
                ) : undefined
              }
            />
          )
        }
        onEndReached={() => {
          if (query.hasNextPage && !query.isFetchingNextPage) query.fetchNextPage();
        }}
        onEndReachedThreshold={0.5}
        ListFooterComponent={query.isFetchingNextPage ? <ActivityIndicator style={{ margin: Spacing.lg }} color={colors.primary} /> : null}
        refreshControl={
          <RefreshControl
            refreshing={(query.isRefetching && !query.isFetchingNextPage) || featuredQuery.isRefetching}
            onRefresh={() => {
              query.refetch();
              featuredQuery.refetch();
            }}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        contentContainerStyle={{ paddingBottom: tabBarHeight + Spacing.xl }}
        showsVerticalScrollIndicator={false}
      />
    </ScreenWrapper>
  );
}

/** One cikan haber karti: sabit olcu (hepsi ayni boy), gorsel ustunde baslik. Baslik en fazla 3 satir. */
function FeaturedCard({ item }: { item: NewsListItem }) {
  const { messages, locale } = useLocale();
  const router = useRouter();
  const { title } = pickNewsText(item, locale);

  return (
    <Pressable
      onPress={() => {
        haptics.selection();
        router.push(`/news/${item.slug}`);
      }}
      style={({ pressed }) => [styles.featuredCard, { opacity: pressed ? 0.88 : 1 }]}
    >
      <NewsImage item={item} width={640} style={StyleSheet.absoluteFillObject} />
      <LinearGradient colors={['rgba(0,0,0,0.05)', 'rgba(0,0,0,0.55)', 'rgba(0,0,0,0.95)']} style={StyleSheet.absoluteFillObject} />
      <View style={styles.featuredBody}>
        <Text style={styles.featuredMeta} numberOfLines={1}>
          {messages.news.categories[item.category]} · {item.sourceName} · {formatRelativeTime(item.publishedAt, locale)}
        </Text>
        <Text style={styles.featuredTitle} numberOfLines={3}>
          {title}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
  },
  inset: {
    marginHorizontal: Spacing.lg,
  },
  cardWrap: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  chips: {
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  chip: {
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  chipText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
  },
  featuredList: {
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  featuredCard: {
    width: FEATURED_WIDTH,
    height: FEATURED_HEIGHT,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  featuredBody: {
    padding: Spacing.md,
    gap: 4,
  },
  featuredMeta: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: FontSize.xs,
    fontWeight: '600',
  },
  featuredTitle: {
    color: '#ffffff',
    fontSize: FontSize.md,
    fontWeight: '800',
    lineHeight: 21,
  },
  resultCount: {
    fontSize: FontSize.sm,
  },
  skeletons: {
    gap: Spacing.md,
  },
  retryText: {
    fontSize: FontSize.md,
    fontWeight: '600',
  },
});
