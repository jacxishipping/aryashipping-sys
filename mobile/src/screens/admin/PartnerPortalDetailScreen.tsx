import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { partnerPortalsApi } from '../../api/partnerPortals';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { ErrorState } from '../../components/shared/ErrorState';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ModuleSummaryHeader } from '../../components/shared/ModuleSummaryHeader';
import { useAppTheme } from '../../hooks/useAppTheme';
import { Typography } from '../../constants/typography';
import { BorderRadius, Spacing } from '../../constants/spacing';
import { AdminStackParamList } from '../../navigation/AdminNavigator';

type DetailRoute = RouteProp<AdminStackParamList, 'PartnerPortalDetail'>;

const formatDate = (value?: string | null) => {
  if (!value) {
    return 'Not set';
  }

  return new Date(value).toLocaleDateString();
};

const PartnerPortalDetailScreen: React.FC = () => {
  const route = useRoute<DetailRoute>();
  const navigation = useNavigation<any>();
  const { colors } = useAppTheme();

  const portalQuery = useQuery({
    queryKey: ['partner-portal', route.params.id],
    queryFn: () => partnerPortalsApi.getPortal(route.params.id),
  });

  const activityQuery = useQuery({
    queryKey: ['partner-portal', route.params.id, 'activity-preview'],
    queryFn: () => partnerPortalsApi.getActivity(route.params.id, { limit: 5 }),
  });

  const refetchAll = () => {
    void portalQuery.refetch();
    void activityQuery.refetch();
  };

  if (portalQuery.isLoading) return <LoadingSpinner fullScreen />;
  if (portalQuery.error) return <ErrorState message={(portalQuery.error as any).message} onRetry={refetchAll} />;
  if (!portalQuery.data) return <ErrorState message="Partner portal not found" />;

  const portal = portalQuery.data;
  const activities = activityQuery.data?.activities || [];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <ModuleSummaryHeader
          eyebrow="ADMIN / PARTNER PORTALS"
          title={portal.name}
          subtitle={portal.companyLabel || 'Partner workspace settings and recent access activity.'}
          showBack
          stats={[
            { label: 'Code', value: portal.code || 'None' },
            { label: 'Domain', value: portal.customDomain ? 'Linked' : 'Default' },
            { label: 'Status', value: portal.isActive ? 'Active' : 'Paused' },
          ]}
        />

        <View style={styles.actionRow}>
          <Button title="Edit Portal" onPress={() => navigation.navigate('PartnerPortalEdit', { id: portal.id })} style={styles.actionButton} />
          <Button
            title="View Full Activity"
            variant="secondary"
            onPress={() => navigation.navigate('PartnerPortalActivity', { portalId: portal.id, portalName: portal.name })}
            style={styles.actionButton}
          />
        </View>

        <Card style={styles.sectionCard}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Portal Settings</Text>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Custom Domain</Text>
            <Text style={[styles.detailValue, { color: colors.textPrimary }]}>{portal.customDomain || 'Not configured'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Accent Color</Text>
            <View style={styles.colorRow}>
              <View style={StyleSheet.flatten([styles.colorSwatch, { backgroundColor: portal.accentColor || colors.border }])} />
              <Text style={[styles.detailValue, { color: colors.textPrimary }]}>{portal.accentColor || 'Default theme'}</Text>
            </View>
          </View>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Created</Text>
            <Text style={[styles.detailValue, { color: colors.textPrimary }]}>{formatDate(portal.createdAt)}</Text>
          </View>
          <View style={[styles.detailRow, styles.detailRowLast]}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Default Notes</Text>
            <Text style={[styles.detailValue, { color: colors.textPrimary }]}>{portal.defaultShipmentNotes || 'No default notes configured'}</Text>
          </View>
        </Card>

        <Card style={styles.sectionCard}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Workflow Rules</Text>
          <View style={styles.ruleRow}>
            <View style={StyleSheet.flatten([styles.ruleBadge, { backgroundColor: `${colors.accent}16`, borderColor: `${colors.accent}32` }])}>
              <Text style={[styles.ruleBadgeText, { color: colors.accent }]}>Notify on Shipment Assigned</Text>
            </View>
            <Text style={[styles.ruleValue, { color: colors.textPrimary }]}>{portal.notifyOnShipmentAssigned ? 'Enabled' : 'Disabled'}</Text>
          </View>
          <View style={styles.ruleRow}>
            <View style={StyleSheet.flatten([styles.ruleBadge, { backgroundColor: `${colors.accent}16`, borderColor: `${colors.accent}32` }])}>
              <Text style={[styles.ruleBadgeText, { color: colors.accent }]}>Auto-Assign Single Customer</Text>
            </View>
            <Text style={[styles.ruleValue, { color: colors.textPrimary }]}>{portal.autoAssignToSingleCustomer ? 'Enabled' : 'Disabled'}</Text>
          </View>
          <View style={StyleSheet.flatten([styles.ruleRow, styles.detailRowLast])}>
            <View style={StyleSheet.flatten([styles.ruleBadge, { backgroundColor: `${colors.accent}16`, borderColor: `${colors.accent}32` }])}>
              <Text style={[styles.ruleBadgeText, { color: colors.accent }]}>Require Customer Link For Ready</Text>
            </View>
            <Text style={[styles.ruleValue, { color: colors.textPrimary }]}>{portal.requireCustomerLinkForReady ? 'Enabled' : 'Disabled'}</Text>
          </View>
        </Card>

        <Card>
          <View style={styles.activityHeader}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Recent Activity</Text>
            <Button title="Refresh" variant="secondary" size="sm" onPress={refetchAll} />
          </View>
          {activityQuery.isError ? (
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Unable to load portal activity preview.</Text>
          ) : activities.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No recent portal activity.</Text>
          ) : (
            activities.map((activity, index) => (
              <View
                key={activity.id}
                style={StyleSheet.flatten([
                  styles.activityRow,
                  index === activities.length - 1 ? styles.detailRowLast : null,
                  { borderBottomColor: colors.border },
                ])}
              >
                <Text style={[styles.activitySummary, { color: colors.textPrimary }]}>{activity.summary}</Text>
                <Text style={[styles.activityMeta, { color: colors.textSecondary }]}>
                  {new Date(activity.performedAt).toLocaleString()} • {activity.actor.name || activity.actor.email || 'System'}
                </Text>
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
  colorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  colorSwatch: {
    width: 18,
    height: 18,
    borderRadius: BorderRadius.full,
  },
  ruleRow: {
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'transparent',
  },
  ruleBadge: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: BorderRadius.full,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  ruleBadgeText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
  },
  ruleValue: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.medium,
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  emptyText: {
    fontSize: Typography.fontSize.base,
    lineHeight: 22,
  },
  activityRow: {
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  activitySummary: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    marginBottom: Spacing.xs,
  },
  activityMeta: {
    fontSize: Typography.fontSize.sm,
  },
});

export default PartnerPortalDetailScreen;