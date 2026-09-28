import React from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../hooks/useAuth';
import { useShipments } from '../../hooks/useShipments';
import { DashboardKPI } from '../../components/admin/DashboardKPI';
import { ShipmentRow } from '../../components/admin/ShipmentRow';
import { StatsChart } from '../../components/admin/StatsChart';
import { AppIcon } from '../../components/shared/AppIcon';
import { AppTopBar } from '../../components/shared/AppTopBar';
import { SectionHeader } from '../../components/shared/SectionHeader';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ErrorState } from '../../components/shared/ErrorState';
import { ShipmentStatusColors } from '../../constants/colors';
import { useAppTheme } from '../../hooks/useAppTheme';
import { Typography } from '../../constants/typography';
import { Spacing } from '../../constants/spacing';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AdminStackParamList } from '../../navigation/AdminNavigator';

type NavigationProp = NativeStackNavigationProp<AdminStackParamList>;

const DashboardScreen: React.FC = () => {
  const { colors } = useAppTheme();
  const { user } = useAuth();
  const navigation = useNavigation<NavigationProp>();
  
  const { data: shipmentsData, isLoading, error, refetch, isRefetching } = useShipments({}, { pageSize: 10 });

  const openTab = (screen: 'Shipments') => {
    navigation.navigate('Home', { screen });
  };

  if (isLoading) return <LoadingSpinner fullScreen />;
  if (error) return <ErrorState message={(error as any).message} onRetry={refetch} />;

  const shipments = shipmentsData?.data || [];
  const activeShipments = shipments.filter(s =>
    !['DELIVERED', 'CANCELLED'].includes(s.status)
  ).length;
  const inTransit = shipments.filter(s => s.status.includes('TRANSIT')).length;
  const atPort = shipments.filter(s => s.status === 'AT_PORT').length;
  const delivered = shipments.filter(s => s.status === 'DELIVERED').length;

  const statusDistribution = [
    { label: 'On Hand',    value: shipments.filter(s => s.status === 'ON_HAND').length, color: ShipmentStatusColors.ON_HAND },
    { label: 'In Transit', value: inTransit, color: ShipmentStatusColors.IN_TRANSIT },
    { label: 'At Port',    value: atPort,    color: ShipmentStatusColors.AT_PORT },
    { label: 'Delivered',  value: delivered, color: ShipmentStatusColors.DELIVERED },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.accent} />
        }
      >
        <AppTopBar section="Dashboard" detail={`Welcome back, ${user?.name ?? 'Admin'}`} />

        {/* Page header – mirrors web PageHeader */}
        <SectionHeader
          title="Operations Overview"
          description="Shipment volume, KPIs, and quick actions"
          meta={[
            { label: 'Active', value: activeShipments },
            { label: 'Total',  value: shipmentsData?.total ?? 0 },
          ]}
        />

        {/* KPI Grid – mirrors web DashboardKpiGrid (4 StatsCards) */}
        <View style={styles.kpiRow}>
          <DashboardKPI
            title="Active Shipments"
            value={activeShipments}
            icon="shipments"
            subtitle="On hand or moving"
            variant="default"
          />
          <DashboardKPI
            title="In Transit"
            value={inTransit}
            icon="transits"
            variant="info"
          />
        </View>
        <View style={styles.kpiRow}>
          <DashboardKPI
            title="At Port"
            value={atPort}
            icon="port"
            variant="warning"
          />
          <DashboardKPI
            title="Delivered"
            value={delivered}
            icon="delivered"
            variant="success"
          />
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.accent }]}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('ShipmentCreate')}
          >
            <AppIcon name="add" size={20} color={colors.accentContrast} />
            <Text style={[styles.actionText, { color: colors.accentContrast }]}>New Shipment</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border }]}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('Containers')}
          >
            <AppIcon name="containers" size={20} color={colors.textPrimary} />
            <Text style={[styles.actionText, { color: colors.textPrimary }]}>Containers</Text>
          </TouchableOpacity>
        </View>

        {/* Status Chart */}
        <StatsChart title="Status Distribution" data={statusDistribution} />

        {/* Recent Shipments */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Recent Shipments</Text>
          {shipments.slice(0, 5).map((shipment) => (
            <ShipmentRow
              key={shipment.id}
              shipment={shipment}
              onPress={() => navigation.navigate('ShipmentDetail', { id: shipment.id })}
            />
          ))}
          <TouchableOpacity onPress={() => openTab('Shipments')}>
            <View style={styles.viewAllWrap}>
              <Text style={[styles.viewAll, { color: colors.accent }]}>View All</Text>
              <AppIcon name="forward" size={16} color={colors.accent} />
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.base, paddingBottom: Spacing['4xl'] },
  kpiRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm },
  quickActions: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.xl },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.base,
    borderRadius: 16,
  },
  actionText: { fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.semibold, marginLeft: Spacing.sm },
  section: { marginTop: Spacing.base },
  sectionTitle: { fontSize: Typography.fontSize.lg, fontWeight: Typography.fontWeight.bold, marginBottom: Spacing.base },
  viewAllWrap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs, marginTop: Spacing.base },
  viewAll: { fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.medium, textAlign: 'center' },
});

export default DashboardScreen;
