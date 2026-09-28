import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { financeApi } from '../../api/finance';
import { usersApi } from '../../api/users';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { ErrorState } from '../../components/shared/ErrorState';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ModuleSummaryHeader } from '../../components/shared/ModuleSummaryHeader';
import { Input } from '../../components/ui/Input';
import { useAppTheme } from '../../hooks/useAppTheme';
import { Typography } from '../../constants/typography';
import { BorderRadius, Spacing } from '../../constants/spacing';
import { AdminUserSummary, DueAgingBucketKey } from '../../types/admin';
import { loadAgingReportFilters, saveAgingReportFilters } from '../../utils/financeFilterStorage';

const bucketOrder: DueAgingBucketKey[] = ['current', 'aging30', 'aging60', 'aging90'];

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);

const AgingReportScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { colors } = useAppTheme();
  const [selectedBucket, setSelectedBucket] = useState<DueAgingBucketKey>('current');
  const [userSearch, setUserSearch] = useState('');
  const [filterUserId, setFilterUserId] = useState<string | null>(null);
  const [filtersHydrated, setFiltersHydrated] = useState(false);

  const usersQuery = useQuery({
    queryKey: ['admin-users', 'aging-report-filters', userSearch || 'all'],
    queryFn: () => usersApi.getUsers({ roleType: 'users', query: userSearch || undefined }, { pageSize: 12 }),
  });

  useEffect(() => {
    let active = true;

    void (async () => {
      const persisted = await loadAgingReportFilters();
      if (!active) {
        return;
      }

      setSelectedBucket(persisted.selectedBucket);
      setUserSearch(persisted.userSearch);
      setFilterUserId(persisted.filterUserId);
      setFiltersHydrated(true);
    })();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!filtersHydrated) {
      return;
    }

    void saveAgingReportFilters({
      selectedBucket,
      userSearch,
      filterUserId,
    });
  }, [filterUserId, filtersHydrated, selectedBucket, userSearch]);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['finance-due-aging', filterUserId || 'all'],
    queryFn: () => financeApi.getDueAgingReport({ userId: filterUserId || undefined }),
    enabled: filtersHydrated,
  });

  const selectedDetails = useMemo(() => data?.details?.[selectedBucket] || [], [data?.details, selectedBucket]);
  const filterUsers = usersQuery.data?.users || [];

  const clearUserFilter = () => {
    setFilterUserId(null);
    setUserSearch('');
  };

  if (!filtersHydrated || isLoading) return <LoadingSpinner fullScreen />;
  if (error) return <ErrorState message={(error as any).message} onRetry={refetch} />;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <ModuleSummaryHeader
          eyebrow="FINANCE / REPORTS / AGING"
          title="Due Aging"
          subtitle="Track unpaid shipment balances by age bucket using the same aging report feed exposed on web."
          showBack
          stats={[
            { label: 'Total Due', value: formatCurrency(data?.summary.totalAmountDue || 0) },
            { label: 'Open Shipments', value: String(data?.summary.totalShipments || 0) },
            { label: 'Selected Bucket', value: data?.summary.buckets[selectedBucket].label || 'N/A' },
          ]}
        />

        <Card style={styles.filterCard}>
          <Text style={[styles.sectionEyebrow, { color: colors.textSecondary }]}>Collections Filters</Text>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>User Filter</Text>
          <Text style={[styles.filterHelpText, { color: colors.textSecondary }]}>Scope aging balances to a specific account when collections follow-up needs a tighter view.</Text>
          <Input
            label="Search Users"
            value={userSearch}
            onChangeText={setUserSearch}
            placeholder="Filter by user name or email"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <View style={styles.filterRow}>
            <TouchableOpacity
              activeOpacity={0.85}
              style={StyleSheet.flatten([
                styles.filterChip,
                {
                  backgroundColor: !filterUserId ? `${colors.accent}18` : colors.panel,
                  borderColor: !filterUserId ? `${colors.accent}35` : colors.border,
                },
              ])}
              onPress={clearUserFilter}
            >
              <Text style={[styles.filterChipText, { color: !filterUserId ? colors.accent : colors.textPrimary }]}>All Users</Text>
            </TouchableOpacity>
            {filterUsers.map((user: AdminUserSummary) => {
              const selected = user.id === filterUserId;
              return (
                <TouchableOpacity
                  key={user.id}
                  activeOpacity={0.85}
                  style={StyleSheet.flatten([
                    styles.filterChip,
                    {
                      backgroundColor: selected ? `${colors.accent}18` : colors.panel,
                      borderColor: selected ? `${colors.accent}35` : colors.border,
                    },
                  ])}
                  onPress={() => setFilterUserId(user.id)}
                >
                  <Text style={[styles.filterChipText, { color: selected ? colors.accent : colors.textPrimary }]}>{user.name || user.email}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Card>

        <View style={styles.bucketGrid}>
          {bucketOrder.map((bucketKey) => {
            const bucket = data?.summary.buckets[bucketKey];
            const selected = bucketKey === selectedBucket;
            if (!bucket) return null;

            return (
              <TouchableOpacity
                key={bucketKey}
                activeOpacity={0.85}
                style={StyleSheet.flatten([
                  styles.bucketCard,
                  {
                    backgroundColor: selected ? `${colors.accent}18` : colors.panel,
                    borderColor: selected ? `${colors.accent}35` : colors.border,
                  },
                ])}
                onPress={() => setSelectedBucket(bucketKey)}
              >
                <Text style={[styles.bucketLabel, { color: selected ? colors.accent : colors.textSecondary }]}>{bucket.label}</Text>
                <Text style={[styles.bucketValue, { color: colors.textPrimary }]}>{formatCurrency(bucket.total)}</Text>
                <Text style={[styles.bucketMeta, { color: colors.textSecondary }]}>{bucket.count} shipments • {bucket.percentage.toFixed(1)}%</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Card>
          <Text style={[styles.sectionEyebrow, { color: colors.textSecondary }]}>Bucket Drill-Down</Text>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{data?.summary.buckets[selectedBucket].label || 'Bucket'} Details</Text>
          {selectedDetails.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No unpaid shipments are currently in this aging bucket.</Text>
          ) : (
            selectedDetails.map((shipment, index) => (
              <View
                key={shipment.id}
                style={StyleSheet.flatten([
                  styles.rowItem,
                  index === selectedDetails.length - 1 ? styles.rowItemLast : null,
                  { borderBottomColor: colors.border },
                ])}
              >
                <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>
                  {[shipment.vehicleMake, shipment.vehicleModel].filter(Boolean).join(' ') || 'Shipment'}
                </Text>
                <Text style={[styles.rowMeta, { color: colors.textSecondary }]}> 
                  {shipment.user.name || shipment.user.email} • {shipment.ageInDays} days old • Due {formatCurrency(shipment.amountDue)}
                </Text>
                <Button title="Open User" variant="ghost" size="sm" onPress={() => navigation.navigate('UserDetail', { id: shipment.user.id })} />
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
  filterCard: {
    marginBottom: Spacing.base,
  },
  sectionEyebrow: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: Spacing.xs,
  },
  filterHelpText: {
    fontSize: Typography.fontSize.sm,
    lineHeight: 20,
    marginBottom: Spacing.base,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  filterChip: {
    borderWidth: 1,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  filterChipText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
  },
  bucketGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.base,
  },
  bucketCard: {
    width: '48%',
    borderWidth: 1,
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    minHeight: 118,
  },
  bucketLabel: {
    fontSize: Typography.fontSize.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: Spacing.xs,
  },
  bucketValue: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    marginBottom: Spacing.xs,
  },
  bucketMeta: {
    fontSize: Typography.fontSize.sm,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    marginBottom: Spacing.sm,
  },
  emptyText: {
    fontSize: Typography.fontSize.sm,
    lineHeight: 20,
  },
  rowItem: {
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  rowItemLast: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  rowTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    marginBottom: Spacing.xs,
  },
  rowMeta: {
    fontSize: Typography.fontSize.sm,
    marginBottom: Spacing.xs,
  },
});

export default AgingReportScreen;