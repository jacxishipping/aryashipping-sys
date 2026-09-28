import React, { useMemo, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { dispatchesApi } from '../../api/dispatches';
import { containersApi } from '../../api/containers';
import { AppTopBar } from '../../components/shared/AppTopBar';
import { ListPaginationFooter } from '../../components/shared/ListPaginationFooter';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { ErrorState } from '../../components/shared/ErrorState';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Input } from '../../components/ui/Input';
import { useAppTheme } from '../../hooks/useAppTheme';
import { BorderRadius, Spacing } from '../../constants/spacing';
import { Typography } from '../../constants/typography';
import { ContainerStatus } from '../../types/container';
import { DispatchStatus } from '../../types/dispatch';
import { AdminStackParamList } from '../../navigation/AdminNavigator';
import { MOBILE_LIST_PAGE_SIZE } from '../../constants/pagination';

const statusOptions: Array<{ label: string; value: 'all' | DispatchStatus }> = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Dispatched', value: 'DISPATCHED' },
  { label: 'At Port', value: 'ARRIVED_AT_PORT' },
  { label: 'Completed', value: 'COMPLETED' },
];

const titleCase = (value: string) => value.replace(/_/g, ' ').toLowerCase().replace(/(^|\s)\w/g, (match) => match.toUpperCase());

const formatCurrency = (amount?: number | null) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);

const eligibleContainerStatuses: ContainerStatus[] = ['CREATED', 'WAITING_FOR_LOADING', 'LOADED', 'IN_TRANSIT'];

