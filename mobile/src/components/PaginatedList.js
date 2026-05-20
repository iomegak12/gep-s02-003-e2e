import React, { useCallback, useMemo } from 'react';
import { View, StyleSheet, RefreshControl, ActivityIndicator, FlatList } from 'react-native';
import { useTheme, Text } from 'react-native-paper';
import { useInfiniteQuery } from '@tanstack/react-query';
import EmptyState from './EmptyState';
import ErrorToast from './ErrorToast';
import { extractApiError } from '../api/client';

/**
 * Generic infinite-scroll list backed by a paginated endpoint that returns
 * { data, page, page_size, total }.
 *
 * Props:
 *   queryKey   — react-query cache key (array)
 *   queryFn    — async ({page, page_size}) => server response
 *   pageSize   — items per page (default 20)
 *   renderItem — FlatList renderItem
 *   keyExtractor — FlatList keyExtractor
 *   emptyTitle / emptyMessage — strings for the empty state
 *   ListHeaderComponent — optional sticky-ish header (filters, search, etc.)
 */
export default function PaginatedList({
  queryKey,
  queryFn,
  pageSize = 20,
  renderItem,
  keyExtractor,
  emptyTitle = 'Nothing here yet',
  emptyMessage = 'There is no data to display.',
  ListHeaderComponent,
  ItemSeparatorComponent,
}) {
  const theme = useTheme();

  const {
    data,
    error,
    isLoading,
    isError,
    isRefetching,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey,
    initialPageParam: 1,
    queryFn: ({ pageParam = 1 }) => queryFn({ page: pageParam, page_size: pageSize }),
    getNextPageParam: (lastPage) => {
      if (!lastPage) return undefined;
      const page = Number(lastPage.page) || 1;
      const total = Number(lastPage.total) || 0;
      const ps = Number(lastPage.page_size) || pageSize;
      return page * ps < total ? page + 1 : undefined;
    },
  });

  const items = useMemo(() => {
    const pages = data?.pages || [];
    return pages.flatMap((p) => p?.data || []);
  }, [data]);

  const onEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const footer = isFetchingNextPage ? (
    <View style={styles.footer}>
      <ActivityIndicator />
    </View>
  ) : null;

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (isError && items.length === 0) {
    const apiErr = extractApiError(error);
    return (
      <>
        <EmptyState
          title="Couldn't load data"
          message={apiErr.message}
          actionLabel="Retry"
          onAction={() => refetch()}
        />
        <ErrorToast visible error={apiErr} onDismiss={() => {}} />
      </>
    );
  }

  return (
    <FlatList
      data={items}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      ListHeaderComponent={ListHeaderComponent}
      ItemSeparatorComponent={ItemSeparatorComponent}
      contentContainerStyle={items.length === 0 ? styles.emptyWrap : styles.listPad}
      ListEmptyComponent={
        <EmptyState title={emptyTitle} message={emptyMessage} />
      }
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={refetch}
          tintColor={theme.colors.primary}
          colors={[theme.colors.primary]}
        />
      }
      onEndReachedThreshold={0.4}
      onEndReached={onEndReached}
      ListFooterComponent={
        <>
          {footer}
          {!hasNextPage && items.length > 0 ? (
            <Text variant="bodySmall" style={[styles.endNote, { color: theme.colors.onSurfaceVariant }]}>
              {items.length} of {data?.pages?.[0]?.total ?? items.length}
            </Text>
          ) : null}
        </>
      }
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listPad: { paddingBottom: 24 },
  emptyWrap: { flexGrow: 1 },
  footer: { padding: 16, alignItems: 'center' },
  endNote: { textAlign: 'center', paddingVertical: 12 },
});
