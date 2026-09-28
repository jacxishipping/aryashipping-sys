import React from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useInfiniteQuery } from '@tanstack/react-query';
import { invoicesApi } from '../../api/invoices';
import { AppTopBar } from '../../components/shared/AppTopBar';
import { ListPaginationFooter } from '../../components/shared/ListPaginationFooter';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ErrorState } from '../../components/shared/ErrorState';
import { EmptyState } from '../../components/shared/EmptyState';
import { InvoiceCard } from '../../components/customer/InvoiceCard';
import { useAppTheme } from '../../hooks/useAppTheme';
import { Spacing } from '../../constants/spacing';
import { MOBILE_LIST_PAGE_SIZE } from '../../constants/pagination';

const InvoicesScreen: React.FC = () => {
  const { colors } = useAppTheme();
  const query = useInfiniteQuery({
    queryKey: ['customer-invoices'],
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      invoicesApi.getInvoices({}, { page: pageParam, pageSize: MOBILE_LIST_PAGE_SIZE }),
    getNextPageParam: (lastPage, _pages, lastPageParam) =>
      lastPage.pagination.hasMore ? Number(lastPageParam) + 1 : undefined,
  });

  if (query.isLoading) return <LoadingSpinner fullScreen />;
  if (query.error) return <ErrorState message={(query.error as any).message} onRetry={query.refetch} />;

  const invoices = query.data?.pages.flatMap((page) => page.invoices) || [];
  const totalInvoices = query.data?.pages[0]?.pagination.total || 0;

  const loadMore = () => {
    if (query.hasNextPage && !query.isFetchingNextPage) {
      void query.fetchNextPage();
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <FlatList
        data={invoices}
        renderItem={({ item }) => <InvoiceCard invoice={item} />}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={<AppTopBar section="Invoices" />}
        ListEmptyComponent={
          <EmptyState icon="invoices" title="No Invoices" />
        }
        ListFooterComponent={
          invoices.length > 0 ? (
            <ListPaginationFooter
              loadedCount={invoices.length}
              totalCount={totalInvoices}
              hasNextPage={query.hasNextPage}
              isFetchingNextPage={query.isFetchingNextPage}
              onLoadMore={loadMore}
            />
          ) : null
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        onRefresh={query.refetch}
        refreshing={query.isRefetching && !query.isFetchingNextPage}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: Spacing.base, paddingBottom: Spacing['4xl'] },
});

export default InvoicesScreen;
