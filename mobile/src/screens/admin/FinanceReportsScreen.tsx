import React, { useEffect, useState } from 'react';
import { endOfMonth, format, startOfMonth, startOfQuarter, subDays } from 'date-fns';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { financeApi } from '../../api/finance';
import { usersApi } from '../../api/users';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { DateField } from '../../components/ui/DateField';
import { ErrorState } from '../../components/shared/ErrorState';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ModuleSummaryHeader } from '../../components/shared/ModuleSummaryHeader';
import { useAppTheme } from '../../hooks/useAppTheme';
import { Typography } from '../../constants/typography';
import { BorderRadius, Spacing } from '../../constants/spacing';
import { AdminUserSummary, FinancialReportType, FinancialShipmentReport, FinancialUserReport } from '../../types/admin';
import { FinanceDatePreset, loadFinanceReportFilters, saveFinanceReportFilters } from '../../utils/financeFilterStorage';

const reportOptions: Array<{ label: string; value: FinancialReportType }> = [
  { label: 'Summary', value: 'summary' },
  { label: 'User Wise', value: 'user-wise' },
  { label: 'Shipment Wise', value: 'shipment-wise' },
];

const datePresetOptions: Array<{ label: string; value: Exclude<FinanceDatePreset, 'custom' | null> }> = [
  { label: 'This Month', value: 'this-month' },
  { label: 'Last 30 Days', value: 'last-30-days' },
  { label: 'Quarter to Date', value: 'quarter-to-date' },
];

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);

const titleCase = (value: string) => value.replace(/_/g, ' ').toLowerCase().replace(/(^|\s)\w/g, (match) => match.toUpperCase());

const toDateString = (value: Date) => format(value, 'yyyy-MM-dd');

const getPresetDateRange = (preset: Exclude<FinanceDatePreset, 'custom' | null>) => {
  const today = new Date();

  if (preset === 'this-month') {
    return {
      startDate: toDateString(startOfMonth(today)),
      endDate: toDateString(endOfMonth(today) < today ? endOfMonth(today) : today),
    };
  }

  if (preset === 'last-30-days') {
    return {
      startDate: toDateString(subDays(today, 29)),
      endDate: toDateString(today),
    };
  }

  return {
    startDate: toDateString(startOfQuarter(today)),
    endDate: toDateString(today),
  };
};

const FinanceReportsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { colors } = useAppTheme();
  const [reportType, setReportType] = useState<FinancialReportType>('summary');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filterUserId, setFilterUserId] = useState<string | null>(null);
  const [datePreset, setDatePreset] = useState<FinanceDatePreset>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedShipmentId, setSelectedShipmentId] = useState<string | null>(null);
  const [filtersHydrated, setFiltersHydrated] = useState(false);

  const normalizedStartDate = startDate.trim() || undefined;
  const normalizedEndDate = endDate.trim() || undefined;
  const normalizedUserId = filterUserId || undefined;

  const usersQuery = useQuery({
    queryKey: ['admin-users', 'finance-report-filters'],
    queryFn: () => usersApi.getUsers({ roleType: 'users' }, { pageSize: 20 }),
  });

  useEffect(() => {
    let active = true;

    void (async () => {
      const persisted = await loadFinanceReportFilters();
      if (!active) {
        return;
      }

      setReportType(persisted.reportType);
      setStartDate(persisted.startDate);
      setEndDate(persisted.endDate);
      setFilterUserId(persisted.filterUserId);
      setDatePreset(persisted.datePreset);
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

    void saveFinanceReportFilters({
      reportType,
      startDate,
      endDate,
      filterUserId,
      datePreset,
    });
  }, [datePreset, endDate, filterUserId, filtersHydrated, reportType, startDate]);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['finance-report', reportType, normalizedStartDate || 'all', normalizedEndDate || 'all', normalizedUserId || 'all'],
    queryFn: () =>
      financeApi.getFinancialReport({
        type: reportType,
        startDate: normalizedStartDate,
        endDate: normalizedEndDate,
        userId: normalizedUserId,
      }),
    enabled: filtersHydrated,
  });

  if (!filtersHydrated || isLoading) return <LoadingSpinner fullScreen />;
  if (error) return <ErrorState message={(error as any).message} onRetry={refetch} />;

  const summaryStats = data?.reportType === 'summary'
    ? [
        { label: 'Net Balance', value: formatCurrency(data.ledgerSummary?.netBalance || 0) },
        { label: 'Active Dispatches', value: String(data.dispatchSummary?.activeCount || 0) },
        { label: 'Tracked Users', value: String(data.userBalances?.length || 0) },
      ]
    : data?.reportType === 'user-wise'
    ? [
        { label: 'Users', value: String(data.users?.length || 0) },
        { label: 'Scope', value: 'User Ledger' },
      ]
    : [
        { label: 'Shipments', value: String(data?.summary?.shipmentCount || 0) },
        { label: 'Revenue', value: formatCurrency(data?.summary?.totalRevenue || 0) },
        { label: 'Profit', value: formatCurrency(data?.summary?.totalProfit || 0) },
      ];

  const selectedUser = data?.reportType === 'user-wise'
    ? (data.users || []).find((user) => user.userId === selectedUserId) || data.users?.[0] || null
    : null;

  const selectedShipment = data?.reportType === 'shipment-wise'
    ? (data.shipments || []).find((shipment) => shipment.shipmentId === selectedShipmentId) || data.shipments?.[0] || null
    : null;

  const filterUsers = usersQuery.data?.users || [];
  const activeFilterUser = filterUsers.find((user) => user.id === filterUserId) || null;

  const clearFilters = () => {
    setStartDate('');
    setEndDate('');
    setFilterUserId(null);
    setDatePreset(null);
  };

  const applyDatePreset = (preset: Exclude<FinanceDatePreset, 'custom' | null>) => {
    const range = getPresetDateRange(preset);
    setDatePreset(preset);
    setStartDate(range.startDate);
    setEndDate(range.endDate);
  };

  const handleStartDateChange = (value: string) => {
    setDatePreset('custom');
    setStartDate(value);
  };

  const handleEndDateChange = (value: string) => {
    setDatePreset('custom');
    setEndDate(value);
  };

  const renderUserDrilldown = (user: FinancialUserReport) => (
    <Card key={user.userId} style={styles.sectionCard}>
      <TouchableOpacity activeOpacity={0.85} onPress={() => setSelectedUserId(user.userId)}>
        <Text style={[styles.sectionEyebrow, { color: colors.textSecondary }]}>User Ledger</Text>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{user.userName}</Text>
        <Text style={[styles.rowMeta, { color: colors.textSecondary }]}>
          {user.email} • Balance {formatCurrency(user.currentBalance)}
        </Text>
      </TouchableOpacity>

      <View style={styles.metricRow}>
        <View style={StyleSheet.flatten([styles.metricCard, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }])}>
          <Text style={[styles.metricValue, { color: colors.textPrimary }]}>{formatCurrency(user.totalDebit)}</Text>
          <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Debit</Text>
        </View>
        <View style={StyleSheet.flatten([styles.metricCard, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }])}>
          <Text style={[styles.metricValue, { color: colors.textPrimary }]}>{formatCurrency(user.totalCredit)}</Text>
          <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Credit</Text>
        </View>
      </View>

      <Button title="Open User Account" variant="secondary" onPress={() => navigation.navigate('UserDetail', { id: user.userId })} fullWidth />
    </Card>
  );

  const renderShipmentDrilldown = (shipment: FinancialShipmentReport) => (
    <Card key={shipment.shipmentId} style={styles.sectionCard}>
      <TouchableOpacity activeOpacity={0.85} onPress={() => setSelectedShipmentId(shipment.shipmentId)}>
        <Text style={[styles.sectionEyebrow, { color: colors.textSecondary }]}>Shipment Ledger</Text>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{shipment.vehicle}</Text>
        <Text style={[styles.rowMeta, { color: colors.textSecondary }]}> 
          {titleCase(shipment.paymentStatus)} • Due {formatCurrency(shipment.amountDue)} • Profit {formatCurrency(shipment.profit)}
        </Text>
      </TouchableOpacity>
      <View style={styles.metricRow}>
        <View style={StyleSheet.flatten([styles.metricCard, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }])}>
          <Text style={[styles.metricValue, { color: colors.textPrimary }]}>{formatCurrency(shipment.totalCharged)}</Text>
          <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Charged</Text>
        </View>
        <View style={StyleSheet.flatten([styles.metricCard, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }])}>
          <Text style={[styles.metricValue, { color: colors.textPrimary }]}>{formatCurrency(shipment.totalPaid)}</Text>
          <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Paid</Text>
        </View>
      </View>
    </Card>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <ModuleSummaryHeader
          eyebrow="FINANCE / REPORTS"
          title="Financial Reports"
          subtitle="Mobile access to the web financial report feeds for summary, user-wise, and shipment-wise reporting."
          showBack
          stats={summaryStats}
        />

        {data?.period ? (
          <Card style={styles.periodCard}>
            <Text style={[styles.sectionEyebrow, { color: colors.textSecondary }]}>Active Window</Text>
            <Text style={[styles.periodText, { color: colors.textPrimary }]}> 
              {data.period.startDate} to {data.period.endDate}
            </Text>
          </Card>
        ) : null}

        <View style={styles.topActionRow}>
          <Button title="Due Aging" variant="secondary" onPress={() => navigation.navigate('AgingReport')} style={styles.topActionButton} />
        </View>

        <Card style={styles.filterCard}>
          <Text style={[styles.sectionEyebrow, { color: colors.textSecondary }]}>Report Controls</Text>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Report Filters</Text>
          <Text style={[styles.filterHelpText, { color: colors.textSecondary }]}>Match the web report controls with an optional date window and user scope.</Text>
          <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>Quick Ranges</Text>
          <View style={styles.presetRow}>
            {datePresetOptions.map((option) => {
              const selected = option.value === datePreset;
              return (
                <TouchableOpacity
                  key={option.value}
                  activeOpacity={0.85}
                  style={StyleSheet.flatten([
                    styles.switcherChip,
                    styles.presetChip,
                    {
                      backgroundColor: selected ? `${colors.accent}18` : colors.panel,
                      borderColor: selected ? `${colors.accent}35` : colors.border,
                    },
                  ])}
                  onPress={() => applyDatePreset(option.value)}
                >
                  <Text style={[styles.switcherChipText, { color: selected ? colors.accent : colors.textPrimary }]}>{option.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <DateField
            label="Start Date"
            value={startDate}
            onChange={handleStartDateChange}
            placeholder="Select the first report day"
            maximumDate={endDate || undefined}
          />
          <DateField
            label="End Date"
            value={endDate}
            onChange={handleEndDateChange}
            placeholder="Select the last report day"
            minimumDate={startDate || undefined}
          />
          <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>User</Text>
          <View style={styles.switcherRow}>
            <TouchableOpacity
              activeOpacity={0.85}
              style={StyleSheet.flatten([
                styles.switcherChip,
                {
                  backgroundColor: !filterUserId ? `${colors.accent}18` : colors.panel,
                  borderColor: !filterUserId ? `${colors.accent}35` : colors.border,
                },
              ])}
              onPress={() => setFilterUserId(null)}
            >
              <Text style={[styles.switcherChipText, { color: !filterUserId ? colors.accent : colors.textPrimary }]}>All Users</Text>
            </TouchableOpacity>
            {filterUsers.map((user: AdminUserSummary) => {
              const selected = user.id === filterUserId;
              return (
                <TouchableOpacity
                  key={user.id}
                  activeOpacity={0.85}
                  style={StyleSheet.flatten([
                    styles.switcherChip,
                    {
                      backgroundColor: selected ? `${colors.accent}18` : colors.panel,
                      borderColor: selected ? `${colors.accent}35` : colors.border,
                    },
                  ])}
                  onPress={() => setFilterUserId(user.id)}
                >
                  <Text style={[styles.switcherChipText, { color: selected ? colors.accent : colors.textPrimary }]}>{user.name || user.email}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <View style={styles.topActionRow}>
            <Button title="Clear Filters" variant="ghost" onPress={clearFilters} style={styles.topActionButton} />
            <Button
              title={activeFilterUser ? `User: ${activeFilterUser.name || activeFilterUser.email}` : 'All Users'}
              variant="secondary"
              onPress={() => undefined}
              disabled
              style={styles.topActionButton}
            />
          </View>
        </Card>

        <Text style={[styles.sectionEyebrow, styles.reportModeLabel, { color: colors.textSecondary }]}>Report Mode</Text>
        <View style={styles.switcherRow}>
          {reportOptions.map((option) => {
            const selected = option.value === reportType;
            return (
              <TouchableOpacity
                key={option.value}
                activeOpacity={0.85}
                style={StyleSheet.flatten([
                  styles.switcherChip,
                  {
                    backgroundColor: selected ? `${colors.accent}18` : colors.panel,
                    borderColor: selected ? `${colors.accent}35` : colors.border,
                  },
                ])}
                onPress={() => setReportType(option.value)}
              >
                <Text style={[styles.switcherChipText, { color: selected ? colors.accent : colors.textPrimary }]}>{option.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {data?.reportType === 'summary' ? (
          <>
            <Card style={styles.sectionCard}>
              <Text style={[styles.sectionEyebrow, { color: colors.textSecondary }]}>Summary Ledger</Text>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Ledger Summary</Text>
              <View style={styles.metricRow}>
                <View style={StyleSheet.flatten([styles.metricCard, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }])}>
                  <Text style={[styles.metricValue, { color: colors.textPrimary }]}>{formatCurrency(data.ledgerSummary?.totalDebit || 0)}</Text>
                  <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Debit</Text>
                </View>
                <View style={StyleSheet.flatten([styles.metricCard, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }])}>
                  <Text style={[styles.metricValue, { color: colors.textPrimary }]}>{formatCurrency(data.ledgerSummary?.totalCredit || 0)}</Text>
                  <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Credit</Text>
                </View>
              </View>
            </Card>

            <Card style={styles.sectionCard}>
              <Text style={[styles.sectionEyebrow, { color: colors.textSecondary }]}>Status Mix</Text>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Shipment Summary</Text>
              {(data.shipmentSummary || []).map((item, index) => (
                <View
                  key={`${item.status}-${index}`}
                  style={StyleSheet.flatten([
                    styles.rowItem,
                    index === (data.shipmentSummary || []).length - 1 ? styles.rowItemLast : null,
                    { borderBottomColor: colors.border },
                  ])}
                >
                  <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>{titleCase(item.status)}</Text>
                  <Text style={[styles.rowMeta, { color: colors.textSecondary }]}>{item.count} shipments • {formatCurrency(item.totalAmount)}</Text>
                </View>
              ))}
            </Card>

            <Card>
              <Text style={[styles.sectionEyebrow, { color: colors.textSecondary }]}>Account Snapshot</Text>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>User Balances</Text>
              {(data.userBalances || []).slice(0, 8).map((item, index) => (
                <TouchableOpacity
                  key={item.userId}
                  activeOpacity={0.85}
                  onPress={() => navigation.navigate('UserDetail', { id: item.userId })}
                  style={StyleSheet.flatten([
                    styles.rowItem,
                    index === Math.min((data.userBalances || []).length, 8) - 1 ? styles.rowItemLast : null,
                    { borderBottomColor: colors.border },
                  ])}
                >
                  <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>{item.userName}</Text>
                  <Text style={[styles.rowMeta, { color: colors.textSecondary }]}>{formatCurrency(item.currentBalance)} • Open account</Text>
                </TouchableOpacity>
              ))}
            </Card>
          </>
        ) : null}

        {data?.reportType === 'user-wise' ? (
          <>
            {(data.users || []).map((item) => renderUserDrilldown(item))}

            {selectedUser ? (
              <Card>
                <Text style={[styles.sectionEyebrow, { color: colors.textSecondary }]}>Focused Account</Text>
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Selected User Drill-Down</Text>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Account</Text>
                  <Text style={[styles.detailValue, { color: colors.textPrimary }]}>{selectedUser.userName} • {selectedUser.email}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Shipment Mix</Text>
                  <Text style={[styles.detailValue, { color: colors.textPrimary }]}> 
                    {selectedUser.shipmentStats.paid} paid / {selectedUser.shipmentStats.due} due / {selectedUser.shipmentStats.total} total
                  </Text>
                </View>
                <View style={[styles.detailRow, styles.rowItemLast]}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Recent Ledger</Text>
                  {(selectedUser.recentLedgerEntries || []).slice(0, 5).map((entry) => (
                    <Text key={entry.id} style={[styles.detailListText, { color: colors.textPrimary }]}>
                      {entry.type} {formatCurrency(entry.amount)} • {entry.description}
                    </Text>
                  ))}
                </View>

                <Text style={[styles.subsectionTitle, { color: colors.textPrimary }]}>Recent Shipments</Text>
                {(selectedUser.recentShipments || []).slice(0, 4).map((shipment) => (
                  <View key={shipment.id} style={StyleSheet.flatten([styles.rowItem, { borderBottomColor: colors.border }])}>
                    <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>
                      {[shipment.vehicleMake, shipment.vehicleModel].filter(Boolean).join(' ') || 'Shipment'}
                    </Text>
                    <Text style={[styles.rowMeta, { color: colors.textSecondary }]}> 
                      {titleCase(shipment.paymentStatus)} • {shipment.paymentMode || 'Unknown payment mode'} • {formatCurrency(shipment.price || 0)}
                    </Text>
                  </View>
                ))}
              </Card>
            ) : null}
          </>
        ) : null}

        {data?.reportType === 'shipment-wise' ? (
          <>
            {(data.shipments || []).slice(0, 10).map((item) => renderShipmentDrilldown(item))}

            {selectedShipment ? (
              <Card>
                <Text style={[styles.sectionEyebrow, { color: colors.textSecondary }]}>Focused Shipment</Text>
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Selected Shipment Drill-Down</Text>
                <View style={styles.metricRow}>
                  <View style={StyleSheet.flatten([styles.metricCard, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }])}>
                    <Text style={[styles.metricValue, { color: colors.textPrimary }]}>{formatCurrency(selectedShipment.totalExpenses)}</Text>
                    <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Expenses</Text>
                  </View>
                  <View style={StyleSheet.flatten([styles.metricCard, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }])}>
                    <Text style={[styles.metricValue, { color: colors.textPrimary }]}>{selectedShipment.profitMargin.toFixed(1)}%</Text>
                    <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Margin</Text>
                  </View>
                </View>

                <Button title="Open User Account" variant="secondary" onPress={() => navigation.navigate('UserDetail', { id: selectedShipment.user.id })} fullWidth />

                <Text style={[styles.subsectionTitle, { color: colors.textPrimary }]}>Expense Recovery</Text>
                {(selectedShipment.expenses || []).length === 0 ? (
                  <Text style={[styles.rowMeta, { color: colors.textSecondary }]}>No linked shipment expenses for this report row.</Text>
                ) : (
                  (selectedShipment.expenses || []).map((expense) => (
                    <View key={expense.id} style={StyleSheet.flatten([styles.rowItem, { borderBottomColor: colors.border }])}>
                      <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>{expense.description}</Text>
                      <Text style={[styles.rowMeta, { color: colors.textSecondary }]}> 
                        {expense.type} • {formatCurrency(expense.amount)} • {new Date(expense.date).toLocaleDateString()}
                      </Text>
                      {expense.linkedCompanyLedgerEntry?.companyId ? (
                        <Button
                          title={`Open ${expense.linkedCompanyLedgerEntry.company?.name || 'Recovery'} Ledger`}
                          variant="ghost"
                          size="sm"
                          onPress={() => navigation.navigate('CompanyLedgerDetail', { id: expense.linkedCompanyLedgerEntry!.companyId })}
                        />
                      ) : null}
                    </View>
                  ))
                )}

                <Text style={[styles.subsectionTitle, { color: colors.textPrimary }]}>Ledger Trail</Text>
                {(selectedShipment.ledgerEntries || []).slice(0, 6).map((entry) => (
                  <View key={entry.id} style={StyleSheet.flatten([styles.rowItem, { borderBottomColor: colors.border }])}>
                    <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>{entry.description}</Text>
                    <Text style={[styles.rowMeta, { color: colors.textSecondary }]}> 
                      {entry.type} {formatCurrency(entry.amount)} • Balance {formatCurrency(entry.balance)}
                    </Text>
                  </View>
                ))}
              </Card>
            ) : null}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.base, paddingBottom: Spacing['4xl'] },
  periodCard: {
    marginBottom: Spacing.base,
  },
  sectionEyebrow: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: Spacing.xs,
  },
  periodText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
  },
  topActionRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.base,
  },
  topActionButton: {
    flex: 1,
  },
  filterCard: {
    marginBottom: Spacing.base,
  },
  filterHelpText: {
    fontSize: Typography.fontSize.sm,
    marginBottom: Spacing.base,
  },
  filterLabel: {
    fontSize: Typography.fontSize.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: Spacing.sm,
  },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.base,
  },
  presetChip: {
    marginBottom: 0,
  },
  switcherRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.base,
  },
  reportModeLabel: {
    marginBottom: Spacing.sm,
  },
  switcherChip: {
    borderWidth: 1,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  switcherChipText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
  },
  sectionCard: { marginBottom: Spacing.base },
  sectionTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    marginBottom: Spacing.sm,
  },
  metricRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  metricCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
  },
  metricValue: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    marginBottom: Spacing.xs,
  },
  metricLabel: {
    fontSize: Typography.fontSize.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
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
  },
  detailRow: {
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'transparent',
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
  detailListText: {
    fontSize: Typography.fontSize.sm,
    lineHeight: 20,
    marginBottom: Spacing.xs,
  },
  subsectionTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    marginTop: Spacing.base,
    marginBottom: Spacing.sm,
  },
});

export default FinanceReportsScreen;