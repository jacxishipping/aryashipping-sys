import React, { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useInvoices } from '../../hooks/useInvoices';
import { ErrorState } from '../../components/shared/ErrorState';
import { AppTopBar } from '../../components/shared/AppTopBar';
import { SectionHeader } from '../../components/shared/SectionHeader';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { InvoiceCard } from '../../components/customer/InvoiceCard';
import { invoicesApi } from '../../api/invoices';
import { useAppTheme } from '../../hooks/useAppTheme';
import { BorderRadius, Spacing } from '../../constants/spacing';
import { Typography } from '../../constants/typography';
import { Invoice } from '../../types/invoice';

const statusOptions = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Sent', value: 'SENT' },
  { label: 'Overdue', value: 'OVERDUE' },
  { label: 'Paid', value: 'PAID' },
  { label: 'Draft', value: 'DRAFT' },
] as const;

const canReverseInvoice = (invoice: Invoice) => invoice.status === 'SENT' || invoice.status === 'OVERDUE';
const canDiscardInvoice = (invoice: Invoice) => invoice.status === 'DRAFT' || invoice.status === 'PENDING';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);

const InvoicesScreen: React.FC = () => {
  const { colors } = useAppTheme();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<(typeof statusOptions)[number]['value']>('all');
  const [updatingInvoiceId, setUpdatingInvoiceId] = useState<string | null>(null);

  const { data, isLoading, error, refetch } = useInvoices(
    {
      search: search || undefined,
      status: status === 'all' ? undefined : status,
    },
    { pageSize: 50 },
  );

  const invoices = data?.invoices || [];
  const summary = useMemo(
    () => ({
      total: invoices.length,
      dueAmount: invoices.reduce((sum, invoice) => sum + invoice.amountDue, 0),
      overdueCount: invoices.filter((invoice) => invoice.status === 'OVERDUE').length,
      paidAmount: invoices.reduce((sum, invoice) => sum + invoice.amountPaid, 0),
    }),
    [invoices],
  );

  const handleReverse = (invoice: Invoice) => {
    Alert.alert(
      'Reverse invoice',
      `Cancel ${invoice.invoiceNumber}? Reversing marks it as cancelled and releases its charges while keeping the audit trail.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reverse',
          onPress: async () => {
            try {
              setUpdatingInvoiceId(invoice.id);
              await invoicesApi.updateInvoice(invoice.id, { status: 'CANCELLED' });
              await refetch();
              Alert.alert('Invoice reversed', `${invoice.invoiceNumber} was marked as cancelled.`);
            } catch (error: any) {
              Alert.alert('Unable to reverse invoice', error?.message || 'The invoice could not be reversed.');
            } finally {
              setUpdatingInvoiceId(null);
            }
          },
        },
      ],
    );
  };

  const handleDiscard = (invoice: Invoice) => {
    Alert.alert(
      'Discard invoice',
      `Delete ${invoice.invoiceNumber}? This removes the invoice and its linked ledger transactions.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setUpdatingInvoiceId(invoice.id);
              await invoicesApi.deleteInvoice(invoice.id);
              await refetch();
              Alert.alert('Invoice discarded', `${invoice.invoiceNumber} was deleted.`);
            } catch (error: any) {
              Alert.alert('Unable to discard invoice', error?.message || 'The invoice could not be deleted.');
            } finally {
              setUpdatingInvoiceId(null);
            }
          },
        },
      ],
    );
  };

  if (isLoading) return <LoadingSpinner fullScreen />;
  if (error) return <ErrorState message={(error as any).message} onRetry={refetch} />;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <AppTopBar section="Invoices" detail="Outstanding balances, filters, and billing health" showBack />

        <SectionHeader
          title="Invoices"
          description="Outstanding balances, filters, and billing health"
          meta={[
            { label: 'Total', value: summary.total },
            { label: 'Overdue', value: summary.overdueCount, intent: 'warning' },
          ]}
        />

        <Input value={search} onChangeText={setSearch} placeholder="Search by invoice, customer, or shipment" />

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
          <Card style={styles.metricCard}>
            <Text style={[styles.metricValue, { color: colors.textPrimary }]}>{summary.total}</Text>
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Visible</Text>
          </Card>
          <Card style={styles.metricCard}>
            <Text style={[styles.metricValue, { color: colors.textPrimary }]}>{summary.overdueCount}</Text>
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Overdue</Text>
          </Card>
          <Card style={styles.metricCard}>
            <Text style={[styles.metricValue, { color: colors.textPrimary }]}>{formatCurrency(summary.dueAmount)}</Text>
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Due</Text>
          </Card>
        </View>

        {invoices.length === 0 ? (
          <Card>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No invoices matched the current filters.</Text>
          </Card>
        ) : (
          invoices.map((invoice) => {
            const canReverse = canReverseInvoice(invoice);
            const canDiscard = canDiscardInvoice(invoice);
            const busy = updatingInvoiceId === invoice.id;

            return (
              <InvoiceCard
                key={invoice.id}
                invoice={invoice}
                footer={
                  <View>
                    <Text style={[styles.invoiceMeta, { color: colors.textSecondary }]}>
                      {invoice.customerName || invoice.customerEmail || 'Unknown customer'}
                      {invoice.shipmentId ? ` • Shipment ${invoice.shipmentId.slice(0, 8)}` : ''}
                    </Text>
                    {canReverse || canDiscard ? (
                      <View style={styles.invoiceActions}>
                        {canReverse ? (
                          <Button
                            title="Reverse"
                            variant="secondary"
                            size="sm"
                            onPress={() => handleReverse(invoice)}
                            loading={busy}
                            disabled={updatingInvoiceId !== null && !busy}
                            style={styles.invoiceActionButton}
                          />
                        ) : null}
                        {canDiscard ? (
                          <Button
                            title="Discard"
                            variant="danger"
                            size="sm"
                            onPress={() => handleDiscard(invoice)}
                            loading={busy}
                            disabled={updatingInvoiceId !== null && !busy}
                            style={styles.invoiceActionButton}
                          />
                        ) : null}
                      </View>
                    ) : null}
                  </View>
                }
              />
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.base, paddingBottom: Spacing['4xl'] },
  title: { fontSize: Typography.fontSize['2xl'], fontWeight: Typography.fontWeight.bold, marginBottom: Spacing.xs },
  subtitle: { fontSize: Typography.fontSize.sm, lineHeight: 20, marginBottom: Spacing.base },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs, marginBottom: Spacing.base },
  filterChip: { borderWidth: 1, borderRadius: BorderRadius.full, paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm },
  filterChipText: { fontSize: Typography.fontSize.xs, fontWeight: Typography.fontWeight.semibold },
  metricRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.base },
  metricCard: { flex: 1, paddingVertical: Spacing.base },
  metricValue: { fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.bold, textAlign: 'center' },
  metricLabel: { fontSize: Typography.fontSize.xs, textAlign: 'center', marginTop: Spacing.xs },
  invoiceMeta: { fontSize: Typography.fontSize.xs, marginTop: Spacing.sm },
  invoiceActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  invoiceActionButton: {
    flex: 1,
  },
  emptyText: { fontSize: Typography.fontSize.sm },
});
export default InvoicesScreen;