const DispatchesScreen: React.FC = () => {
  const { colors } = useAppTheme();
  const navigation = useNavigation<any>();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | DispatchStatus>('all');
  const [activeDispatchId, setActiveDispatchId] = useState<string | null>(null);
  const [selectedContainerId, setSelectedContainerId] = useState<string | null>(null);
  const [submittingAction, setSubmittingAction] = useState<'handoff' | 'receive' | null>(null);

  const query = useInfiniteQuery({
    queryKey: ['dispatches', search, status],
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      dispatchesApi.getDispatches({
        search: search || undefined,
        status: status === 'all' ? undefined : status,
      }, { page: pageParam, pageSize: MOBILE_LIST_PAGE_SIZE }),
    getNextPageParam: (lastPage) =>
      lastPage.pagination.page < lastPage.pagination.totalPages ? lastPage.pagination.page + 1 : undefined,
  });

  const activeDispatchQuery = useQuery({
    queryKey: ['dispatch', activeDispatchId],
    queryFn: () => dispatchesApi.getDispatch(activeDispatchId as string),
    enabled: Boolean(activeDispatchId),
  });

  const containersQuery = useQuery({
    queryKey: ['dispatch-handoff-containers'],
    queryFn: () => containersApi.getContainers({}, { pageSize: 50 }),
  });

  const dispatches = query.data?.pages.flatMap((page) => page.dispatches) || [];
  const totalDispatches = query.data?.pages[0]?.pagination.total || 0;
  const availableContainers = (containersQuery.data?.containers || []).filter(
    (container) => eligibleContainerStatuses.includes(container.status) && container.company,
  );
  const activeDispatch = activeDispatchQuery.data;
  const eligibleShipments = useMemo(
    () =>
      (activeDispatch?.shipments || []).filter(
        (shipment) =>
          shipment.dispatchId === activeDispatch?.id &&
          !shipment.containerId &&
          !shipment.transitId &&
          shipment.status === 'DISPATCHING',
      ),
    [activeDispatch],
  );
  const summary = useMemo(
    () => ({
      total: totalDispatches,
      active: dispatches.filter((dispatch) => ['PENDING', 'DISPATCHED', 'ARRIVED_AT_PORT'].includes(dispatch.status)).length,
      shipments: dispatches.reduce((sum, dispatch) => sum + dispatch._count.shipments, 0),
    }),
    [dispatches, totalDispatches],
  );

  const refreshAll = async () => {
    await query.refetch();
    if (activeDispatchId) {
      await activeDispatchQuery.refetch();
    }
    await containersQuery.refetch();
  };

  const handleReceive = (dispatchId: string) => {
    Alert.alert('Receive dispatch', 'Receive all active dispatch shipments back to yard?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Receive',
        onPress: async () => {
          try {
            setSubmittingAction('receive');
            await dispatchesApi.receiveDispatch(dispatchId);
            await refreshAll();
            Alert.alert('Dispatch received', 'The dispatch shipments were received to yard.');
          } catch (error: any) {
            Alert.alert('Unable to receive dispatch', error?.message || 'The dispatch could not be received to yard.');
          } finally {
            setSubmittingAction(null);
          }
        },
      },
    ]);
  };

  const handleHandoff = (dispatchId: string) => {
    if (!selectedContainerId || eligibleShipments.length === 0) {
      return;
    }

    const selectedContainer = availableContainers.find((container) => container.id === selectedContainerId);
    Alert.alert(
      'Handoff to container',
      `Move ${eligibleShipments.length} shipment${eligibleShipments.length === 1 ? '' : 's'} from this dispatch into ${selectedContainer?.containerNumber || 'the selected container'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Handoff',
          onPress: async () => {
            try {
              setSubmittingAction('handoff');
              await dispatchesApi.handoffDispatch(dispatchId, {
                containerId: selectedContainerId,
                shipmentIds: eligibleShipments.map((shipment) => shipment.id),
              });
              await refreshAll();
              setSelectedContainerId(null);
              Alert.alert('Dispatch handed off', 'The selected shipments were handed off to the container.');
            } catch (error: any) {
              Alert.alert('Unable to hand off dispatch', error?.message || 'The dispatch handoff could not be completed.');
            } finally {
              setSubmittingAction(null);
            }
          },
        },
      ],
    );
  };

  if (query.isLoading) return <LoadingSpinner fullScreen />;
  if (query.error) return <ErrorState message={(query.error as any).message} onRetry={query.refetch} />;

  const loadMore = () => {
    if (query.hasNextPage && !query.isFetchingNextPage) {
      void query.fetchNextPage();
    }
  };

  const renderDispatchCard = (dispatch: typeof dispatches[number]) => (
    <Card key={dispatch.id} style={styles.dispatchCard}>
      <View style={styles.cardHeader}>
        <Text style={[styles.reference, { color: colors.textPrimary }]}>{dispatch.referenceNumber}</Text>
        <View style={StyleSheet.flatten([styles.statusPill, { backgroundColor: `${colors.accent}12`, borderColor: `${colors.accent}30` }])}>
          <Text style={[styles.statusPillText, { color: colors.accent }]}>{titleCase(dispatch.status)}</Text>
        </View>
      </View>
      <Text style={[styles.routeText, { color: colors.textSecondary }]}>{dispatch.origin} {'>'} {dispatch.destination}</Text>
      <View style={styles.metaGrid}>
        <View style={[styles.metaChip, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}> 
          <Text style={[styles.metaLabel, { color: colors.textSecondary }]}>Company</Text>
          <Text style={[styles.metaValue, { color: colors.textPrimary }]}>{dispatch.company?.name || 'Pending'}</Text>
        </View>
        <View style={[styles.metaChip, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}> 
          <Text style={[styles.metaLabel, { color: colors.textSecondary }]}>ETA</Text>
          <Text style={[styles.metaValue, { color: colors.textPrimary }]}>{dispatch.estimatedArrival ? new Date(dispatch.estimatedArrival).toLocaleDateString() : 'Not scheduled'}</Text>
        </View>
        <View style={[styles.metaChip, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}> 
          <Text style={[styles.metaLabel, { color: colors.textSecondary }]}>Shipments</Text>
          <Text style={[styles.metaValue, { color: colors.textPrimary }]}>{dispatch._count.shipments}</Text>
        </View>
        <View style={[styles.metaChip, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}> 
          <Text style={[styles.metaLabel, { color: colors.textSecondary }]}>Cost</Text>
          <Text style={[styles.metaValue, { color: colors.textPrimary }]}>{formatCurrency(dispatch.cost)}</Text>
        </View>
      </View>
      {dispatch.notes ? <Text style={[styles.notes, { color: colors.textSecondary }]}>{dispatch.notes}</Text> : null}

      <View style={styles.actionBar}>
        <Button
          title="Open Details"
          variant="secondary"
          size="sm"
          onPress={() => navigation.navigate('DispatchDetail' as keyof AdminStackParamList, { id: dispatch.id })}
          style={styles.actionButton}
        />
        <Button
          title={activeDispatchId === dispatch.id ? 'Hide Actions' : 'Actions'}
          variant="secondary"
          size="sm"
          onPress={() => {
            setSelectedContainerId(null);
            setActiveDispatchId((current) => (current === dispatch.id ? null : dispatch.id));
          }}
          style={styles.actionButton}
        />
      </View>

      {activeDispatchId === dispatch.id ? (
        <View style={StyleSheet.flatten([styles.workflowPanel, { borderColor: colors.border, backgroundColor: colors.surfaceMuted }])}>
          {activeDispatchQuery.isLoading ? (
            <Text style={[styles.panelText, { color: colors.textSecondary }]}>Loading actions...</Text>
          ) : activeDispatchQuery.error ? (
            <Text style={[styles.panelText, { color: colors.error }]}>Actions could not be loaded.</Text>
          ) : (
            <>
              <Text style={[styles.panelTitle, { color: colors.textPrimary }]}>Workflow</Text>
              <Text style={[styles.panelText, { color: colors.textSecondary }]}>Eligible shipments: {eligibleShipments.length}</Text>

              {availableContainers.length > 0 ? (
                <View style={styles.containerChipRow}>
                  {availableContainers.slice(0, 8).map((container) => {
                    const selected = container.id === selectedContainerId;

                    return (
                      <TouchableOpacity
                        key={container.id}
                        activeOpacity={0.85}
                        style={StyleSheet.flatten([
                          styles.containerChip,
                          {
                            backgroundColor: selected ? `${colors.accent}18` : colors.panel,
                            borderColor: selected ? `${colors.accent}35` : colors.border,
                          },
                        ])}
                        onPress={() => setSelectedContainerId(container.id)}
                      >
                        <Text style={[styles.containerChipText, { color: selected ? colors.accent : colors.textPrimary }]}>{container.containerNumber}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ) : (
                <Text style={[styles.panelText, { color: colors.textSecondary }]}>No containers available.</Text>
              )}

              <View style={styles.workflowActions}>
                <Button
                  title="Receive to Yard"
                  size="sm"
                  onPress={() => handleReceive(dispatch.id)}
                  disabled={eligibleShipments.length === 0}
                  loading={submittingAction === 'receive'}
                  style={styles.workflowButton}
                />
                <Button
                  title="Handoff to Container"
                  variant="secondary"
                  size="sm"
                  onPress={() => handleHandoff(dispatch.id)}
                  disabled={eligibleShipments.length === 0 || !selectedContainerId}
                  loading={submittingAction === 'handoff'}
                  style={styles.workflowButton}
                />
              </View>
            </>
          )}
        </View>
      ) : null}
    </Card>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <FlatList
        data={dispatches}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => renderDispatchCard(item)}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <>
            <AppTopBar section="Dispatches" showBack />
            <Input value={search} onChangeText={setSearch} placeholder="Search by reference, notes, or shipment VIN" />

            <View style={styles.filterRow}>
              {statusOptions.map((option) => {
                const selected = option.value === status;
                return (
                  <TouchableOpacity
                    key={option.value}
                    activeOpacity={0.85}
                    style={StyleSheet.flatten([
                      styles.filterChip,
                      {
                        backgroundColor: selected ? `${colors.accent}18` : colors.panel,
                        borderColor: selected ? `${colors.accent}35` : colors.border,
                      },
                    ])}
                    onPress={() => setStatus(option.value)}
                  >
                    <Text style={[styles.filterChipText, { color: selected ? colors.accent : colors.textPrimary }]}>{option.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.metricRow}>
              <Card style={StyleSheet.flatten([styles.metricCard, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }])}>
                <Text style={[styles.metricValue, { color: colors.textPrimary }]}>{summary.total}</Text>
                <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Total</Text>
              </Card>
              <Card style={StyleSheet.flatten([styles.metricCard, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }])}>
                <Text style={[styles.metricValue, { color: colors.textPrimary }]}>{summary.active}</Text>
                <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Active</Text>
              </Card>
              <Card style={StyleSheet.flatten([styles.metricCard, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }])}>
                <Text style={[styles.metricValue, { color: colors.textPrimary }]}>{summary.shipments}</Text>
                <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Loaded Shipments</Text>
              </Card>
            </View>
          </>
        }
        ListEmptyComponent={
          <Card>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No dispatches matched the current filters.</Text>
          </Card>
        }
        ListFooterComponent={
          dispatches.length > 0 ? (
            <ListPaginationFooter
              loadedCount={dispatches.length}
              totalCount={totalDispatches}
              hasNextPage={query.hasNextPage}
              isFetchingNextPage={query.isFetchingNextPage}
              onLoadMore={loadMore}
            />
          ) : null
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        onRefresh={refreshAll}
        refreshing={query.isRefetching && !query.isFetchingNextPage}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.base, paddingBottom: Spacing['4xl'] },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs, marginBottom: Spacing.base },
  filterChip: { borderWidth: 1, borderRadius: BorderRadius.full, paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm },
  filterChipText: { fontSize: Typography.fontSize.xs, fontWeight: Typography.fontWeight.semibold },
  metricRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.base },
  metricCard: { flex: 1, paddingVertical: Spacing.base, borderWidth: 1 },
  metricValue: { fontSize: Typography.fontSize.lg, fontWeight: Typography.fontWeight.semibold, textAlign: 'center' },
  metricLabel: { fontSize: Typography.fontSize.xs, textAlign: 'center', marginTop: Spacing.xs, textTransform: 'uppercase', letterSpacing: 0.8 },
  dispatchCard: { marginBottom: Spacing.sm },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.sm, marginBottom: Spacing.xs },
  reference: { fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.semibold },
  routeText: { fontSize: Typography.fontSize.sm, marginBottom: Spacing.sm },
  metaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  metaChip: { width: '48%', borderWidth: 1, borderRadius: BorderRadius.xl, padding: Spacing.sm },
  metaLabel: { fontSize: Typography.fontSize.xs, fontWeight: Typography.fontWeight.semibold, letterSpacing: 1, textTransform: 'uppercase', marginBottom: Spacing.xs },
  metaValue: { fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.semibold },
  notes: { fontSize: Typography.fontSize.sm, lineHeight: 20, marginTop: Spacing.sm },
  actionBar: { marginTop: Spacing.base },
  actionButton: { alignSelf: 'flex-start' },
  workflowPanel: { borderWidth: 1, borderRadius: BorderRadius.xl, padding: Spacing.base, marginTop: Spacing.base },
  panelTitle: { fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.semibold, marginBottom: Spacing.xs },
  panelText: { fontSize: Typography.fontSize.sm, lineHeight: 20, marginBottom: Spacing.xs },
  containerChipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs, marginTop: Spacing.sm, marginBottom: Spacing.base },
  containerChip: { borderWidth: 1, borderRadius: BorderRadius.full, paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm },
  containerChipText: { fontSize: Typography.fontSize.xs, fontWeight: Typography.fontWeight.semibold },
  workflowActions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  workflowButton: { flex: 1 },
  statusPill: { borderWidth: 1, borderRadius: BorderRadius.full, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs },
  statusPillText: { fontSize: Typography.fontSize.xs, fontWeight: Typography.fontWeight.semibold },
  emptyText: { fontSize: Typography.fontSize.sm },
});
export default DispatchesScreen;
