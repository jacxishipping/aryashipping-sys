import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { transitsApi } from '../../api/transits';
import { shipmentsApi } from '../../api/shipments';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { DetailTabOption, DetailTabStrip } from '../../components/shared/DetailTabs';
import { EmptyState } from '../../components/shared/EmptyState';
import { ErrorState } from '../../components/shared/ErrorState';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ExpenseEditModal } from '../../components/admin/ExpenseEditModal';
import { Modal } from '../../components/ui/Modal';
import { Toast } from '../../components/ui/Toast';
import { ModuleSummaryHeader } from '../../components/shared/ModuleSummaryHeader';
import { useAppTheme } from '../../hooks/useAppTheme';
import { Typography } from '../../constants/typography';
import { BorderRadius, Spacing } from '../../constants/spacing';
import { AdminStackParamList } from '../../navigation/AdminNavigator';
import { Shipment } from '../../types/shipment';
import { TransitExpense } from '../../types/admin';

type RouteProps = RouteProp<AdminStackParamList, 'TransitDetail'>;

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);

const formatDate = (value?: string | null) => {
  if (!value) {
    return 'Not set';
  }

  return new Date(value).toLocaleDateString();
};

const titleCase = (value: string) =>
  value.replace(/_/g, ' ').toLowerCase().replace(/(^|\s)\w/g, (match) => match.toUpperCase());

const buildShipmentLabel = (shipment: { vehicleMake: string | null; vehicleModel: string | null; vehicleVIN: string | null }) => {
  const label = [shipment.vehicleMake, shipment.vehicleModel].filter(Boolean).join(' ').trim();
  return label || shipment.vehicleVIN || 'Shipment';
};

const buildEligibleShipmentLabel = (shipment: Shipment) => {
  const vehicleLabel = [shipment.vehicle.year, shipment.vehicle.make, shipment.vehicle.model].filter(Boolean).join(' ').trim();
  return vehicleLabel || shipment.vehicle.vin || shipment.trackingNumber || shipment.id;
};

interface AddShipmentsModalProps {
  visible: boolean;
  transitId: string;
  onClose: () => void;
  onAssigned: () => void;
}

