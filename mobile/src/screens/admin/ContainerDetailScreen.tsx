import React, { useMemo, useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { containersApi } from '../../api/containers';
import { AppTopBar } from '../../components/shared/AppTopBar';
import { ExpenseEditModal } from '../../components/admin/ExpenseEditModal';
import { Card } from '../../components/ui/Card';
import { DetailTabStrip, DetailTabOption } from '../../components/shared/DetailTabs';
import { EmptyState } from '../../components/shared/EmptyState';
import { ErrorState } from '../../components/shared/ErrorState';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { useAppTheme } from '../../hooks/useAppTheme';
import { Typography } from '../../constants/typography';
import { BorderRadius, Spacing } from '../../constants/spacing';
import { ContainerDetailExpense } from '../../types/container';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);

const titleCase = (value: string) => value.replace(/_/g, ' ').toLowerCase().replace(/(^|\s)\w/g, (match) => match.toUpperCase());

const buildShipmentLabel = (shipment: { vehicleMake: string | null; vehicleModel: string | null; vehicleVIN: string | null; id: string }) => {
  const vehicleLabel = [shipment.vehicleMake, shipment.vehicleModel].filter(Boolean).join(' ').trim();
  return vehicleLabel || shipment.vehicleVIN || shipment.id;
};

