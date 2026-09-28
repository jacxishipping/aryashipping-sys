import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useInfiniteQuery } from '@tanstack/react-query';
import { containersApi } from '../../api/containers';
import { ListPaginationFooter } from '../../components/shared/ListPaginationFooter';
import { Card } from '../../components/ui/Card';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { AppTopBar } from '../../components/shared/AppTopBar';
import { ErrorState } from '../../components/shared/ErrorState';
import { EmptyState } from '../../components/shared/EmptyState';
import { Input } from '../../components/ui/Input';
import { useAppTheme } from '../../hooks/useAppTheme';
import { Typography } from '../../constants/typography';
import { BorderRadius, Spacing } from '../../constants/spacing';
import { Container } from '../../types/container';
import { MOBILE_LIST_PAGE_SIZE } from '../../constants/pagination';

const titleCase = (value: string) => value.replace(/_/g, ' ').toLowerCase().replace(/(^|\s)\w/g, (match) => match.toUpperCase());

const formatDate = (value?: string | null) => (value ? new Date(value).toLocaleDateString() : 'Not scheduled');

const ContainersScreen: React.FC = () => {
  const { colors } = useAppTheme();
  const navigation = useNavigation<any>();
  const [search, setSearch] = useState('');

  const query = useInfiniteQuery({
    queryKey: ['containers', search],
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      containersApi.getContainers(search ? { search } : {}, { page: pageParam, pageSize: MOBILE_LIST_PAGE_SIZE }),
    getNextPageParam: (lastPage) =>
      lastPage.pagination.page < lastPage.pagination.totalPages ? lastPage.pagination.page + 1 : undefined,
  });

  const containers: Container[] = query.data?.pages.flatMap((page) => page.containers) || [];
  const totalContainers = query.data?.pages[0]?.pagination.totalCount || 0;
  const summary = useMemo(
    () => ({
      total: totalContainers,
      inTransit: containers.filter((container) => container.status === 'IN_TRANSIT').length,
      withDocuments: containers.filter((container) => (container._count?.documents || 0) > 0).length,
    }),
    [containers, totalContainers],
  );

  if (query.isLoading) return <LoadingSpinner fullScreen />;
  if (query.error) return <ErrorState message={(query.error as any).message} onRetry={query.refetch} />;

  const loadMore = () => {
    if (query.hasNextPage && !query.isFetchingNextPage) {
      void query.fetchNextPage();
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={styles.pageHeader}>
        <AppTopBar section="Containers" showBack />
        <Input value={search} onChangeText={setSearch} placeholder="Search by container, tracking, vessel, or booking" />
        <View style={styles.metricRow}>
          <Card style={StyleSheet.flatten([styles.metricCard, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }])}> 
            <Text style={[styles.metricValue, { color: colors.textPrimary }]}>{summary.total}</Text>
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Visible</Text>
          </Card>
          <Card style={StyleSheet.flatten([styles.metricCard, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }])}> 
            <Text style={[styles.metricValue, { color: colors.textPrimary }]}>{summary.inTransit}</Text>
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>In Transit</Text>
          </Card>
          <Card style={StyleSheet.flatten([styles.metricCard, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }])}> 
            <Text style={[styles.metricValue, { color: colors.textPrimary }]}>{summary.withDocuments}</Text>
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>With Docs</Text>
          </Card>
        </View>
      </View>
      <FlatList
        data={containers}
        renderItem={({ item }: { item: Container }) => (
          <Card pressable onPress={() => navigation.navigate('ContainerDetail', { id: item.id })} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={[styles.number, { color: colors.textPrimary }]}>{item.containerNumber}</Text>
              <View style={StyleSheet.flatten([styles.statusPill, { backgroundColor: `${colors.accent}12`, borderColor: `${colors.accent}30` }])}>
                <Text style={[styles.statusPillText, { color: colors.accent }]}>{titleCase(item.status)}</Text>
              </View>
            </View>
            <Text style={[styles.type, { color: colors.textSecondary }]}>
              {item.shippingLine || 'Shipping line pending'} • {item.destinationPort || 'Destination pending'}
            </Text>
            <View style={styles.metaGrid}>
              <View style={[styles.metaChip, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}>
                <Text style={[styles.metaLabel, { color: colors.textSecondary }]}>Capacity</Text>
                <Text style={[styles.metaValue, { color: colors.textPrimary }]}>{item.currentCount}/{item.maxCapacity}</Text>
              </View>
              <View style={[styles.metaChip, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}>
                <Text style={[styles.metaLabel, { color: colors.textSecondary }]}>ETA</Text>
                <Text style={[styles.metaValue, { color: colors.textPrimary }]}>{formatDate(item.estimatedArrival)}</Text>
              </View>
              <View style={[styles.metaChip, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}>
                <Text style={[styles.metaLabel, { color: colors.textSecondary }]}>Tracking</Text>
                <Text style={[styles.metaValue, { color: colors.textPrimary }]}>{item.trackingNumber || 'Not connected'}</Text>
              </View>
              <View style={[styles.metaChip, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}>
                <Text style={[styles.metaLabel, { color: colors.textSecondary }]}>Shipments</Text>
                <Text style={[styles.metaValue, { color: colors.textPrimary }]}>{item._count?.shipments || 0}</Text>
              </View>
            </View>
          </Card>
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<EmptyState icon="containers" title="No Containers" description="Containers tied to your shipments will appear here." />}
        ListFooterComponent={
          containers.length > 0 ? (
            <ListPaginationFooter
              loadedCount={containers.length}
              totalCount={totalContainers}
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
  pageHeader: { padding: Spacing.base, paddingBottom: 0 },
  list: { padding: Spacing.base, paddingTop: Spacing.sm },
  metricRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm },
  metricCard: { flex: 1, paddingVertical: Spacing.base, borderWidth: 1 },
  metricValue: { fontSize: Typography.fontSize.xl, fontWeight: Typography.fontWeight.semibold, textAlign: 'center' },
  metricLabel: { fontSize: Typography.fontSize.xs, textAlign: 'center', marginTop: Spacing.xs, textTransform: 'uppercase', letterSpacing: 0.8 },
  card: { marginBottom: Spacing.md },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.xs },
  number: { fontSize: Typography.fontSize.lg, fontWeight: Typography.fontWeight.semibold },
  type: { fontSize: Typography.fontSize.sm },
  metaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.sm },
  metaChip: { width: '48%', borderWidth: 1, borderRadius: BorderRadius.xl, padding: Spacing.sm },
  metaLabel: { fontSize: Typography.fontSize.xs, fontWeight: Typography.fontWeight.semibold, letterSpacing: 1, textTransform: 'uppercase', marginBottom: Spacing.xs },
  metaValue: { fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.semibold },
  statusPill: {
    borderWidth: 1,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  statusPillText: { fontSize: Typography.fontSize.xs, fontWeight: Typography.fontWeight.semibold },
});

export default ContainersScreen;