const AddShipmentsModal: React.FC<AddShipmentsModalProps> = ({ visible, transitId, onClose, onAssigned }) => {
  const { colors } = useAppTheme();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({
    visible: false,
    message: '',
    type: 'success',
  });

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ visible: true, message, type });
  };

  const hideToast = () => {
    setToast((current) => ({ ...current, visible: false }));
  };

  const shipmentsQuery = useQuery({
    queryKey: ['shipments', 'transit-assign-eligible'],
    queryFn: () => shipmentsApi.getShipments({}, { page: 1, pageSize: 100 }),
    enabled: visible,
    staleTime: 0,
  });

  const eligible = useMemo(() => {
    const all = shipmentsQuery.data?.data || [];
    return all.filter(
      (shipment) =>
        (shipment.status === 'RELEASED' || shipment.containerStatus === 'RELEASED') && !shipment.transitId,
    );
  }, [shipmentsQuery.data]);

  const allSelected = eligible.length > 0 && eligible.every((shipment) => selectedIds.has(shipment.id));

  const toggleShipment = (shipmentId: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(shipmentId)) {
        next.delete(shipmentId);
      } else {
        next.add(shipmentId);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelectedIds(allSelected ? new Set() : new Set(eligible.map((shipment) => shipment.id)));
  };

  const handleClose = () => {
    if (submitting) {
      return;
    }

    setSelectedIds(new Set());
    onClose();
  };

  const handleSubmit = async () => {
    const selectedShipments = eligible.filter((shipment) => selectedIds.has(shipment.id));
    if (selectedShipments.length === 0) {
      Alert.alert('Select shipments', 'Pick at least one released shipment to add.');
      return;
    }

    try {
      setSubmitting(true);
      const result = await transitsApi.assignShipmentsBulk(
        transitId,
        selectedShipments.map((shipment) => shipment.id),
      );
      const labelById = new Map(selectedShipments.map((shipment) => [shipment.id, buildEligibleShipmentLabel(shipment)]));
      setSelectedIds(new Set());
      onAssigned();
      onClose();

      if (result.assigned > 0) {
        showToast(`Added ${result.assigned} of ${selectedShipments.length} selected shipment(s) to this transit.`, 'success');
      }

      if (result.errors.length > 0) {
        const lines = result.errors
          .slice(0, 5)
          .map((error) => `• ${labelById.get(error.shipmentId) || error.shipmentId}: ${error.error}`)
          .join('\n');
        const remainder = result.errors.length > 5 ? `\n… and ${result.errors.length - 5} more.` : '';
        Alert.alert('Some shipments could not be added', `${lines}${remainder}`);
        if (result.assigned === 0) {
          showToast('None of the selected shipments could be added.', 'error');
        }
      }
    } catch (error: any) {
      Alert.alert('Unable to add shipments', error?.message || 'The shipments could not be added to this transit.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Modal
        visible={visible}
        onClose={handleClose}
        title="Add Shipments"
        subtitle="Select released shipments to load onto this transit. Already-assigned shipments are not listed."
        showCloseButton={!submitting}
      >
        <View style={styles.addModalBody}>
          <View style={styles.selectRow}>
            <Text style={[styles.selectCount, { color: colors.textSecondary }]}>
              {shipmentsQuery.isLoading ? 'Loading released shipments…' : `${eligible.length} eligible shipment(s)`}
            </Text>
            {eligible.length > 0 ? (
              <TouchableOpacity activeOpacity={0.85} onPress={toggleSelectAll} disabled={submitting}>
                <Text style={[styles.selectAllLink, { color: colors.accent }]}>{allSelected ? 'Clear selection' : 'Select all'}</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          <ScrollView style={styles.shipmentList} contentContainerStyle={styles.shipmentListContent} keyboardShouldPersistTaps="handled">
            {shipmentsQuery.isLoading ? (
              <View style={styles.listStatusWrap}>
                <ActivityIndicator color={colors.accent} />
                <Text style={[styles.listStatusText, { color: colors.textSecondary }]}>Loading released shipments…</Text>
              </View>
            ) : shipmentsQuery.error ? (
              <View style={styles.listStatusWrap}>
                <Text style={[styles.listStatusText, { color: colors.textSecondary }]}>Could not load shipments.</Text>
                <TouchableOpacity activeOpacity={0.85} onPress={() => void shipmentsQuery.refetch()}>
                  <Text style={[styles.retryLink, { color: colors.accent }]}>Tap to retry</Text>
                </TouchableOpacity>
              </View>
            ) : eligible.length === 0 ? (
              <Text style={[styles.noEligibleText, { color: colors.textSecondary }]}>
                No released shipments are available. Release a shipment first, then add it to this transit.
              </Text>
            ) : (
              eligible.map((shipment) => {
                const selected = selectedIds.has(shipment.id);

                return (
                  <TouchableOpacity
                    key={shipment.id}
                    activeOpacity={0.85}
                    onPress={() => toggleShipment(shipment.id)}
                    style={StyleSheet.flatten([
                      styles.shipmentRow,
                      {
                        backgroundColor: selected ? `${colors.accent}18` : colors.surfaceMuted,
                        borderColor: selected ? `${colors.accent}35` : colors.border,
                      },
                    ])}
                  >
                    <View style={styles.shipmentRowCopy}>
                      <Text style={[styles.shipmentRowTitle, { color: colors.textPrimary }]}>{buildEligibleShipmentLabel(shipment)}</Text>
                      <Text style={[styles.shipmentRowMeta, { color: colors.textSecondary }]}>
                        {titleCase(shipment.status)} • {shipment.customerName || shipment.customerEmail || 'No customer'}
                      </Text>
                    </View>
                    <View style={[styles.checkOuter, { borderColor: selected ? colors.accent : colors.border }]}>
                      {selected ? <View style={[styles.checkInner, { backgroundColor: colors.accent }]} /> : null}
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>

          <View style={styles.addModalActions}>
            <Button title="Cancel" variant="secondary" onPress={handleClose} disabled={submitting} fullWidth />
            <Button
              title={`Add Selected (${selectedIds.size})`}
              onPress={handleSubmit}
              loading={submitting}
              disabled={selectedIds.size === 0}
              fullWidth
            />
          </View>
        </View>
      </Modal>

      <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={hideToast} />
    </>
  );
};

const TransitDetailScreen: React.FC = () => {
  const route = useRoute<RouteProps>();
  const navigation = useNavigation<any>();
  const { colors } = useAppTheme();
  const [activeTab, setActiveTab] = useState<string>('shipments');
  const [editingExpense, setEditingExpense] = useState<TransitExpense | null>(null);
  const [addShipmentsVisible, setAddShipmentsVisible] = useState(false);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['transit', route.params.id],
    queryFn: () => transitsApi.getTransit(route.params.id),
  });

  if (isLoading) return <LoadingSpinner fullScreen />;
  if (error) return <ErrorState message={(error as any).message} onRetry={refetch} />;
  if (!data?.transit) return <ErrorState message="Transit not found" />;

  const { transit, totalExpenses } = data;
  const expensesEditable = transit.status !== 'DELIVERED' && transit.status !== 'CANCELLED';
  const tabs: DetailTabOption[] = [
    { key: 'shipments', label: `Shipments (${transit._count.shipments})` },
    { key: 'events', label: `Events (${transit._count.events})` },
    { key: 'expenses', label: `Expenses (${transit._count.expenses})` },
    { key: 'company', label: 'Company Info' },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <ModuleSummaryHeader
          eyebrow="OPERATIONS / TRANSITS"
          title={transit.referenceNumber}
          subtitle={`${transit.origin} to ${transit.destination}`}
          showBack
          stats={[
            { label: 'Status', value: titleCase(transit.status) },
            { label: 'Shipments', value: String(transit._count.shipments) },
            { label: 'Expenses', value: formatCurrency(totalExpenses) },
          ]}
        />

        <View style={styles.actionRow}>
          {transit.currentCompany?.id ? (
            <Button title="Company Ledger" onPress={() => navigation.navigate('CompanyLedgerDetail', { id: transit.currentCompany!.id })} style={styles.actionButton} />
          ) : null}
          <Button title="All Transits" variant="secondary" onPress={() => navigation.navigate('Transits')} style={styles.actionButton} />
        </View>

        <Card style={styles.sectionCard}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Transit Snapshot</Text>
          <View style={styles.metricsRow}>
            <View style={StyleSheet.flatten([styles.metricCard, { backgroundColor: colors.background, borderColor: colors.border }])}>
              <Text style={[styles.metricValue, { color: colors.textPrimary }]}>{titleCase(transit.status)}</Text>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Status</Text>
            </View>
            <View style={StyleSheet.flatten([styles.metricCard, { backgroundColor: colors.background, borderColor: colors.border }])}>
              <Text style={[styles.metricValue, { color: colors.textPrimary }]}>{transit.currentCompany?.name || 'Pending'}</Text>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Current Company</Text>
            </View>
          </View>
          <Text style={[styles.summaryText, { color: colors.textSecondary }]}>Current leg: {transit.currentEvent ? `${transit.currentEvent.origin} to ${transit.currentEvent.destination}` : `${transit.origin} to ${transit.destination}`}</Text>
          {transit.dispatchDate ? <Text style={[styles.summaryText, { color: colors.textSecondary }]}>Dispatched on {formatDate(transit.dispatchDate)}</Text> : null}
          {transit.estimatedDelivery ? <Text style={[styles.summaryText, { color: colors.textSecondary }]}>Estimated delivery {formatDate(transit.estimatedDelivery)}</Text> : null}
          {transit.cost != null ? <Text style={[styles.summaryText, { color: colors.textSecondary }]}>Agreed cost {formatCurrency(transit.cost)}</Text> : null}
          {transit.actualDelivery ? (
            <Text style={[styles.summaryText, { color: colors.textSecondary }]}>Delivered on {formatDate(transit.actualDelivery)}</Text>
          ) : null}
        </Card>

        <Card style={styles.sectionCard}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Current Company</Text>
          {transit.currentCompany ? (
            <>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Company</Text>
                <Text style={[styles.detailValue, { color: colors.textPrimary }]}>{transit.currentCompany.name}</Text>
              </View>
              {transit.currentCompany.code ? (
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Code</Text>
                  <Text style={[styles.detailValue, { color: colors.textPrimary }]}>{transit.currentCompany.code}</Text>
                </View>
              ) : null}
              {transit.currentCompany.phone ? (
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Phone</Text>
                  <Text style={[styles.detailValue, { color: colors.textPrimary }]}>{transit.currentCompany.phone}</Text>
                </View>
              ) : null}
              {transit.currentCompany.email ? (
                <View style={StyleSheet.flatten([styles.detailRow, styles.detailRowLast])}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Email</Text>
                  <Text style={[styles.detailValue, { color: colors.textPrimary }]}>{transit.currentCompany.email}</Text>
                </View>
              ) : null}
            </>
          ) : (
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No current company is assigned yet. Add a transit event to set the active leg company.</Text>
          )}
        </Card>

        {transit.status === 'DELIVERED' && (transit.deliveryReceiverName || transit.deliveryProofUrl || transit.deliveryNotes || transit.deliveryProofType) ? (
          <Card style={styles.sectionCard}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Delivery Confirmation</Text>
            {transit.deliveryReceiverName ? (
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Received By</Text>
                <Text style={[styles.detailValue, { color: colors.textPrimary }]}>{transit.deliveryReceiverName}</Text>
              </View>
            ) : null}
            {transit.deliveryProofType ? (
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Proof Type</Text>
                <Text style={[styles.detailValue, { color: colors.textPrimary }]}>{transit.deliveryProofType}</Text>
              </View>
            ) : null}
            {transit.deliveryNotes ? (
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Notes</Text>
                <Text style={[styles.detailValue, { color: colors.textPrimary }]}>{transit.deliveryNotes}</Text>
              </View>
            ) : null}
            {transit.deliveryProofUrl ? (
              <TouchableOpacity activeOpacity={0.85} onPress={() => void Linking.openURL(transit.deliveryProofUrl!)} style={styles.proofButton}>
                <Text style={[styles.proofButtonText, { color: colors.accent }]}>{transit.deliveryProofName || 'Open delivery proof'}</Text>
              </TouchableOpacity>
            ) : null}
          </Card>
        ) : null}

        <DetailTabStrip tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

        {activeTab === 'shipments' ? (
        <>
          {transit.status !== 'DELIVERED' && transit.status !== 'CANCELLED' ? (
            <Button title="Add Shipments" onPress={() => setAddShipmentsVisible(true)} style={styles.addShipmentsButton} fullWidth />
          ) : null}
        <Card style={styles.sectionCard}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Linked Shipments</Text>
          {transit.shipments.length === 0 ? (
            <EmptyState icon="shipment" title="No Shipments Linked" description="This transit does not have any linked shipments yet." />
          ) : (
            transit.shipments.map((shipment, index) => (
              <TouchableOpacity
                key={shipment.id}
                activeOpacity={0.85}
                onPress={() => navigation.navigate('ShipmentDetail', { id: shipment.id })}
                style={StyleSheet.flatten([
                  styles.itemRow,
                  index === transit.shipments.length - 1 ? styles.detailRowLast : null,
                  { borderBottomColor: colors.border },
                ])}
              >
                <Text style={[styles.itemTitle, { color: colors.textPrimary }]}>{buildShipmentLabel(shipment)}</Text>
                <Text style={[styles.itemMeta, { color: colors.textSecondary }]}> 
                  {titleCase(shipment.status)} • {shipment.user?.name || shipment.user?.email || 'No customer'}
                </Text>
              </TouchableOpacity>
            ))
          )}
        </Card>
        </>
        ) : null}

        {activeTab === 'events' ? (
        <Card style={styles.sectionCard}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Recent Events</Text>
          {transit.events.length === 0 ? (
            <EmptyState icon="timeline" title="No Transit Events" description="Transit events will appear here once movement updates are recorded." />
          ) : (
            transit.events.map((event, index) => (
              <View
                key={event.id}
                style={StyleSheet.flatten([
                  styles.itemRow,
                  index === transit.events.length - 1 ? styles.detailRowLast : null,
                  { borderBottomColor: colors.border },
                ])}
              >
                <Text style={[styles.itemTitle, { color: colors.textPrimary }]}>{event.origin} to {event.destination}</Text>
                <Text style={[styles.itemMeta, { color: colors.textSecondary }]}>
                  {titleCase(event.status)} • {event.company?.name || 'No company'}
                </Text>
                  {event.company?.phone || event.company?.email ? (
                    <Text style={[styles.itemMeta, { color: colors.textSecondary }]}>{event.company?.phone || event.company?.email}</Text>
                  ) : null}
                <Text style={[styles.itemMeta, { color: colors.textSecondary }]}>{formatDate(event.eventDate || event.createdAt)}</Text>
              </View>
            ))
          )}
        </Card>
        ) : null}

        {activeTab === 'expenses' ? (
        <Card style={styles.sectionCard}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Expense Activity</Text>
          <Text style={[styles.summaryText, { color: colors.textSecondary }]}>Transit expenses and shipment transit expenses should track against the latest route leg so the active company context stays accurate.</Text>
          {transit.expenses.length === 0 ? (
            <EmptyState icon="finance" title="No Transit Expenses" description="Transit and shipment expense entries will appear here when they are recorded." />
          ) : (
            transit.expenses.map((expense, index) => (
              <View
                key={expense.id}
                style={StyleSheet.flatten([
                  styles.itemRow,
                  index === transit.expenses.length - 1 ? styles.detailRowLast : null,
                  { borderBottomColor: colors.border },
                ])}
              >
                <View style={styles.expenseInfo}>
                  <Text style={[styles.itemTitle, { color: colors.textPrimary }]}>{expense.description}</Text>
                  <Text style={[styles.itemMeta, { color: colors.textSecondary }]}>
                    {expense.source === 'TRANSIT_EXPENSE' ? 'Transit expense' : 'Shipment expense'} • {formatDate(expense.date)}
                  </Text>
                    {expense.transitEvent?.company?.name ? (
                      <Text style={[styles.itemMeta, { color: colors.textSecondary }]}>Route company: {expense.transitEvent.company.name}</Text>
                    ) : null}
                </View>
                <View style={styles.expenseSide}>
                  <View style={StyleSheet.flatten([styles.amountPill, { backgroundColor: `${colors.accent}16`, borderColor: `${colors.accent}32` }])}>
                    <Text style={[styles.amountPillText, { color: colors.accent }]}>{formatCurrency(expense.amount)}</Text>
                  </View>
                  {expensesEditable && expense.source === 'TRANSIT_EXPENSE' ? (
                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={() => setEditingExpense(expense)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Text style={[styles.editLink, { color: colors.accent }]}>Edit</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>
            ))
          )}
        </Card>
        ) : null}

        {activeTab === 'company' ? (
        <Card style={styles.sectionCard}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Company Info</Text>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Current Company</Text>
            <Text style={[styles.detailValue, { color: colors.textPrimary }]}>{transit.currentCompany?.name || 'No current company'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Dispatch Date</Text>
            <Text style={[styles.detailValue, { color: colors.textPrimary }]}>{formatDate(transit.dispatchDate)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Estimated Delivery</Text>
            <Text style={[styles.detailValue, { color: colors.textPrimary }]}>{formatDate(transit.estimatedDelivery)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Actual Delivery</Text>
            <Text style={[styles.detailValue, { color: colors.textPrimary }]}>{formatDate(transit.actualDelivery)}</Text>
          </View>
          <View style={[styles.detailRow, styles.detailRowLast]}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Notes</Text>
            <Text style={[styles.detailValue, { color: colors.textPrimary }]}>{transit.notes || 'No notes added'}</Text>
          </View>
        </Card>
        ) : null}
      </ScrollView>

      <ExpenseEditModal
        visible={editingExpense !== null}
        kind="transit"
        entityId={transit.id}
        expense={editingExpense}
        onClose={() => setEditingExpense(null)}
        onSaved={() => void refetch()}
      />

      <AddShipmentsModal
        visible={addShipmentsVisible}
        transitId={transit.id}
        onClose={() => setAddShipmentsVisible(false)}
        onAssigned={() => void refetch()}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.base, paddingBottom: Spacing['4xl'] },
  sectionCard: { marginBottom: Spacing.base },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.base,
  },
  actionButton: {
    flex: 1,
  },
  addShipmentsButton: {
    marginBottom: Spacing.base,
  },
  addModalBody: {
    paddingBottom: Spacing.xl,
  },
  selectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  selectCount: {
    fontSize: Typography.fontSize.xs,
  },
  selectAllLink: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
  },
  shipmentList: {
    flexGrow: 0,
    maxHeight: 340,
  },
  shipmentListContent: {
    gap: Spacing.sm,
  },
  shipmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    borderWidth: 1,
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
  },
  shipmentRowCopy: {
    flex: 1,
    gap: Spacing.xs,
  },
  shipmentRowTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
  },
  shipmentRowMeta: {
    fontSize: Typography.fontSize.xs,
  },
  checkOuter: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkInner: {
    width: 12,
    height: 12,
    borderRadius: 3,
  },
  listStatusWrap: {
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.lg,
  },
  listStatusText: {
    fontSize: Typography.fontSize.sm,
  },
  retryLink: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
  },
  noEligibleText: {
    fontSize: Typography.fontSize.sm,
    lineHeight: 20,
    paddingVertical: Spacing.sm,
  },
  addModalActions: {
    flexDirection: 'column',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    marginBottom: Spacing.md,
  },
  detailRow: {
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'transparent',
  },
  detailRowLast: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  detailLabel: {
    fontSize: Typography.fontSize.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: Spacing.xs,
  },
  detailValue: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.medium,
  },
  proofButton: {
    paddingTop: Spacing.sm,
  },
  proofButtonText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.base,
  },
  metricCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
  },
  metricValue: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    marginBottom: Spacing.xs,
  },
  metricLabel: {
    fontSize: Typography.fontSize.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  summaryText: {
    fontSize: Typography.fontSize.sm,
    lineHeight: 20,
    marginTop: Spacing.xs,
  },
  emptyText: {
    fontSize: Typography.fontSize.base,
    lineHeight: 22,
  },
  itemRow: {
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  itemTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    marginBottom: Spacing.xs,
  },
  itemMeta: {
    fontSize: Typography.fontSize.sm,
  },
  expenseInfo: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  expenseSide: {
    alignItems: 'flex-end',
    gap: Spacing.xs,
  },
  amountPill: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    marginTop: Spacing.xs,
  },
  amountPillText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
  },
  editLink: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
  },
});

export default TransitDetailScreen;