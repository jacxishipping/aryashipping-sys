import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { customersApi } from '../../api/customers';
import { ErrorState } from '../../components/shared/ErrorState';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ModuleSummaryHeader } from '../../components/shared/ModuleSummaryHeader';
import { useAppTheme } from '../../hooks/useAppTheme';
import { Typography } from '../../constants/typography';
import { BorderRadius, Spacing } from '../../constants/spacing';
import { AdminStackParamList } from '../../navigation/AdminNavigator';

type RouteProps = RouteProp<AdminStackParamList, 'CustomerDetail'>;

const formatCurrency = (amount?: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);

const formatDate = (value?: string | null) => {
  if (!value) {
    return 'Not set';
  }

  return new Date(value).toLocaleDateString();
};

const titleCase = (value?: string | null) => {
  if (!value) {
    return 'Not set';
  }

  return value
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/(^|\s)\w/g, (match) => match.toUpperCase());
};

type CustomerShipmentSummary = {
  vehicleYear?: number | null;
  vehicleMake?: string | null;
  vehicleModel?: string | null;
  vehicleVIN?: string | null;
};

const buildShipmentLabel = (shipment: CustomerShipmentSummary) => {
  const label = [shipment.vehicleYear, shipment.vehicleMake, shipment.vehicleModel].filter(Boolean).join(' ').trim();
  return label || shipment.vehicleVIN || 'Shipment';
};

