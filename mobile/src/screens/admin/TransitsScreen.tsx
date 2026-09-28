import React from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { transitsApi } from '../../api/transits';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/shared/EmptyState';
import { ErrorState } from '../../components/shared/ErrorState';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ModuleSummaryHeader } from '../../components/shared/ModuleSummaryHeader';
import { useAppTheme } from '../../hooks/useAppTheme';
import { Typography } from '../../constants/typography';
import { BorderRadius, Spacing } from '../../constants/spacing';
import { AdminStackParamList } from '../../navigation/AdminNavigator';
import { TransitSummary } from '../../types/admin';

type NavigationProp = NativeStackNavigationProp<AdminStackParamList>;

const titleCase = (value: string) =>
  value.replace(/_/g, ' ').toLowerCase().replace(/(^|\s)\w/g, (match) => match.toUpperCase());

const TransitsScreen: React.FC = () => {
  const { colors } = useAppTheme();
  const navigation = useNavigation<NavigationProp>();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['transits'],
    queryFn: () => transitsApi.getTransits(),
  });

  if (isLoading) return <LoadingSpinner fullScreen />;
  if (error) return <ErrorState message={(error as any).message} onRetry={refetch} />;

  const transits = data?.transits || [];
  const activeCount = transits.filter((transit) => !['DELIVERED', 'CANCELLED'].includes(transit.status)).length;
  const totalShipments = transits.reduce((sum, transit) => sum + transit._count.shipments, 0);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <FlatList
        data={transits}
        keyExtractor={(item) => item.id}
        renderItem={({ item }: { item: TransitSummary }) => (
          <Card style={styles.card} pressable onPress={() => navigation.navigate('TransitDetail', { id: item.id })}>
            <View style={styles.cardHeader}>
              <View style={styles.cardInfo}>
                <Text style={[styles.reference, { color: colors.textPrimary }]}>{item.referenceNumber}</Text>
                <Text style={[styles.route, { color: colors.textSecondary }]}>{item.origin} to {item.destination}</Text>
              </View>
              <View style={StyleSheet.flatten([styles.statusPill, { backgroundColor: `${colors.accent}16`, borderColor: `${colors.accent}32` }])}>
                <Text style={[styles.statusPillText, { color: colors.accent }]}>{titleCase(item.status)}</Text>
              </View>
            </View>
            <Text style={[styles.meta, { color: colors.textSecondary }]}>Current company: {item.currentCompany?.name || 'No active company'}</Text>
            <View style={styles.metricsGrid}>
              <View style={[styles.metricChip, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}> 
                <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Shipments</Text>
                <Text style={[styles.metricValue, { color: colors.textPrimary }]}>{item._count.shipments}</Text>
              </View>
              <View style={[styles.metricChip, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}> 
                <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Events</Text>
                <Text style={[styles.metricValue, { color: colors.textPrimary }]}>{item._count.events}</Text>
              </View>
              <View style={[styles.metricChip, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}> 
                <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Expenses</Text>
                <Text style={[styles.metricValue, { color: colors.textPrimary }]}>{item._count.expenses}</Text>
              </View>
            </View>
          </Card>
        )}
        ListHeaderComponent={
          <ModuleSummaryHeader
            eyebrow="OPERATIONS / TRANSITS"
            title="Transits"
            subtitle="Real mobile list parity for transit routing, movement coordination, and detail drill-down."
            showBack
            stats={[
              { label: 'Total Transits', value: String(transits.length) },
              { label: 'Active', value: String(activeCount) },
              { label: 'Linked Shipments', value: String(totalShipments) },
            ]}
          />
        }
        contentContainerStyle={styles.list}
        ListEmptyComponent={<EmptyState icon="transits" title="No Transits" description="No transit workflows have been created yet." />}
        onRefresh={refetch}
        refreshing={isLoading}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: Spacing.base, paddingBottom: Spacing['4xl'] },
  card: { marginBottom: Spacing.sm },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  cardInfo: { flex: 1 },
  reference: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    marginBottom: Spacing.xs,
  },
  route: {
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
    fontWeight: Typography.fontWeight.semibold,
  },
  meta: {
    fontSize: Typography.fontSize.sm,
    marginBottom: Spacing.xs,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  metricChip: {
    width: '48%',
    borderWidth: 1,
    borderRadius: BorderRadius.xl,
    padding: Spacing.sm,
  },
  metricLabel: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: Spacing.xs,
  },
  metricValue: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
  },
});

export default TransitsScreen;