const ContainerDetailScreen: React.FC = () => {
  const route = useRoute<any>();
  const { colors } = useAppTheme();
  const containerId = route.params?.id as string;

  const query = useQuery({
    queryKey: ['container-detail', containerId],
    queryFn: () => containersApi.getContainer(containerId),
    enabled: !!containerId,
  });

  const container = query.data;
  const documentTypes = useMemo(
    () => ['all', ...Array.from(new Set(container?.documents.map((document) => document.type) || []))],
    [container?.documents],
  );
  const [selectedDocumentType, setSelectedDocumentType] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [editingExpense, setEditingExpense] = useState<ContainerDetailExpense | null>(null);

  if (query.isLoading) return <LoadingSpinner fullScreen />;
  if (query.error) return <ErrorState message={(query.error as any).message} onRetry={query.refetch} />;

  if (!container) {
    return <ErrorState message="Container not found." onRetry={query.refetch} />;
  }

  const expensesEditable = container.status !== 'CLOSED';

  const visibleDocuments = selectedDocumentType === 'all'
    ? container.documents
    : container.documents.filter((document) => document.type === selectedDocumentType);

  const tabs: DetailTabOption[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'shipments', label: `Shipments (${container.shipments.length})` },
    { key: 'expenses', label: `Expenses (${container.expenses?.length || 0})` },
    { key: 'damages', label: `Damages (${container.damages?.length || 0})` },
    { key: 'invoices', label: `Invoices (${container.invoices?.length || 0})` },
    { key: 'user-invoices', label: `User Invoices (${container.userInvoices?.length || 0})` },
    { key: 'tracking', label: `Tracking (${container.trackingEvents.length})` },
    { key: 'documents', label: `Documents (${container.documents.length})` },
    { key: 'activity', label: `Activity (${container.auditLogs?.length || 0})` },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <AppTopBar section="Container Details" detail={container.containerNumber} showBack />

        <DetailTabStrip tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

        {activeTab === 'overview' ? (
          <>
        <Card style={styles.sectionCard}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Container Details</Text>
          <Text style={[styles.containerNumber, { color: colors.textPrimary }]}>{container.containerNumber}</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}> 
            {titleCase(container.status)} • {container.shippingLine || 'Shipping line pending'} • {container.currentLocation || 'Location pending'}
          </Text>
          <View style={styles.metricRow}>
            <View style={styles.metricItem}>
              <Text style={[styles.metricValue, { color: colors.textPrimary }]}>{container.progress || 0}%</Text>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Progress</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={[styles.metricValue, { color: colors.textPrimary }]}>{container.shipments.length}</Text>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Shipments</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={[styles.metricValue, { color: colors.textPrimary }]}>{container.documents.length}</Text>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Documents</Text>
            </View>
          </View>
          <Text style={[styles.rowMeta, { color: colors.textSecondary }]}>From {container.loadingPort || 'Origin pending'} to {container.destinationPort || 'Destination pending'}</Text>
          <Text style={[styles.rowMeta, { color: colors.textSecondary }]}>ETA {container.estimatedArrival ? new Date(container.estimatedArrival).toLocaleDateString() : 'Not scheduled'}</Text>
          {container.notes ? <Text style={[styles.notes, { color: colors.textSecondary }]}>{container.notes}</Text> : null}
        </Card>

        {container.totals ? (
          <Card style={styles.sectionCard}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Financial Totals</Text>
            <View style={styles.metricRow}>
              <View style={styles.metricItem}>
                <Text style={[styles.metricValue, { color: colors.textPrimary }]}>{formatCurrency(container.totals.expenses)}</Text>
                <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Expenses</Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={[styles.metricValue, { color: colors.textPrimary }]}>{formatCurrency(container.totals.invoices)}</Text>
                <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Invoices</Text>
              </View>
            </View>
          </Card>
        ) : null}
          </>
        ) : null}

        {activeTab === 'shipments' ? (
        <Card style={styles.sectionCard}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Shipments</Text>
          {container.shipments.length === 0 ? (
            <Text style={[styles.rowMeta, { color: colors.textSecondary }]}>No shipments currently linked to this container.</Text>
          ) : (
            container.shipments.map((shipment, index) => (
              <View
                key={shipment.id}
                style={StyleSheet.flatten([
                  styles.detailRow,
                  index === container.shipments.length - 1 ? styles.detailRowLast : null,
                  { borderBottomColor: colors.border },
                ])}
              >
                <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>{buildShipmentLabel(shipment)}</Text>
                <Text style={[styles.rowMeta, { color: colors.textSecondary }]}>
                  {shipment.vehicleVIN || 'VIN pending'} • {titleCase(shipment.status)}
                  {shipment.user?.email ? ` • ${shipment.user.email}` : ''}
                </Text>
              </View>
            ))
          )}
        </Card>
        ) : null}

        {activeTab === 'tracking' ? (
        <Card style={styles.sectionCard}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Tracking Events</Text>
          {container.trackingEvents.length === 0 ? (
            <Text style={[styles.rowMeta, { color: colors.textSecondary }]}>No tracking events recorded yet.</Text>
          ) : (
            container.trackingEvents.slice(0, 8).map((event, index) => (
              <View
                key={event.id}
                style={StyleSheet.flatten([
                  styles.detailRow,
                  index === Math.min(container.trackingEvents.length, 8) - 1 ? styles.detailRowLast : null,
                  { borderBottomColor: colors.border },
                ])}
              >
                <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>{titleCase(event.status)}</Text>
                <Text style={[styles.rowMeta, { color: colors.textSecondary }]}>
                  {event.location || 'Location pending'} • {new Date(event.eventDate || event.createdAt || Date.now()).toLocaleString()}
                </Text>
                {event.description ? <Text style={[styles.rowMeta, { color: colors.textSecondary }]}>{event.description}</Text> : null}
              </View>
            ))
          )}
        </Card>
        ) : null}

        {activeTab === 'documents' ? (
        <Card style={styles.sectionCard}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Documents</Text>
          {documentTypes.length > 1 ? (
            <View style={styles.filterRow}>
              {documentTypes.map((type) => {
                const selected = type === selectedDocumentType;

                return (
                  <TouchableOpacity
                    key={type}
                    activeOpacity={0.85}
                    style={StyleSheet.flatten([
                      styles.filterChip,
                      {
                        backgroundColor: selected ? `${colors.accent}18` : colors.panel,
                        borderColor: selected ? `${colors.accent}35` : colors.border,
                      },
                    ])}
                    onPress={() => setSelectedDocumentType(type)}
                  >
                    <Text style={[styles.filterChipText, { color: selected ? colors.accent : colors.textPrimary }]}>
                      {type === 'all' ? 'All' : titleCase(type)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : null}
          {visibleDocuments.length === 0 ? (
            <Text style={[styles.rowMeta, { color: colors.textSecondary }]}>No container documents uploaded yet.</Text>
          ) : (
            visibleDocuments.map((document, index) => (
              <View
                key={document.id}
                style={StyleSheet.flatten([
                  styles.detailRow,
                  index === visibleDocuments.length - 1 ? styles.detailRowLast : null,
                  { borderBottomColor: colors.border },
                ])}
              >
                <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>{document.name}</Text>
                <Text style={[styles.rowMeta, { color: colors.textSecondary }]}> 
                  {titleCase(document.type)} • {new Date(document.uploadedAt).toLocaleDateString()}
                </Text>
                <TouchableOpacity activeOpacity={0.85} onPress={() => void Linking.openURL(document.fileUrl)}>
                  <Text style={[styles.linkText, { color: colors.accent }]}>Open document</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </Card>
        ) : null}

        {activeTab === 'expenses' ? (
          <Card style={styles.sectionCard}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Expenses</Text>

            {container.totals ? (
              <View style={styles.metricRow}>
                <View style={styles.metricItem}>
                  <Text style={[styles.metricValue, { color: colors.textPrimary }]}>{formatCurrency(container.totals.expenses)}</Text>
                  <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Expenses</Text>
                </View>
                <View style={styles.metricItem}>
                  <Text style={[styles.metricValue, { color: colors.textPrimary }]}>{formatCurrency(container.totals.invoices)}</Text>
                  <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Invoices</Text>
                </View>
              </View>
            ) : null}

            {container.expenses && container.expenses.length > 0 ? (
              <View style={styles.financialBlock}>
                {container.expenses.map((expense, index) => (
                  <View
                    key={expense.id}
                    style={StyleSheet.flatten([
                      styles.detailRow,
                      styles.rowWithAction,
                      index === container.expenses!.length - 1 ? styles.detailRowLast : null,
                      { borderBottomColor: colors.border },
                    ])}
                  >
                    <View style={styles.rowActionInfo}>
                      <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>
                        {expense.description || titleCase(expense.type || 'Expense')}
                      </Text>
                      <Text style={[styles.rowMeta, { color: colors.textSecondary }]}>
                        {formatCurrency(expense.amount)} • {expense.vendor || 'Vendor pending'} • {new Date(expense.date).toLocaleDateString()}
                      </Text>
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
                ))}
              </View>
            ) : null}

            {!container.totals && (!container.expenses || container.expenses.length === 0) ? (
              <EmptyState icon="finance" title="No Expense Data" description="Container and shipment expenses will appear here when available." />
            ) : null}
          </Card>
        ) : null}

        {activeTab === 'damages' ? (
          <Card style={styles.sectionCard}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Shipment Damages</Text>
            {!container.damages || container.damages.length === 0 ? (
              <EmptyState title="No Damage Records" description="Damage records for shipments in this container will appear here." />
            ) : (
              container.damages.map((damage, index) => (
                <View
                  key={damage.id}
                  style={StyleSheet.flatten([
                    styles.detailRow,
                    index === container.damages!.length - 1 ? styles.detailRowLast : null,
                    { borderBottomColor: colors.border },
                  ])}
                >
                  <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>{damage.shipment ? buildShipmentLabel(damage.shipment) : damage.shipmentId}</Text>
                  <Text style={[styles.rowMeta, { color: colors.textSecondary }]}> 
                    {titleCase(damage.damageType)} • {formatCurrency(damage.amount)} • {new Date(damage.createdAt).toLocaleDateString()}
                  </Text>
                  <Text style={[styles.rowMeta, { color: colors.textSecondary }]}>{damage.description}</Text>
                </View>
              ))
            )}
          </Card>
        ) : null}

        {activeTab === 'invoices' ? (
          <Card style={styles.sectionCard}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Container Invoices</Text>
            {container.invoices && container.invoices.length > 0 ? (
              <View style={styles.financialBlock}>
                {container.invoices.map((invoice, index) => (
                  <View
                    key={invoice.id}
                    style={StyleSheet.flatten([
                      styles.detailRow,
                      index === container.invoices!.length - 1 ? styles.detailRowLast : null,
                      { borderBottomColor: colors.border },
                    ])}
                  >
                    <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>{invoice.invoiceNumber || invoice.id}</Text>
                    <Text style={[styles.rowMeta, { color: colors.textSecondary }]}> 
                      {formatCurrency(invoice.amount)} • {titleCase(invoice.status || 'pending')} • {invoice.date ? new Date(invoice.date).toLocaleDateString() : 'Date pending'}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}

            {!container.invoices || container.invoices.length === 0 ? (
              <EmptyState icon="finance" title="No Invoices" description="Container invoices will appear here when they are created." />
            ) : null}
          </Card>
        ) : null}

        {activeTab === 'user-invoices' ? (
          <Card style={styles.sectionCard}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>User Invoices</Text>
            {!container.userInvoices || container.userInvoices.length === 0 ? (
              <EmptyState icon="finance" title="No User Invoices" description="Customer invoices for shipments in this container will appear here." />
            ) : (
              container.userInvoices.map((invoice, index) => (
                <View
                  key={invoice.id}
                  style={StyleSheet.flatten([
                    styles.detailRow,
                    index === container.userInvoices!.length - 1 ? styles.detailRowLast : null,
                    { borderBottomColor: colors.border },
                  ])}
                >
                  <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>{invoice.invoiceNumber}</Text>
                  <Text style={[styles.rowMeta, { color: colors.textSecondary }]}> 
                    {invoice.user.name || invoice.user.email || 'Customer pending'} • {titleCase(invoice.status)} • {new Date(invoice.issueDate).toLocaleDateString()}
                  </Text>
                  <Text style={[styles.rowMeta, { color: colors.textSecondary }]}> 
                    {formatCurrency(invoice.total)}{invoice._count?.lineItems ? ` • ${invoice._count.lineItems} line items` : ''}
                  </Text>
                </View>
              ))
            )}
          </Card>
        ) : null}

        {activeTab === 'activity' ? (
          <Card style={styles.sectionCard}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Activity History</Text>
            {!container.auditLogs || container.auditLogs.length === 0 ? (
              <EmptyState icon="timeline" title="No Activity History" description="Container audit activity will appear here when actions are recorded." />
            ) : (
              container.auditLogs.map((log, index) => (
                <View
                  key={log.id}
                  style={StyleSheet.flatten([
                    styles.detailRow,
                    index === container.auditLogs!.length - 1 ? styles.detailRowLast : null,
                    { borderBottomColor: colors.border },
                  ])}
                >
                  <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>{titleCase(log.action)}</Text>
                  <Text style={[styles.rowMeta, { color: colors.textSecondary }]}>{new Date(log.timestamp).toLocaleString()}</Text>
                  <Text style={[styles.rowMeta, { color: colors.textSecondary }]}>{log.description}</Text>
                </View>
              ))
            )}
          </Card>
        ) : null}
      </ScrollView>

      <ExpenseEditModal
        visible={editingExpense !== null}
        kind="container"
        entityId={container.id}
        expense={editingExpense}
        onClose={() => setEditingExpense(null)}
        onSaved={() => void query.refetch()}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.base },
  sectionCard: { marginBottom: Spacing.base },
  title: { fontSize: Typography.fontSize.xl, fontWeight: Typography.fontWeight.bold, marginBottom: Spacing.sm },
  containerNumber: { fontSize: Typography.fontSize['2xl'], fontWeight: Typography.fontWeight.bold, marginBottom: Spacing.xs },
  subtitle: { fontSize: Typography.fontSize.base, lineHeight: 22 },
  metricRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.base },
  metricItem: { flex: 1, padding: Spacing.sm, borderRadius: BorderRadius.base },
  metricValue: { fontSize: Typography.fontSize.lg, fontWeight: Typography.fontWeight.bold, marginBottom: Spacing.xs },
  metricLabel: { fontSize: Typography.fontSize.xs },
  sectionTitle: { fontSize: Typography.fontSize.lg, fontWeight: Typography.fontWeight.bold, marginBottom: Spacing.sm },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs, marginBottom: Spacing.base },
  filterChip: { borderWidth: 1, borderRadius: BorderRadius.full, paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm },
  filterChipText: { fontSize: Typography.fontSize.xs, fontWeight: Typography.fontWeight.semibold },
  detailRow: { borderBottomWidth: 1, paddingVertical: Spacing.sm },
  detailRowLast: { borderBottomWidth: 0, paddingBottom: 0 },
  rowTitle: { fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.semibold, marginBottom: Spacing.xs },
  rowMeta: { fontSize: Typography.fontSize.xs, lineHeight: 18 },
  notes: { fontSize: Typography.fontSize.sm, lineHeight: 20, marginTop: Spacing.sm },
  linkText: { fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.semibold, marginTop: Spacing.xs },
  financialBlock: { marginTop: Spacing.base },
  blockTitle: { fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.semibold, marginBottom: Spacing.sm },
  rowWithAction: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  rowActionInfo: {
    flex: 1,
  },
  editLink: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    paddingTop: Spacing.xs,
  },
});

export default ContainerDetailScreen;
