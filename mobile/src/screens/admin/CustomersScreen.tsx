import React from 'react';
import { FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useInfiniteQuery } from '@tanstack/react-query';
import { customersApi } from '../../api/customers';
import { Button } from '../../components/ui/Button';
import { CustomerCard } from '../../components/admin/CustomerCard';
import { AppTopBar } from '../../components/shared/AppTopBar';
import { ListPaginationFooter } from '../../components/shared/ListPaginationFooter';
import { SectionHeader } from '../../components/shared/SectionHeader';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ErrorState } from '../../components/shared/ErrorState';
import { EmptyState } from '../../components/shared/EmptyState';
import { useAppTheme } from '../../hooks/useAppTheme';
import { Spacing } from '../../constants/spacing';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AdminStackParamList } from '../../navigation/AdminNavigator';
import { MOBILE_LIST_PAGE_SIZE } from '../../constants/pagination';

type NavigationProp = NativeStackNavigationProp<AdminStackParamList>;

const CustomersScreen: React.FC = () => {
  const { colors } = useAppTheme();
  const navigation = useNavigation<NavigationProp>();

  const query = useInfiniteQuery({
    queryKey: ['customers'],
    initialPageParam: 1,
    queryFn: ({ pageParam }) => customersApi.getCustomers({}, { page: pageParam, pageSize: MOBILE_LIST_PAGE_SIZE }),
    getNextPageParam: (lastPage) =>
      lastPage.page * lastPage.pageSize < lastPage.total ? lastPage.page + 1 : undefined,
  });

  if (query.isLoading) return <LoadingSpinner fullScreen />;
  if (query.error) return <ErrorState message={(query.error as any).message} onRetry={query.refetch} />;

  const customers = query.data?.pages.flatMap((page) => page.data) || [];
  const totalCustomers = query.data?.pages[0]?.total || 0;

  const loadMore = () => {
    if (query.hasNextPage && !query.isFetchingNextPage) {
      void query.fetchNextPage();
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <FlatList
        data={customers}
        renderItem={({ item }) => (
          <CustomerCard customer={item} onPress={() => navigation.navigate('CustomerDetail', { id: item.id })} />
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <>
            <AppTopBar section="Customers" />
            <SectionHeader
              title="Customers"
              description="Open accounts, review balances, and manage customer access from mobile."
              meta={[{ label: 'Total', value: totalCustomers }]}
              action={<Button title="Add Customer" size="sm" onPress={() => navigation.navigate('CustomerCreate')} />}
            />
          </>
        }
        ListEmptyComponent={<EmptyState icon="customers" title="No Customers" />}
        ListFooterComponent={
          customers.length > 0 ? (
            <ListPaginationFooter
              loadedCount={customers.length}
              totalCount={totalCustomers}
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
  list: { padding: Spacing.base },
});

export default CustomersScreen;