const CustomerDetailScreen: React.FC = () => {
  const { colors } = useAppTheme();
  const route = useRoute<RouteProps>();
  const navigation = useNavigation<any>();
  
  const { data: customer, isLoading, error, refetch } = useQuery({
    queryKey: ['customer', route.params.id],
    queryFn: () => customersApi.getCustomer(route.params.id),
  });

  if (isLoading) return <LoadingSpinner fullScreen />;
  if (error) return <ErrorState message={(error as any).message} onRetry={refetch} />;
  if (!customer) return <ErrorState message="Customer not found" />;

  const addressLine = [customer.address?.street, customer.address?.city, customer.address?.country]
    .filter(Boolean)
    .join(', ');
  const recentShipments = customer.shipments?.slice(0, 6) || [];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <ModuleSummaryHeader
          eyebrow="ADMIN / CUSTOMERS"
          title={customer.name}
          subtitle={customer.email}
          showBack
          stats={[
            { label: 'Balance', value: formatCurrency(customer.balance) },
            { label: 'Open Invoices', value: String(customer.openInvoiceCount || 0) },
            { label: 'Active Shipments', value: String(customer.activeShipments) },
          ]}
        />

        <View style={styles.actionRow}>
          <Button title="Edit Customer" onPress={() => navigation.navigate('CustomerEdit', { id: customer.id })} style={styles.actionButton} />
          <Button title="Customers List" variant="secondary" onPress={() => navigation.navigate('Home', { screen: 'Customers' })} style={styles.actionButton} />
        </View>

        <Card style={styles.sectionCard}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Customer Profile</Text>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Phone</Text>
            <Text style={[styles.detailValue, { color: colors.textPrimary }]}>{customer.phone || 'Not set'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Address</Text>
            <Text style={[styles.detailValue, { color: colors.textPrimary }]}>{addressLine || 'Not set'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Login Code</Text>
            <Text style={[styles.detailValue, { color: colors.textPrimary }]}>{customer.loginCode || 'Not issued'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Created</Text>
            <Text style={[styles.detailValue, { color: colors.textPrimary }]}>{formatDate(customer.createdAt)}</Text>
          </View>
          <View style={[styles.detailRow, styles.detailRowLast]}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Updated</Text>
            <Text style={[styles.detailValue, { color: colors.textPrimary }]}>{formatDate(customer.updatedAt)}</Text>
          </View>
        </Card>

        <Card style={styles.sectionCard}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Shipping Activity</Text>
          <View style={styles.metricsRow}>
            <View style={StyleSheet.flatten([styles.metricCard, { backgroundColor: colors.background, borderColor: colors.border }])}>
              <Text style={[styles.metricValue, { color: colors.textPrimary }]}>{customer.totalShipments}</Text>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Total</Text>
            </View>
            <View style={StyleSheet.flatten([styles.metricCard, { backgroundColor: colors.background, borderColor: colors.border }])}>
              <Text style={[styles.metricValue, { color: colors.textPrimary }]}>{customer.activeShipments}</Text>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Active</Text>
            </View>
            <View style={StyleSheet.flatten([styles.metricCard, { backgroundColor: colors.background, borderColor: colors.border }])}>
              <Text style={[styles.metricValue, { color: colors.textPrimary }]}>{customer.deliveredShipments || 0}</Text>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Delivered</Text>
            </View>
          </View>
        </Card>

        <Card style={styles.sectionCard}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Collections & Billing</Text>
          <View style={styles.metricsRow}>
            <View style={StyleSheet.flatten([styles.metricCard, { backgroundColor: colors.background, borderColor: colors.border }])}>
              <Text style={[styles.metricValue, { color: customer.balance > 0 ? colors.error : colors.textPrimary }]}>{formatCurrency(customer.balance)}</Text>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Account Balance</Text>
            </View>
            <View style={StyleSheet.flatten([styles.metricCard, { backgroundColor: colors.background, borderColor: colors.border }])}>
              <Text style={[styles.metricValue, { color: colors.textPrimary }]}>{formatCurrency(customer.overdueAmount)}</Text>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Overdue</Text>
            </View>
            <View style={StyleSheet.flatten([styles.metricCard, { backgroundColor: colors.background, borderColor: colors.border }])}>
              <Text style={[styles.metricValue, { color: colors.textPrimary }]}>{formatCurrency(customer.availableCredit)}</Text>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Credit</Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Collection Status</Text>
            <Text style={[styles.detailValue, { color: colors.textPrimary }]}>{titleCase(customer.collectionStatus)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Open / Overdue Invoices</Text>
            <Text style={[styles.detailValue, { color: colors.textPrimary }]}>{`${customer.openInvoiceCount || 0} / ${customer.overdueInvoiceCount || 0}`}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Promise To Pay</Text>
            <Text style={[styles.detailValue, { color: colors.textPrimary }]}>{formatDate(customer.promiseToPayDate)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Follow Up</Text>
            <Text style={[styles.detailValue, { color: colors.textPrimary }]}>{formatDate(customer.followUpDate)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Paid Amount</Text>
            <Text style={[styles.detailValue, { color: colors.textPrimary }]}>{formatCurrency(customer.paidAmount)}</Text>
          </View>
          <View style={[styles.detailRow, styles.detailRowLast]}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Statement Generated</Text>
            <Text style={[styles.detailValue, { color: colors.textPrimary }]}>{formatDate(customer.statementGeneratedAt)}</Text>
          </View>
        </Card>

        {customer.notes ? (
          <Card style={styles.sectionCard}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Collection Notes</Text>
            <Text style={[styles.notesText, { color: colors.textSecondary }]}>{customer.notes}</Text>
          </Card>
        ) : null}

        <Card>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Recent Shipments</Text>
          {recentShipments.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No shipment history linked to this customer yet.</Text>
          ) : (
            recentShipments.map((shipment, index) => (
              <TouchableOpacity
                key={shipment.id}
                activeOpacity={0.85}
                onPress={() => navigation.navigate('ShipmentDetail', { id: shipment.id })}
                style={StyleSheet.flatten([
                  styles.shipmentRow,
                  index === recentShipments.length - 1 ? styles.detailRowLast : null,
                  { borderBottomColor: colors.border },
                ])}
              >
                <View style={styles.shipmentInfo}>
                  <Text style={[styles.shipmentTitle, { color: colors.textPrimary }]}>{buildShipmentLabel(shipment)}</Text>
                  <Text style={[styles.shipmentMeta, { color: colors.textSecondary }]}>
                    {titleCase(shipment.status)}{shipment.containerNumber ? ` • Container ${shipment.containerNumber}` : ''}
                  </Text>
                  <Text style={[styles.shipmentMeta, { color: colors.textSecondary }]}>Created {formatDate(shipment.createdAt)}</Text>
                </View>
                <View style={StyleSheet.flatten([styles.statusPill, { backgroundColor: `${colors.accent}18`, borderColor: `${colors.accent}32` }])}>
                  <Text style={[styles.statusPillText, { color: colors.accent }]}>{formatCurrency(shipment.price)}</Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </Card>
      </ScrollView>
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
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    marginBottom: Spacing.xs,
  },
  metricLabel: {
    fontSize: Typography.fontSize.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  notesText: {
    fontSize: Typography.fontSize.base,
    lineHeight: 22,
  },
  emptyText: {
    fontSize: Typography.fontSize.base,
    lineHeight: 22,
  },
  shipmentRow: {
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  shipmentInfo: {
    flex: 1,
  },
  shipmentTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    marginBottom: Spacing.xs,
  },
  shipmentMeta: {
    fontSize: Typography.fontSize.sm,
  },
  statusPill: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  statusPillText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
  },
});

export default CustomerDetailScreen;
