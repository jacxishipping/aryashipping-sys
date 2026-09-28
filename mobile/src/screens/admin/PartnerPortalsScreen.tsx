import React from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { partnerPortalsApi } from '../../api/partnerPortals';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/shared/EmptyState';
import { ErrorState } from '../../components/shared/ErrorState';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ModuleSummaryHeader } from '../../components/shared/ModuleSummaryHeader';
import { useAppTheme } from '../../hooks/useAppTheme';
import { Typography } from '../../constants/typography';
import { BorderRadius, Spacing } from '../../constants/spacing';
import { AdminStackParamList } from '../../navigation/AdminNavigator';
import { PartnerPortalSummary } from '../../types/admin';

type NavigationProp = NativeStackNavigationProp<AdminStackParamList>;

const PartnerPortalsScreen: React.FC = () => {
  const { colors } = useAppTheme();
  const navigation = useNavigation<NavigationProp>();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['partner-portals'],
    queryFn: () => partnerPortalsApi.getPortals(),
  });

  if (isLoading) return <LoadingSpinner fullScreen />;
  if (error) return <ErrorState message={(error as any).message} onRetry={refetch} />;

  const portals = data?.portals || [];
  const totalCustomers = portals.reduce((sum, portal) => sum + (portal._count?.customers || 0), 0);
  const totalAssignments = portals.reduce((sum, portal) => sum + (portal._count?.shipmentAssignments || 0), 0);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <FlatList
        data={portals}
        keyExtractor={(item) => item.id}
        renderItem={({ item }: { item: PartnerPortalSummary }) => (
          <Card style={styles.card} pressable onPress={() => navigation.navigate('PartnerPortalDetail', { id: item.id })}>
            <View style={styles.cardHeader}>
              <View style={styles.cardInfo}>
                <Text style={[styles.name, { color: colors.textPrimary }]}>{item.name}</Text>
                <Text style={[styles.code, { color: colors.textSecondary }]}>{item.code || 'No code'} • {item.companyLabel || 'No company label'}</Text>
              </View>
              <View style={StyleSheet.flatten([styles.statePill, { backgroundColor: `${colors.accent}16`, borderColor: `${colors.accent}32` }])}>
                <Text style={[styles.statePillText, { color: colors.accent }]}>{item.isActive ? 'Active' : 'Paused'}</Text>
              </View>
            </View>
            <View style={styles.metricsGrid}>
              <View style={[styles.metricChip, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}> 
                <Text style={[styles.metaLabel, { color: colors.textSecondary }]}>Members</Text>
                <Text style={[styles.metaValue, { color: colors.textPrimary }]}>{item._count?.memberships || 0}</Text>
              </View>
              <View style={[styles.metricChip, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}> 
                <Text style={[styles.metaLabel, { color: colors.textSecondary }]}>Customers</Text>
                <Text style={[styles.metaValue, { color: colors.textPrimary }]}>{item._count?.customers || 0}</Text>
              </View>
              <View style={[styles.metricChip, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}> 
                <Text style={[styles.metaLabel, { color: colors.textSecondary }]}>Shipments</Text>
                <Text style={[styles.metaValue, { color: colors.textPrimary }]}>{item._count?.shipmentAssignments || 0}</Text>
              </View>
            </View>
          </Card>
        )}
        ListHeaderComponent={
          <View style={styles.headerWrap}>
            <ModuleSummaryHeader
              eyebrow="ADMIN / PARTNER PORTALS"
              title="Partner Portals"
              subtitle="Real mobile list parity for partner workspaces, with direct access to portal settings and activity detail."
              showBack
              stats={[
                { label: 'Portals', value: String(portals.length) },
                { label: 'Customers', value: String(totalCustomers) },
                { label: 'Assignments', value: String(totalAssignments) },
              ]}
            />
            <Button title="Create Portal" onPress={() => navigation.navigate('PartnerPortalCreate')} fullWidth />
          </View>
        }
        contentContainerStyle={styles.list}
        ListEmptyComponent={<EmptyState icon="workspace" title="No Partner Portals" description="Create the first portal to begin partner workspace handoffs." />}
        onRefresh={refetch}
        refreshing={isLoading}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: Spacing.base, paddingBottom: Spacing['4xl'] },
  headerWrap: { marginBottom: Spacing.base },
  card: { marginBottom: Spacing.sm },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  cardInfo: { flex: 1 },
  name: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    marginBottom: Spacing.xs,
  },
  code: {
    fontSize: Typography.fontSize.sm,
  },
  statePill: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  statePillText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  metricChip: {
    width: '48%',
    borderWidth: 1,
    borderRadius: BorderRadius.xl,
    padding: Spacing.sm,
  },
  metaLabel: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: Spacing.xs,
  },
  metaValue: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
  },
});

export default PartnerPortalsScreen;