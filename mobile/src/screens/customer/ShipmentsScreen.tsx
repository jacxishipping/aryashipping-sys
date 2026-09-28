import React, { useState } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useInfiniteQuery } from '@tanstack/react-query';
import { shipmentsApi } from '../../api/shipments';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ErrorState } from '../../components/shared/ErrorState';
import { EmptyState } from '../../components/shared/EmptyState';
import { AppTopBar } from '../../components/shared/AppTopBar';
import { ListPaginationFooter } from '../../components/shared/ListPaginationFooter';
import { ShipmentCard } from '../../components/shared/ShipmentCard';
import { Input } from '../../components/ui/Input';
import { useAppTheme } from '../../hooks/useAppTheme';
import { Spacing } from '../../constants/spacing';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CustomerStackParamList } from '../../navigation/CustomerNavigator';
import { MOBILE_LIST_PAGE_SIZE } from '../../constants/pagination';

type NavigationProp = NativeStackNavigationProp<CustomerStackParamList>;

const ShipmentsScreen: React.FC = () => {
  const { colors } = useAppTheme();
  const navigation = useNavigation<NavigationProp>();
  const [search, setSearch] = useState('');

  const query = useInfiniteQuery({
    queryKey: ['shipments', 'customer', search],
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      shipmentsApi.getShipments({ search }, { page: pageParam, pageSize: MOBILE_LIST_PAGE_SIZE }),
    getNextPageParam: (lastPage) =>
      lastPage.page * lastPage.pageSize < lastPage.total ? lastPage.page + 1 : undefined,
  });

  if (query.isLoading) {
    return <LoadingSpinner fullScreen />;
  }

  if (query.error) {
    return <ErrorState message={(query.error as any).message} onRetry={query.refetch} />;
  }

  const shipments = query.data?.pages.flatMap((page) => page.data) || [];
  const totalShipments = query.data?.pages[0]?.total || 0;

  const loadMore = () => {
    if (query.hasNextPage && !query.isFetchingNextPage) {
      void query.fetchNextPage();
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={styles.content}>
        <AppTopBar section="Shipments" />

        <Input
          placeholder="Search by VIN or tracking number"
          value={search}
          onChangeText={setSearch}
          containerStyle={styles.search}
        />
        
        <FlatList
          data={shipments}
          renderItem={({ item }) => (
            <ShipmentCard
              shipment={item}
              onPress={() => navigation.navigate('ShipmentDetail', { id: item.id })}
            />
          )}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <EmptyState icon="shipments" title="No Shipments Found" />
          }
          ListFooterComponent={
            shipments.length > 0 ? (
              <ListPaginationFooter
                loadedCount={shipments.length}
                totalCount={totalShipments}
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
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, padding: Spacing.base },
  search: { marginBottom: Spacing.base },
  list: { paddingBottom: Spacing.xl },
});

export default ShipmentsScreen;
