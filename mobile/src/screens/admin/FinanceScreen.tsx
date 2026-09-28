import React, { useMemo, useState } from 'react';
import { Alert, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { invoicesApi } from '../../api/invoices';
import { API_URL } from '../../api/client';
import { AppIcon, AppIconName } from '../../components/shared/AppIcon';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { ErrorState } from '../../components/shared/ErrorState';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ModuleSummaryHeader } from '../../components/shared/ModuleSummaryHeader';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { useAppTheme } from '../../hooks/useAppTheme';
import { BorderRadius, Spacing } from '../../constants/spacing';
import { Typography } from '../../constants/typography';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);

const quickActions = [
  { title: 'Invoices', description: 'Review all invoices and billing status.', icon: 'invoices' as AppIconName, screen: 'Invoices' },
  { title: 'Banking', description: 'Open connected bank workflows and reconciliation.', icon: 'banking' as AppIconName, screen: 'Banking' },
  { title: 'Company Ledgers', description: 'Inspect company-level balances and charges.', icon: 'ledgers' as AppIconName, screen: 'CompanyLedgers' },
  { title: 'Reports', description: 'Jump into financial reporting and aging.', icon: 'reports' as AppIconName, screen: 'FinanceReports' },
] as const;

const FinanceScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { colors } = useAppTheme();
  const [updatingInvoiceId, setUpdatingInvoiceId] = useState<string | null>(null);

  const invoicesQuery = useQuery({
    queryKey: ['finance-workspace-invoices'],
    queryFn: () => invoicesApi.getInvoices({}, { pageSize: 50 }),
  });

  const invoices = invoicesQuery.data?.invoices || [];
  const actionQueue = useMemo(
    () => invoices.filter((invoice) => invoice.status === 'OVERDUE' || invoice.status === 'PENDING').slice(0, 8),
    [invoices],
  );
  const summary = useMemo(
    () => ({
      visible: invoices.length,
      overdue: invoices.filter((invoice) => invoice.status === 'OVERDUE').length,
      dueAmount: invoices.reduce((sum, invoice) => sum + invoice.amountDue, 0),
      paidAmount: invoices.reduce((sum, invoice) => sum + invoice.amountPaid, 0),
    }),
    [invoices],
  );

  const handleMarkPaid = async (invoiceId: string) => {
    try {
      setUpdatingInvoiceId(invoiceId);
      await invoicesApi.markAsPaid(invoiceId, { method: 'mobile-admin' });
      await invoicesQuery.refetch();
      Alert.alert('Invoice updated', 'The invoice was marked as paid.');
    } catch (error: any) {
      Alert.alert('Unable to update invoice', error?.message || 'The invoice could not be marked as paid.');
    } finally {
      setUpdatingInvoiceId(null);
    }
  };

  if (invoicesQuery.isLoading) return <LoadingSpinner fullScreen />;
  if (invoicesQuery.error) return <ErrorState message={(invoicesQuery.error as any).message} onRetry={invoicesQuery.refetch} />;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={styles.content}>
      <ModuleSummaryHeader
        eyebrow="FINANCE"
        title="Finance"
        subtitle="A live finance workspace with payment queue, overdue invoice actions, and direct paths into banking, ledgers, and reporting."
        showBack
        stats={[
          { label: 'Visible Invoices', value: String(summary.visible) },
          { label: 'Overdue', value: String(summary.overdue) },
          { label: 'Amount Due', value: formatCurrency(summary.dueAmount) },
          { label: 'Paid', value: formatCurrency(summary.paidAmount) },
        ]}
      />

      <Card style={styles.sectionCard}>
        <Text style={[styles.sectionEyebrow, { color: colors.textSecondary }]}>Finance Workspaces</Text>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Quick Actions</Text>
        <Text style={[styles.sectionText, { color: colors.textSecondary }]}>Jump into the finance areas that need active admin attention without dropping into old flat utility tiles.</Text>
        <View style={styles.actionGrid}>
          {quickActions.map((action) => (
            <TouchableOpacity
              key={action.title}
              activeOpacity={0.85}
              onPress={() => navigation.navigate(action.screen)}
              style={StyleSheet.flatten([styles.actionTile, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }])}
            >
              <View style={StyleSheet.flatten([styles.actionBadge, { backgroundColor: `${colors.accent}14`, borderColor: `${colors.accent}30` }])}>
                <AppIcon name={action.icon} size={18} color={colors.accent} />
              </View>
              <Text style={[styles.actionTitle, { color: colors.textPrimary }]}>{action.title}</Text>
              <Text style={[styles.actionDescription, { color: colors.textSecondary }]}>{action.description}</Text>
              <View style={styles.actionFooter}>
                <Text style={[styles.actionFooterText, { color: colors.accent }]}>Open Workspace</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </Card>

      <Card style={styles.sectionCard}>
        <Text style={[styles.sectionEyebrow, { color: colors.textSecondary }]}>Invoice Triage</Text>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Payment Queue</Text>
        <Text style={[styles.sectionText, { color: colors.textSecondary }]}>Mark overdue or pending invoices as paid and open invoice PDFs directly from the finance workspace.</Text>

        {actionQueue.length === 0 ? (
          <Text style={[styles.sectionText, { color: colors.textSecondary }]}>No overdue or pending invoices need action right now.</Text>
        ) : (
          actionQueue.map((invoice, index) => (
            <View
              key={invoice.id}
              style={StyleSheet.flatten([
                styles.queueRow,
                index === actionQueue.length - 1 ? styles.queueRowLast : null,
                { borderBottomColor: colors.border },
              ])}
            >
              <View style={styles.queueRowTop}>
                <View style={styles.queueTextWrap}>
                  <Text style={[styles.queueTitle, { color: colors.textPrimary }]}>{invoice.invoiceNumber}</Text>
                  <Text style={[styles.queueMeta, { color: colors.textSecondary }]}>
                    {invoice.customerName || invoice.customerEmail || 'Unknown customer'}
                    {invoice.shipmentId ? ` • Shipment ${invoice.shipmentId.slice(0, 8)}` : ''}
                  </Text>
                </View>
                <StatusBadge status={invoice.status} type="invoice" />
              </View>

              <Text style={[styles.queueAmounts, { color: colors.textPrimary }]}>Due {formatCurrency(invoice.amountDue)} • Total {formatCurrency(invoice.total)}</Text>

              <View style={styles.queueActions}>
                <Button
                  title="Mark Paid"
                  onPress={() => void handleMarkPaid(invoice.id)}
                  loading={updatingInvoiceId === invoice.id}
                  disabled={invoice.status === 'PAID' || invoice.status === 'CANCELLED'}
                  style={styles.queueActionButton}
                />
                <Button
                  title="Open PDF"
                  variant="secondary"
                  onPress={() => void Linking.openURL(`${API_URL}/api/invoices/${invoice.id}/pdf`)}
                  style={styles.queueActionButton}
                />
              </View>
            </View>
          ))
        )}
      </Card>

      <Card style={styles.sectionCard}>
        <Text style={[styles.sectionEyebrow, { color: colors.textSecondary }]}>Reporting Routes</Text>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Reporting</Text>
        <Text style={[styles.sectionText, { color: colors.textSecondary }]}>Jump into aging and financial reports when invoice triage is done.</Text>
        <View style={styles.queueActions}>
          <Button title="Reports" variant="secondary" onPress={() => navigation.navigate('FinanceReports')} style={styles.queueActionButton} />
          <Button title="Aging" variant="ghost" onPress={() => navigation.navigate('AgingReport')} style={styles.queueActionButton} />
        </View>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  content: {
    padding: Spacing.base,
    paddingBottom: Spacing['4xl'],
  },
  sectionCard: {
    marginBottom: Spacing.base,
  },
  sectionEyebrow: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: Spacing.xs,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    marginBottom: Spacing.sm,
  },
  sectionText: {
    fontSize: Typography.fontSize.sm,
    lineHeight: 20,
    marginBottom: Spacing.base,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  actionTile: {
    width: '48%',
    borderWidth: 1,
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    minHeight: 176,
  },
  actionBadge: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  actionTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    marginBottom: Spacing.xs,
  },
  actionDescription: {
    fontSize: Typography.fontSize.sm,
    lineHeight: 20,
    flex: 1,
  },
  actionFooter: {
    marginTop: Spacing.base,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(107, 114, 128, 0.18)',
  },
  actionFooterText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  queueRow: {
    borderBottomWidth: 1,
    paddingVertical: Spacing.sm,
  },
  queueRowLast: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  queueRowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  queueTextWrap: {
    flex: 1,
  },
  queueTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    marginBottom: Spacing.xs,
  },
  queueMeta: {
    fontSize: Typography.fontSize.xs,
    lineHeight: 18,
  },
  queueAmounts: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    marginBottom: Spacing.sm,
  },
  queueActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  queueActionButton: {
    flex: 1,
  },
});

export default FinanceScreen;
