import React from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../hooks/useAuth';
import { useShipments } from '../../hooks/useShipments';
import { Card } from '../../components/ui/Card';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ErrorState } from '../../components/shared/ErrorState';
import { EmptyState } from '../../components/shared/EmptyState';
import { AppIcon } from '../../components/shared/AppIcon';
import { AppTopBar } from '../../components/shared/AppTopBar';
import { ShipmentCard } from '../../components/shared/ShipmentCard';
import { useAppTheme } from '../../hooks/useAppTheme';
import { Typography } from '../../constants/typography';
import { Spacing } from '../../constants/spacing';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CustomerStackParamList } from '../../navigation/CustomerNavigator';

type NavigationProp = NativeStackNavigationProp<CustomerStackParamList>;

const DashboardScreen: React.FC = () => {
  const { colors } = useAppTheme();
  const { user } = useAuth();
  const navigation = useNavigation<NavigationProp>();
  
  const { data: shipmentsData, isLoading, error, refetch, isRefetching } = useShipments(
    { status: ['ON_HAND', 'IN_TRANSIT', 'IN_TRANSIT_TO_DESTINATION', 'AT_PORT'] },
    { pageSize: 5 }
  );

  const openTab = (screen: 'Shipments' | 'Tracking' | 'Invoices') => {
    navigation.navigate('Home', { screen });
  };

  if (isLoading) {
    return <LoadingSpinner fullScreen />;
  }

  if (error) {
    return <ErrorState message={(error as any).message} onRetry={refetch} />;
  }

  const shipments = shipmentsData?.data || [];
  const activeCount = shipmentsData?.total || 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.accent} />
        }
      >
        <AppTopBar section="Dashboard" detail="Your shipments, invoices, and next actions" />

        <View style={styles.header}>
          <View>
            <Text style={[styles.greeting, { color: colors.textSecondary }]}>Welcome back,</Text>
            <Text style={[styles.name, { color: colors.textPrimary }]}>{user?.name}</Text>
          </View>
        </View>

        <Card style={styles.statsCard}>
          <Text style={[styles.statsLabel, { color: colors.textSecondary }]}>Active Shipments</Text>
          <Text style={[styles.statsValue, { color: colors.accent }]}>{activeCount}</Text>
        </Card>

        <View style={styles.quickActions}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.panel, borderColor: colors.border }]}
            onPress={() => openTab('Tracking')}
          >
            <AppIcon name="tracking" size={28} color={colors.accent} />
            <Text style={[styles.actionLabel, { color: colors.textPrimary }]}>Track</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.panel, borderColor: colors.border }]}
            onPress={() => openTab('Invoices')}
          >
            <AppIcon name="invoices" size={28} color={colors.accent} />
            <Text style={[styles.actionLabel, { color: colors.textPrimary }]}>Invoices</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.panel, borderColor: colors.border }]}
            onPress={() => navigation.navigate('Containers')}
          >
            <AppIcon name="containers" size={28} color={colors.accent} />
            <Text style={[styles.actionLabel, { color: colors.textPrimary }]}>Containers</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.panel, borderColor: colors.border }]}
            onPress={() => navigation.navigate('Documents')}
          >
            <AppIcon name="documents" size={28} color={colors.accent} />
            <Text style={[styles.actionLabel, { color: colors.textPrimary }]}>Documents</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Recent Shipments</Text>
            <TouchableOpacity onPress={() => openTab('Shipments')}>
              <Text style={[styles.sectionLink, { color: colors.accent }]}>View All</Text>
            </TouchableOpacity>
          </View>

          {shipments.length === 0 ? (
            <EmptyState
              icon="shipments"
              title="No Active Shipments"
              description="Your active shipments will appear here"
            />
          ) : (
            shipments.map((shipment) => (
              <ShipmentCard
                key={shipment.id}
                shipment={shipment}
                onPress={() => navigation.navigate('ShipmentDetail', { id: shipment.id })}
              />
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.base,
  },
  header: {
    marginBottom: Spacing.xl,
  },
  greeting: {
    fontSize: Typography.fontSize.base,
    marginBottom: Spacing.xs,
  },
  name: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold,
  },
  statsCard: {
    marginBottom: Spacing.base,
    alignItems: 'center',
    padding: Spacing.xl,
  },
  statsLabel: {
    fontSize: Typography.fontSize.base,
    marginBottom: Spacing.sm,
  },
  statsValue: {
    fontSize: Typography.fontSize['5xl'],
    fontWeight: Typography.fontWeight.bold,
  },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  actionButton: {
    width: '48%',
    alignItems: 'center',
    padding: Spacing.base,
    borderRadius: 16,
    borderWidth: 1,
  },
  actionIcon: {
    marginBottom: Spacing.sm,
  },
  actionLabel: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.base,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
  },
  sectionLink: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
  },
});

export default DashboardScreen;
