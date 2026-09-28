import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { dispatchesApi } from '../../api/dispatches';
import { Button } from '../../components/ui/Button';
import { DetailTabOption, DetailTabStrip } from '../../components/shared/DetailTabs';
import { EmptyState } from '../../components/shared/EmptyState';
import { ErrorState } from '../../components/shared/ErrorState';
import { ExpenseEditModal } from '../../components/admin/ExpenseEditModal';
import { ModuleSummaryHeader } from '../../components/shared/ModuleSummaryHeader';
import { Card } from '../../components/ui/Card';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { BorderRadius, Spacing } from '../../constants/spacing';
import { Typography } from '../../constants/typography';
import { useAppTheme } from '../../hooks/useAppTheme';
import { AdminStackParamList } from '../../navigation/AdminNavigator';
import { DispatchDetailExpense } from '../../types/dispatch';

type RouteProps = RouteProp<AdminStackParamList, 'DispatchDetail'>;

const formatCurrency = (amount?: number | null) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);

const formatDate = (value?: string | null) => {
  if (!value) {
    return 'Not set';
  }

  return new Date(value).toLocaleDateString();
};

const titleCase = (value: string) => value.replace(/_/g, ' ').toLowerCase().replace(/(^|\s)\w/g, (match) => match.toUpperCase());

const buildContactLines = (contact: { email?: string | null; phone?: string | null; code?: string | null } | null | undefined) => {
  const lines = [contact?.phone, contact?.email].filter(Boolean) as string[];

  if (contact?.code) {
    lines.push(`Code ${contact.code}`);
  }

  return lines.length > 0 ? lines : ['No contact saved'];
};

const buildShipmentLabel = (shipment: { vehicleYear?: number | null; vehicleMake?: string | null; vehicleModel?: string | null; vehicleVIN?: string | null }) => {
  const label = [shipment.vehicleYear, shipment.vehicleMake, shipment.vehicleModel].filter(Boolean).join(' ').trim();
  return label || shipment.vehicleVIN || 'Shipment';
};

