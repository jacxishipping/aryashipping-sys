import React from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { partnerPortalsApi } from '../../api/partnerPortals';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/shared/EmptyState';
import { ErrorState } from '../../components/shared/ErrorState';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ModuleSummaryHeader } from '../../components/shared/ModuleSummaryHeader';
import { useAppTheme } from '../../hooks/useAppTheme';
import { Typography } from '../../constants/typography';
import { Spacing } from '../../constants/spacing';
import { AdminStackParamList } from '../../navigation/AdminNavigator';
import { PortalActivityItem } from '../../types/admin';

type RouteProps = RouteProp<AdminStackParamList, 'PartnerPortalActivity'>;

const PartnerPortalActivityScreen: React.FC = () => {
  const route = useRoute<RouteProps>();
  const { colors } = useAppTheme();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['partner-portal-activity', route.params.portalId],
    queryFn: () => partnerPortalsApi.getActivity(route.params.portalId, { limit: 50 }),
  });

  if (isLoading) return <LoadingSpinner fullScreen />;
  if (error) return <ErrorState message={(error as any).message} onRetry={refetch} />;

  const activities = data?.activities || [];
  const portalName = data?.portal.name || route.params.portalName || 'Portal Activity';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <FlatList
        data={activities}
        keyExtractor={(item) => item.id}
        renderItem={({ item }: { item: PortalActivityItem }) => (
          <Card style={styles.card}>
            <Text style={[styles.summary, { color: colors.textPrimary }]}>{item.summary}</Text>
            <Text style={[styles.meta, { color: colors.textSecondary }]}>Action: {item.action}</Text>
            <Text style={[styles.meta, { color: colors.textSecondary }]}>Actor: {item.actor.name || item.actor.email || 'System'}</Text>
            <Text style={[styles.meta, { color: colors.textSecondary }]}>{new Date(item.performedAt).toLocaleString()}</Text>
          </Card>
        )}
        ListHeaderComponent={
          <ModuleSummaryHeader
            eyebrow="PARTNER PORTAL / ACTIVITY"
            title={portalName}
            subtitle="Membership, access-code, and partner workspace audit activity from the same backend feed used on web."
            showBack
            stats={[
              { label: 'Events', value: String(activities.length) },
              { label: 'Scope', value: 'Audit Trail' },
            ]}
          />
        }
        contentContainerStyle={styles.list}
        ListEmptyComponent={<EmptyState icon="notifications" title="No Activity" description="No audit activity matched this portal yet." />}
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
  summary: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    marginBottom: Spacing.sm,
  },
  meta: {
    fontSize: Typography.fontSize.sm,
    marginBottom: Spacing.xs,
  },
});

export default PartnerPortalActivityScreen;