import React, { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useInfiniteQuery } from '@tanstack/react-query';
import { ScreenWrapper } from '@/src/components/common/ScreenWrapper';
import { ScreenHeader } from '@/src/components/shell';
import { EmptyState } from '@/src/components/common/EmptyState';
import { Skeleton } from '@/src/components/common/Skeleton';
import { NewsCard } from '@/src/components/news/NewsCard';
import { useTheme } from '@/src/hooks/use-theme';
import { useLocale } from '@/src/hooks/use-locale';
import { useTabBarHeight } from '@/src/hooks/use-tab-bar-height';
import { newsApi } from '@/src/api/news';
import * as haptics from '@/src/utils/haptics';
import { BorderRadius, FontSize, Spacing } from '@/src/constants/theme';
import { NEWS_CATEGORIES, type NewsCategory } from '@/src/models/news';

type Filter = NewsCategory | 'all';

/**
 * Oyun dunyasindan haberler (web /news karsiligi). Girissiz okunur. Iki dil birlikte geldigi icin
 * sorgu anahtarinda dil yok: dil degisince ayni veri yeni dilde cizilir.
 */
export default function NewsScreen() {
  const { colors } = useTheme();
  const { messages } = useLocale();
  const m = messages.news;
  const tabBarHeight = useTabBarHeight();
  const [filter, setFilter] = useState<Filter>('all');
  const category = filter === 'all' ? null : filter;

  const query = useInfiniteQuery({
    queryKey: ['news', filter],
    queryFn: ({ pageParam }) => newsApi.list(pageParam, category),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page * last.pageSize < last.totalCount ? last.page + 1 : undefined),
    staleTime: 2 * 60 * 1000,
  });
  const items = query.data?.pages.flatMap((p) => p.items) ?? [];

  const filters: { key: Filter; label: string }[] = [
    { key: 'all', label: m.all },
    ...NEWS_CATEGORIES.map((c) => ({ key: c as Filter, label: m.categories[c] })),
  ];

  return (
    <ScreenWrapper noPadding safeArea={false}>
      <ScreenHeader title={messages.nav.screenTitles.news} />
      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => <NewsCard item={item} />}
        ItemSeparatorComponent={() => <View style={{ height: Spacing.md }} />}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{m.subtitle}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
              {filters.map((f) => {
                const active = f.key === filter;
                return (
                  <Pressable
                    key={f.key}
                    onPress={() => {
                      haptics.selection();
                      setFilter(f.key);
                    }}
                    style={[styles.chip, { backgroundColor: active ? colors.primary : colors.surface, borderColor: colors.border }]}
                  >
                    <Text style={[styles.chipText, { color: active ? '#ffffff' : colors.text }]}>{f.label}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        }
        ListEmptyComponent={
          query.isPending ? (
            <View style={styles.skeletons}>
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} width="100%" height={260} borderRadius={BorderRadius.lg} />
              ))}
            </View>
          ) : (
            <EmptyState
              icon="newspaper-outline"
              title={query.isError ? m.loadError : m.empty}
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
          <RefreshControl refreshing={query.isRefetching && !query.isFetchingNextPage} onRefresh={() => query.refetch()} tintColor={colors.primary} colors={[colors.primary]} />
        }
        contentContainerStyle={{ paddingHorizontal: Spacing.lg, paddingBottom: tabBarHeight + Spacing.xl }}
        showsVerticalScrollIndicator={false}
      />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  subtitle: {
    fontSize: FontSize.sm,
    lineHeight: 20,
  },
  chips: {
    gap: Spacing.sm,
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
  skeletons: {
    gap: Spacing.md,
  },
  retryText: {
    fontSize: FontSize.md,
    fontWeight: '600',
  },
});