const DispatchDetailScreen: React.FC = () => {
  const route = useRoute<RouteProps>();
  const navigation = useNavigation<any>();
  const { colors } = useAppTheme();
  const [activeTab, setActiveTab] = useState<string>('shipments');
  const [editingExpense, setEditingExpense] = useState<DispatchDetailExpense | null>(null);

  const { data: dispatch, isLoading, error, refetch } = useQuery({
    queryKey: ['dispatch', route.params.id],
    queryFn: () => dispatchesApi.getDispatch(route.params.id),
  });

  if (isLoading) return <LoadingSpinner fullScreen />;
  if (error) return <ErrorState message={(error as any).message} onRetry={refetch} />;
  if (!dispatch) return <ErrorState message="Dispatch not found" onRetry={refetch} />;

  const totalExpenses = dispatch.expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const expensesEditable = dispatch.status !== 'COMPLETED' && dispatch.status !== 'CANCELLED';
  const companyContactLines = buildContactLines(dispatch.company);
  const tabs: DetailTabOption[] = [
    { key: 'shipments', label: `Shipments (${dispatch._count.shipments})` },
    { key: 'events', label: `Events (${dispatch._count.events})` },
    { key: 'expenses', label: `Expenses (${dispatch._count.expenses})` },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <ModuleSummaryHeader
          eyebrow="OPERATIONS / DISPATCHES"
          title={dispatch.referenceNumber}
          subtitle={`${dispatch.origin} to ${dispatch.destination}`}
          showBack
          stats={[
            { label: 'Status', value: titleCase(dispatch.status) },
            { label: 'Shipments', value: String(dispatch._count.shipments) },
            { label: 'Expenses', value: formatCurrency(totalExpenses) },
          ]}
        />

        <View style={styles.actionRow}>
          {dispatch.company?.id ? (
            <Button title="Company Ledger" onPress={() => navigation.navigate('CompanyLedgerDetail', { id: dispatch.company!.id })} style={styles.actionButton} />
          ) : null}
          <Button title="All Dispatches" variant="secondary" onPress={() => navigation.navigate('Dispatches')} style={styles.actionButton} />
        </View>

        <Card style={styles.sectionCard}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Dispatch Snapshot</Text>
          <Text style={[styles.sectionIntro, { color: colors.textSecondary }]}>Core route, carrier, and handoff details for this road-to-port leg.</Text>
          <View style={styles.metricsRow}>
            <View style={StyleSheet.flatten([styles.metricCard, { backgroundColor: colors.background, borderColor: colors.border }])}>
              <Text style={[styles.metricValue, { color: colors.textPrimary }]}>{dispatch.company?.name || 'Pending'}</Text>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Company</Text>
            </View>
            <View style={StyleSheet.flatten([styles.metricCard, { backgroundColor: colors.background, borderColor: colors.border }])}>
              <Text style={[styles.metricValue, { color: colors.textPrimary }]}>{formatCurrency(dispatch.cost)}</Text>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Agreed Cost</Text>
            </View>
          </View>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Company</Text>
            <Text style={[styles.detailValue, { color: colors.textPrimary }]}>{dispatch.company?.name || 'Pending'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Company Contact</Text>
            <View style={styles.detailStack}>
              {companyContactLines.map((line) => (
                <Text key={line} style={[styles.detailValue, styles.detailValueCompact, { color: colors.textPrimary }]}>{line}</Text>
              ))}
            </View>
          </View>
          <View style={styles.dateGrid}>
            <View style={StyleSheet.flatten([styles.dateCard, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }])}>
              <Text style={[styles.dateLabel, { color: colors.textSecondary }]}>Dispatch Date</Text>
              <Text style={[styles.dateValue, { color: colors.textPrimary }]}>{formatDate(dispatch.dispatchDate)}</Text>
            </View>
            <View style={StyleSheet.flatten([styles.dateCard, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }])}>
              <Text style={[styles.dateLabel, { color: colors.textSecondary }]}>ETA</Text>
              <Text style={[styles.dateValue, { color: colors.textPrimary }]}>{formatDate(dispatch.estimatedArrival)}</Text>
            </View>
            <View style={StyleSheet.flatten([styles.dateCard, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }])}>
              <Text style={[styles.dateLabel, { color: colors.textSecondary }]}>Actual Arrival</Text>
              <Text style={[styles.dateValue, { color: colors.textPrimary }]}>{formatDate(dispatch.actualArrival)}</Text>
            </View>
          </View>
          {dispatch.notes ? <Text style={[styles.summaryText, styles.notesText, { color: colors.textSecondary }]}>{dispatch.notes}</Text> : null}
        </Card>

        {dispatch.company ? (
          <Card style={styles.sectionCard}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Ledger Recovery Context</Text>
            <Text style={[styles.summaryText, { color: colors.textSecondary }]}>This dispatch uses {dispatch.company.name} for dispatch expense recovery. Expenses recorded against this dispatch should reconcile back to that company ledger and the assigned shipments.</Text>
          </Card>
        ) : null}

        <Card style={styles.sectionCard}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Workflow Guidance</Text>
          <Text style={[styles.summaryText, { color: colors.textSecondary }]}>Use this dispatch as the road-to-port leg. Shipments should either be completed back to yard or handed directly into a container, not left in an in-between state.</Text>
        </Card>

        <DetailTabStrip tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

        {activeTab === 'shipments' ? (
          <Card style={styles.sectionCard}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Assigned Shipments</Text>
            {dispatch.shipments.length === 0 ? (
              <EmptyState icon="shipment" title="No Shipments Assigned" description="This dispatch does not have any assigned shipments yet." />
            ) : (
              dispatch.shipments.map((shipment, index) => (
                <TouchableOpacity
                  key={shipment.id}
                  activeOpacity={0.85}
                  onPress={() => navigation.navigate('ShipmentDetail', { id: shipment.id })}
                  style={StyleSheet.flatten([
                    styles.itemRow,
                    index === dispatch.shipments.length - 1 ? styles.itemRowLast : null,
                    { borderBottomColor: colors.border },
                  ])}
                >
                  <Text style={[styles.itemTitle, { color: colors.textPrimary }]}>{buildShipmentLabel(shipment)}</Text>
                  <Text style={[styles.itemMeta, { color: colors.textSecondary }]}>{titleCase(shipment.status)} • {shipment.user?.name || shipment.user?.email || 'No customer'}</Text>
                </TouchableOpacity>
              ))
            )}
          </Card>
        ) : null}

        {activeTab === 'events' ? (
          <Card style={styles.sectionCard}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Dispatch Events</Text>
            {dispatch.events.length === 0 ? (
              <EmptyState icon="timeline" title="No Dispatch Events" description="Dispatch milestones will appear here once they are recorded." />
            ) : (
              dispatch.events.map((event, index) => (
                <View
                  key={event.id}
                  style={StyleSheet.flatten([
                    styles.itemRow,
                    index === dispatch.events.length - 1 ? styles.itemRowLast : null,
                    { borderBottomColor: colors.border },
                  ])}
                >
                  <Text style={[styles.itemTitle, { color: colors.textPrimary }]}>{titleCase(event.status)}</Text>
                  <Text style={[styles.itemMeta, { color: colors.textSecondary }]}>{event.location || 'Location pending'} • {formatDate(event.eventDate || event.createdAt)}</Text>
                  {event.createdByLabel ? <Text style={[styles.itemMeta, { color: colors.textSecondary }]}>Logged by {event.createdByLabel}</Text> : null}
                  {event.description ? <Text style={[styles.itemMeta, { color: colors.textSecondary }]}>{event.description}</Text> : null}
                </View>
              ))
            )}
          </Card>
        ) : null}

        {activeTab === 'expenses' ? (
          <Card style={styles.sectionCard}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Dispatch Expenses</Text>
            {dispatch.expenses.length === 0 ? (
              <EmptyState icon="finance" title="No Dispatch Expenses" description="Shared dispatch costs will appear here when they are recorded." />
            ) : (
              dispatch.expenses.map((expense, index) => (
                <View
                  key={expense.id}
                  style={StyleSheet.flatten([
                    styles.itemRow,
                    index === dispatch.expenses.length - 1 ? styles.itemRowLast : null,
                    { borderBottomColor: colors.border },
                  ])}
                >
                  <View style={styles.expenseInfo}>
                    <Text style={[styles.itemTitle, { color: colors.textPrimary }]}>{expense.description}</Text>
                    <Text style={[styles.itemMeta, { color: colors.textSecondary }]}>{titleCase(expense.type)} • {formatDate(expense.date)}</Text>
                    {expense.vendor || expense.invoiceNumber ? (
                      <Text style={[styles.itemMeta, { color: colors.textSecondary }]}>{expense.vendor || 'Vendor pending'}{expense.invoiceNumber ? ` • Invoice ${expense.invoiceNumber}` : ''}</Text>
                    ) : null}
                    <Text style={[styles.itemMeta, { color: colors.textSecondary }]}>{expense.shipment ? buildShipmentLabel(expense.shipment) : 'General dispatch expense'}</Text>
                  </View>
                  <View style={styles.expenseSide}>
                    <View style={StyleSheet.flatten([styles.amountPill, { backgroundColor: `${colors.accent}16`, borderColor: `${colors.accent}32` }])}>
                      <Text style={[styles.amountPillText, { color: colors.accent }]}>{formatCurrency(expense.amount)}</Text>
                    </View>
                    {expensesEditable ? (
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
      </ScrollView>

      <ExpenseEditModal
        visible={editingExpense !== null}
        kind="dispatch"
        entityId={dispatch.id}
        expense={editingExpense}
        onClose={() => setEditingExpense(null)}
        onSaved={() => void refetch()}
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
  sectionTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    marginBottom: Spacing.sm,
  },
  sectionIntro: {
    fontSize: Typography.fontSize.sm,
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  detailRow: {
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'transparent',
  },
  detailStack: {
    gap: Spacing.xs,
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
  detailValueCompact: {
    fontSize: Typography.fontSize.sm,
    lineHeight: 20,
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
    marginTop: Spacing.sm,
  },
  notesText: {
    paddingTop: Spacing.xs,
  },
  dateGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.base,
  },
  dateCard: {
    width: '48%',
    borderWidth: 1,
    borderRadius: BorderRadius.xl,
    padding: Spacing.sm,
  },
  dateLabel: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    marginBottom: Spacing.xs,
  },
  dateValue: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
  },
  itemRow: {
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  itemRowLast: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  itemTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    marginBottom: Spacing.xs,
  },
  itemMeta: {
    fontSize: Typography.fontSize.sm,
    lineHeight: 20,
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

export default DispatchDetailScreen;