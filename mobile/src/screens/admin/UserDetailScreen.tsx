import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { usersApi } from '../../api/users';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ErrorState } from '../../components/shared/ErrorState';
import { ModuleSummaryHeader } from '../../components/shared/ModuleSummaryHeader';
import { useAppTheme } from '../../hooks/useAppTheme';
import { Typography } from '../../constants/typography';
import { BorderRadius, Spacing } from '../../constants/spacing';
import { AdminStackParamList } from '../../navigation/AdminNavigator';

type RouteProps = RouteProp<AdminStackParamList, 'UserDetail'>;

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);

const formatDate = (value?: string | null) => {
  if (!value) {
    return 'Not set';
  }

  return new Date(value).toLocaleDateString();
};

const titleCase = (value: string | null | undefined) => {
  if (!value) {
    return 'Not set';
  }

  return value
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/(^|\s)\w/g, (match) => match.toUpperCase());
};

const buildShipmentLabel = (shipment: { vehicleYear: number | null; vehicleMake: string | null; vehicleModel: string | null; vehicleVIN: string | null }) => {
  const label = [shipment.vehicleYear, shipment.vehicleMake, shipment.vehicleModel].filter(Boolean).join(' ').trim();
  return label || shipment.vehicleVIN || 'Shipment';
};

const UserDetailScreen: React.FC = () => {
  const route = useRoute<RouteProps>();
  const navigation = useNavigation<any>();
  const { colors } = useAppTheme();

  const { data: user, isLoading, error, refetch } = useQuery({
    queryKey: ['admin-user', route.params.id],
    queryFn: () => usersApi.getUser(route.params.id),
  });

  if (isLoading) return <LoadingSpinner fullScreen />;
  if (error) return <ErrorState message={(error as any).message} onRetry={refetch} />;
  if (!user) return <ErrorState message="User not found" />;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <ModuleSummaryHeader
          eyebrow="ADMIN / USERS"
          title={user.name || 'Internal User'}
          subtitle={user.email}
          showBack
          stats={[
            { label: 'Role', value: titleCase(user.role) },
            { label: 'Shipments', value: String(user.shipments.length) },
            {
              label: 'Balance',
              value: user.statement ? formatCurrency(user.statement.summary.accountBalance) : 'N/A',
            },
          ]}
        />

        <View style={styles.actionRow}>
          <Button title="Edit User" onPress={() => navigation.navigate('UserEdit', { id: user.id })} style={styles.actionButton} />
          <Button title="Users List" variant="secondary" onPress={() => navigation.navigate('Users')} style={styles.actionButton} />
        </View>

        <Card style={styles.sectionCard}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Contact</Text>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Phone</Text>
            <Text style={[styles.detailValue, { color: colors.textPrimary }]}>{user.phone || 'Not set'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Address</Text>
            <Text style={[styles.detailValue, { color: colors.textPrimary }]}>{user.address || 'Not set'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>City / Country</Text>
            <Text style={[styles.detailValue, { color: colors.textPrimary }]}>
              {[user.city, user.country].filter(Boolean).join(', ') || 'Not set'}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Created</Text>
            <Text style={[styles.detailValue, { color: colors.textPrimary }]}>{formatDate(user.createdAt)}</Text>
          </View>
          <View style={[styles.detailRow, styles.detailRowLast]}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Login Code</Text>
            <Text style={[styles.detailValue, { color: colors.textPrimary }]}>{user.loginCode || 'Not issued'}</Text>
          </View>
        </Card>

        {user.statement ? (
          <Card style={styles.sectionCard}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Collections & Billing</Text>
            <View style={styles.metricsRow}>
              <View style={StyleSheet.flatten([styles.metricCard, { backgroundColor: colors.background, borderColor: colors.border }])}>
                <Text style={[styles.metricValue, { color: colors.textPrimary }]}>{user.statement.summary.openInvoiceCount}</Text>
                <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Open Invoices</Text>
              </View>
              <View style={StyleSheet.flatten([styles.metricCard, { backgroundColor: colors.background, borderColor: colors.border }])}>
                <Text style={[styles.metricValue, { color: colors.textPrimary }]}>{formatCurrency(user.statement.summary.overdueAmount)}</Text>
                <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Overdue</Text>
              </View>
            </View>
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Collection Status</Text>
              <Text style={[styles.detailValue, { color: colors.textPrimary }]}>{titleCase(user.statement.collections.status)}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Promise To Pay</Text>
              <Text style={[styles.detailValue, { color: colors.textPrimary }]}>{formatDate(user.statement.collections.promiseToPayDate)}</Text>
            </View>
            <View style={[styles.detailRow, styles.detailRowLast]}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Follow Up</Text>
              <Text style={[styles.detailValue, { color: colors.textPrimary }]}>{formatDate(user.statement.collections.followUpDate)}</Text>
            </View>
          </Card>
        ) : null}

        <Card>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Recent Shipments</Text>
          {user.shipments.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No shipment history linked to this user.</Text>
          ) : (
            user.shipments.slice(0, 6).map((shipment, index) => (
              <View
                key={shipment.id}
                style={StyleSheet.flatten([
                  styles.shipmentRow,
                  index === user.shipments.slice(0, 6).length - 1 ? styles.detailRowLast : null,
                  { borderBottomColor: colors.border },
                ])}
              >
                <View style={styles.shipmentInfo}>
                  <Text style={[styles.shipmentTitle, { color: colors.textPrimary }]}>{buildShipmentLabel(shipment)}</Text>
                  <Text style={[styles.shipmentMeta, { color: colors.textSecondary }]}>Created {formatDate(shipment.createdAt)}</Text>
                </View>
                <View style={StyleSheet.flatten([styles.statusPill, { backgroundColor: `${colors.accent}18`, borderColor: `${colors.accent}32` }])}>
                  <Text style={[styles.statusPillText, { color: colors.accent }]}>{titleCase(shipment.status)}</Text>
                </View>
              </View>
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

export default UserDetailScreen;