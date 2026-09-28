import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '../../api/analytics';
import { AppTopBar } from '../../components/shared/AppTopBar';
import { SectionHeader } from '../../components/shared/SectionHeader';
import { Card } from '../../components/ui/Card';
import { ErrorState } from '../../components/shared/ErrorState';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { useAppTheme } from '../../hooks/useAppTheme';
import { Spacing } from '../../constants/spacing';
import { Typography } from '../../constants/typography';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);

const titleCase = (value: string) => value.replace(/_/g, ' ').toLowerCase().replace(/(^|\s)\w/g, (match) => match.toUpperCase());

const AnalyticsScreen: React.FC = () => {
  const { colors } = useAppTheme();
  const query = useQuery({
    queryKey: ['analytics-overview'],
    queryFn: () => analyticsApi.getOverview(),
  });

  if (query.isLoading) return <LoadingSpinner fullScreen />;
  if (query.error) return <ErrorState message={(query.error as any).message} onRetry={query.refetch} />;

  const analytics = query.data;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <AppTopBar section="Analytics" detail="Operations, revenue, and customer performance" showBack />

        <SectionHeader
          title="Analytics"
          description="Operations, revenue, and customer performance"
          meta={[
            { label: 'Shipments', value: analytics?.summary.totalShipments ?? 0 },
            { label: 'Overdue', value: analytics?.summary.overdueInvoices ?? 0, intent: 'warning' },
          ]}
        />

        <View style={styles.metricGrid}>
          <Card style={StyleSheet.flatten([styles.metricCard, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }])}><Text style={[styles.metricValue, { color: colors.textPrimary }]}>{analytics?.summary.totalShipments}</Text><Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Shipments</Text></Card>
          <Card style={StyleSheet.flatten([styles.metricCard, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }])}><Text style={[styles.metricValue, { color: colors.textPrimary }]}>{analytics?.summary.activeDispatches}</Text><Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Dispatches</Text></Card>
          <Card style={StyleSheet.flatten([styles.metricCard, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }])}><Text style={[styles.metricValue, { color: colors.textPrimary }]}>{formatCurrency(analytics?.summary.totalRevenue || 0)}</Text><Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Revenue</Text></Card>
          <Card style={StyleSheet.flatten([styles.metricCard, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }])}><Text style={[styles.metricValue, { color: colors.textPrimary }]}>{analytics?.summary.overdueInvoices}</Text><Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Overdue</Text></Card>
        </View>

        <Card style={styles.sectionCard}>
          <Text style={[styles.sectionEyebrow, { color: colors.textSecondary }]}>Ops Snapshot</Text>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Status Breakdown</Text>
          {analytics?.shipmentsByStatus.slice(0, 6).map((item, index) => (
            <View key={`${item.status}-${index}`} style={StyleSheet.flatten([styles.row, index === analytics.shipmentsByStatus.slice(0, 6).length - 1 ? styles.rowLast : null, { borderBottomColor: colors.border }])}>
              <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>{titleCase(item.status)}</Text>
              <Text style={[styles.rowMeta, { color: colors.textSecondary }]}>{item.count} shipments</Text>
            </View>
          ))}
        </Card>

        <Card style={styles.sectionCard}>
          <Text style={[styles.sectionEyebrow, { color: colors.textSecondary }]}>Revenue Leaders</Text>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Top Customers</Text>
          {analytics?.topCustomers.length === 0 ? (
            <Text style={[styles.rowMeta, { color: colors.textSecondary }]}>No customer analytics available.</Text>
          ) : (
            analytics?.topCustomers.map((customer, index) => (
              <View key={customer.userId} style={StyleSheet.flatten([styles.row, index === analytics.topCustomers.length - 1 ? styles.rowLast : null, { borderBottomColor: colors.border }])}>
                <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>{customer.name}</Text>
                <Text style={[styles.rowMeta, { color: colors.textSecondary }]}>{customer.shipmentCount} shipments • {formatCurrency(customer.revenue)}</Text>
              </View>
            ))
          )}
        </Card>

        <Card style={styles.sectionCard}>
          <Text style={[styles.sectionEyebrow, { color: colors.textSecondary }]}>Collections Signal</Text>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Outstanding Invoices</Text>
          {analytics?.outstandingInvoices.length === 0 ? (
            <Text style={[styles.rowMeta, { color: colors.textSecondary }]}>No overdue invoices in the current analytics snapshot.</Text>
          ) : (
            analytics?.outstandingInvoices.map((invoice, index) => (
              <View key={invoice.id} style={StyleSheet.flatten([styles.row, index === analytics.outstandingInvoices.length - 1 ? styles.rowLast : null, { borderBottomColor: colors.border }])}>
                <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>{invoice.invoiceNumber}</Text>
                <Text style={[styles.rowMeta, { color: colors.textSecondary }]}>{formatCurrency(invoice.totalUSD)} • {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : 'No due date'}</Text>
              </View>
            ))
          )}
          <Text style={[styles.updatedText, { color: colors.textSecondary }]}>Updated {analytics?.lastUpdated ? new Date(analytics.lastUpdated).toLocaleString() : 'just now'}</Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.base, paddingBottom: Spacing['4xl'] },
  sectionEyebrow: { fontSize: Typography.fontSize.xs, fontWeight: Typography.fontWeight.semibold, letterSpacing: 1, textTransform: 'uppercase', marginBottom: Spacing.xs },
  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.base },
  metricCard: { width: '48%', paddingVertical: Spacing.base, borderWidth: 1 },
  metricValue: { fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.semibold, textAlign: 'center' },
  metricLabel: { fontSize: Typography.fontSize.xs, textAlign: 'center', marginTop: Spacing.xs, textTransform: 'uppercase', letterSpacing: 0.8 },
  sectionCard: { marginBottom: Spacing.base },
  sectionTitle: { fontSize: Typography.fontSize.lg, fontWeight: Typography.fontWeight.semibold, marginBottom: Spacing.sm },
  row: { borderBottomWidth: 1, paddingVertical: Spacing.sm },
  rowLast: { borderBottomWidth: 0, paddingBottom: 0 },
  rowTitle: { fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.semibold, marginBottom: Spacing.xs },
  rowMeta: { fontSize: Typography.fontSize.xs, lineHeight: 18 },
  updatedText: { fontSize: Typography.fontSize.xs, marginTop: Spacing.sm },
});
export default AnalyticsScreen;
