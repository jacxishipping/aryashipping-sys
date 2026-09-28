import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { financeApi } from '../../api/finance';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { ErrorState } from '../../components/shared/ErrorState';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { LedgerEntryEditModal } from '../../components/admin/LedgerEntryEditModal';
import { ModuleSummaryHeader } from '../../components/shared/ModuleSummaryHeader';
import { useAppTheme } from '../../hooks/useAppTheme';
import { Typography } from '../../constants/typography';
import { BorderRadius, Spacing } from '../../constants/spacing';
import { AdminStackParamList } from '../../navigation/AdminNavigator';
import { CompanyLedgerEntry } from '../../types/admin';

type RouteProps = RouteProp<AdminStackParamList, 'CompanyLedgerDetail'>;

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);

const formatDate = (value?: string | null) => {
  if (!value) {
    return 'Not set';
  }

  return new Date(value).toLocaleDateString();
};

const titleCase = (value: string) =>
  value.toLowerCase().replace(/(^|\s)\w/g, (match) => match.toUpperCase());

const buildContactLines = (company: { email?: string | null; phone?: string | null } | null | undefined) => {
  const lines = [company?.phone, company?.email].filter(Boolean) as string[];
  return lines.length > 0 ? lines : ['No contact saved'];
};

const CompanyLedgerDetailScreen: React.FC = () => {
  const route = useRoute<RouteProps>();
  const navigation = useNavigation<any>();
  const { colors } = useAppTheme();
  const [editingEntry, setEditingEntry] = useState<CompanyLedgerEntry | null>(null);

  const companyQuery = useQuery({
    queryKey: ['finance-company', route.params.id],
    queryFn: () => financeApi.getCompany(route.params.id),
  });

  const ledgerQuery = useQuery({
    queryKey: ['finance-company-ledger', route.params.id],
    queryFn: () => financeApi.getCompanyLedger(route.params.id),
  });

  const refetchAll = () => {
    void companyQuery.refetch();
    void ledgerQuery.refetch();
  };

  if (companyQuery.isLoading || ledgerQuery.isLoading) return <LoadingSpinner fullScreen />;
  if (companyQuery.error) return <ErrorState message={(companyQuery.error as any).message} onRetry={refetchAll} />;
  if (ledgerQuery.error) return <ErrorState message={(ledgerQuery.error as any).message} onRetry={refetchAll} />;
  if (!companyQuery.data?.company) return <ErrorState message="Company not found" />;

  const { company, summary } = companyQuery.data;
  const entries = ledgerQuery.data?.entries || [];
  const dispatchLinkedShipments = (company.shipments || []).filter((shipment) => Boolean(shipment.dispatchId));
  const transitLinkedShipments = (company.shipments || []).filter((shipment) => Boolean(shipment.transitId));
  const contactLines = buildContactLines(company);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <ModuleSummaryHeader
          eyebrow="FINANCE / COMPANY LEDGERS"
          title={company.name}
          subtitle={`${titleCase(company.companyType)} company finance drill-down and recent ledger activity.`}
          showBack
          stats={[
            { label: 'Balance', value: formatCurrency(summary.currentBalance) },
            { label: 'Debit', value: formatCurrency(summary.totalDebit) },
            { label: 'Credit', value: formatCurrency(summary.totalCredit) },
          ]}
        />

        <View style={styles.actionRow}>
          <Button title="Ledgers" variant="secondary" onPress={() => navigation.navigate('CompanyLedgers')} style={styles.actionButton} />
          <Button title="Banking" onPress={() => navigation.navigate('Banking')} style={styles.actionButton} />
        </View>

        <Card style={styles.sectionCard}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Company Profile</Text>
          <Text style={[styles.sectionIntro, { color: colors.textSecondary }]}>Primary company identity, contact coverage, and expense recovery context.</Text>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Code</Text>
            <Text style={[styles.detailValue, { color: colors.textPrimary }]}>{company.code || 'Not set'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Contact</Text>
            <View style={styles.detailStack}>
              {contactLines.map((line) => (
                <Text key={line} style={[styles.detailValue, styles.detailValueCompact, { color: colors.textPrimary }]}>{line}</Text>
              ))}
            </View>
          </View>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Country</Text>
            <Text style={[styles.detailValue, { color: colors.textPrimary }]}>{company.country || 'Not set'}</Text>
          </View>
          <View style={[styles.detailRow, styles.detailRowLast]}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Expense Recovery</Text>
            <Text style={[styles.detailValue, { color: colors.textPrimary }]}>{formatCurrency(summary.totalExpenseCharges)}</Text>
          </View>
        </Card>

        <Card style={styles.sectionCard}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Operational Links</Text>
          <Text style={[styles.sectionIntro, { color: colors.textSecondary }]}>Live workload tied back to this ledger, grouped by the same operating role used on web.</Text>
          <View style={styles.metricsRow}>
            <View style={StyleSheet.flatten([styles.metricCard, { backgroundColor: colors.background, borderColor: colors.border }])}>
              <Text style={[styles.metricValue, { color: colors.textPrimary }]}>{company._count.transits}</Text>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Transits</Text>
            </View>
            <View style={StyleSheet.flatten([styles.metricCard, { backgroundColor: colors.background, borderColor: colors.border }])}>
              <Text style={[styles.metricValue, { color: colors.textPrimary }]}>{company._count.dispatches}</Text>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Dispatches</Text>
            </View>
            <View style={StyleSheet.flatten([styles.metricCard, { backgroundColor: colors.background, borderColor: colors.border }])}>
              <Text style={[styles.metricValue, { color: colors.textPrimary }]}>{company._count.shipments}</Text>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Shipments</Text>
            </View>
          </View>
          {company.companyType === 'SHIPPING' ? (
            <Text style={[styles.summaryText, { color: colors.textSecondary }]}>Shipping company ledgers tie container costs and shipment billing back to one shipping operator record.</Text>
          ) : null}
          {company.companyType === 'DISPATCH' ? (
            <Text style={[styles.summaryText, { color: colors.textSecondary }]}>Dispatch company ledgers track road-leg cost recovery and the shipments currently assigned to dispatches for this operator.</Text>
          ) : null}
          {company.companyType === 'TRANSIT' ? (
            <Text style={[styles.summaryText, { color: colors.textSecondary }]}>Transit company ledgers track inland route costs and linked shipment activity across active transit legs.</Text>
          ) : null}
        </Card>

        {company.companyType === 'SHIPPING' ? (
          <Card style={styles.sectionCard}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Recent Containers</Text>
            {company.containers && company.containers.length > 0 ? (
              company.containers.slice(0, 6).map((container, index) => (
                <TouchableOpacity
                  key={container.id}
                  activeOpacity={0.85}
                  onPress={() => navigation.navigate('ContainerDetail', { id: container.id })}
                  style={StyleSheet.flatten([
                    styles.entryRow,
                    index === Math.min(company.containers!.length, 6) - 1 ? styles.detailRowLast : null,
                    { borderBottomColor: colors.border },
                  ])}
                >
                  <View style={styles.entryInfo}>
                    <Text style={[styles.entryTitle, { color: colors.textPrimary }]}>{container.containerNumber}</Text>
                    <Text style={[styles.entryMeta, { color: colors.textSecondary }]}>{titleCase(container.status)} • Capacity {container.currentCount}/{container.maxCapacity}</Text>
                  </View>
                </TouchableOpacity>
              ))
            ) : (
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No linked containers for this company yet.</Text>
            )}
          </Card>
        ) : null}

        {company.companyType === 'DISPATCH' ? (
          <Card style={styles.sectionCard}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Recent Dispatches</Text>
            {company.dispatches && company.dispatches.length > 0 ? (
              company.dispatches.slice(0, 6).map((dispatch, index) => (
                <TouchableOpacity
                  key={dispatch.id}
                  activeOpacity={0.85}
                  onPress={() => navigation.navigate('DispatchDetail', { id: dispatch.id })}
                  style={StyleSheet.flatten([
                    styles.entryRow,
                    index === Math.min(company.dispatches!.length, 6) - 1 ? styles.detailRowLast : null,
                    { borderBottomColor: colors.border },
                  ])}
                >
                  <View style={styles.entryInfo}>
                    <Text style={[styles.entryTitle, { color: colors.textPrimary }]}>{dispatch.referenceNumber}</Text>
                    <Text style={[styles.entryMeta, { color: colors.textSecondary }]}>{dispatch.origin} to {dispatch.destination} • {dispatch._count.shipments} shipments</Text>
                  </View>
                  <View style={StyleSheet.flatten([styles.amountPill, { backgroundColor: `${colors.accent}16`, borderColor: `${colors.accent}32` }])}>
                    <Text style={[styles.amountPillText, { color: colors.accent }]}>{titleCase(dispatch.status)}</Text>
                  </View>
                </TouchableOpacity>
              ))
            ) : (
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No dispatch records linked to this company yet.</Text>
            )}
          </Card>
        ) : null}

        {company.companyType === 'TRANSIT' ? (
          <Card style={styles.sectionCard}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Recent Transits</Text>
            {company.transits && company.transits.length > 0 ? (
              company.transits.slice(0, 6).map((transit, index) => (
                <TouchableOpacity
                  key={transit.id}
                  activeOpacity={0.85}
                  onPress={() => navigation.navigate('TransitDetail', { id: transit.id })}
                  style={StyleSheet.flatten([
                    styles.entryRow,
                    index === Math.min(company.transits!.length, 6) - 1 ? styles.detailRowLast : null,
                    { borderBottomColor: colors.border },
                  ])}
                >
                  <View style={styles.entryInfo}>
                    <Text style={[styles.entryTitle, { color: colors.textPrimary }]}>{transit.referenceNumber}</Text>
                    <Text style={[styles.entryMeta, { color: colors.textSecondary }]}>{transit.origin} to {transit.destination} • {transit._count.shipments} shipments</Text>
                  </View>
                  <View style={StyleSheet.flatten([styles.amountPill, { backgroundColor: `${colors.accent}16`, borderColor: `${colors.accent}32` }])}>
                    <Text style={[styles.amountPillText, { color: colors.accent }]}>{titleCase(transit.status)}</Text>
                  </View>
                </TouchableOpacity>
              ))
            ) : (
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No linked transits for this company yet.</Text>
            )}
          </Card>
        ) : null}

        {company.companyType === 'DISPATCH' && dispatchLinkedShipments.length > 0 ? (
          <Card style={styles.sectionCard}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Assigned Shipments</Text>
            {dispatchLinkedShipments.slice(0, 8).map((shipment, index) => (
              <TouchableOpacity
                key={shipment.id}
                activeOpacity={0.85}
                onPress={() => navigation.navigate('ShipmentDetail', { id: shipment.id })}
                style={StyleSheet.flatten([
                  styles.entryRow,
                  index === Math.min(dispatchLinkedShipments.length, 8) - 1 ? styles.detailRowLast : null,
                  { borderBottomColor: colors.border },
                ])}
              >
                <View style={styles.entryInfo}>
                  <Text style={[styles.entryTitle, { color: colors.textPrimary }]}>{shipment.vehicleVIN || [shipment.vehicleMake, shipment.vehicleModel].filter(Boolean).join(' ') || shipment.id}</Text>
                  <Text style={[styles.entryMeta, { color: colors.textSecondary }]}>{titleCase(shipment.status)} • Created {formatDate(shipment.createdAt)}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </Card>
        ) : null}

        {company.companyType === 'TRANSIT' && transitLinkedShipments.length > 0 ? (
          <Card style={styles.sectionCard}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Assigned Shipments</Text>
            {transitLinkedShipments.slice(0, 8).map((shipment, index) => (
              <TouchableOpacity
                key={shipment.id}
                activeOpacity={0.85}
                onPress={() => navigation.navigate('ShipmentDetail', { id: shipment.id })}
                style={StyleSheet.flatten([
                  styles.entryRow,
                  index === Math.min(transitLinkedShipments.length, 8) - 1 ? styles.detailRowLast : null,
                  { borderBottomColor: colors.border },
                ])}
              >
                <View style={styles.entryInfo}>
                  <Text style={[styles.entryTitle, { color: colors.textPrimary }]}>{shipment.vehicleVIN || [shipment.vehicleMake, shipment.vehicleModel].filter(Boolean).join(' ') || shipment.id}</Text>
                  <Text style={[styles.entryMeta, { color: colors.textSecondary }]}>{titleCase(shipment.status)} • Created {formatDate(shipment.createdAt)}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </Card>
        ) : null}

        <Card>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Recent Ledger Entries</Text>
          <Text style={[styles.sectionIntro, { color: colors.textSecondary }]}>Latest debits and credits affecting the running company balance.</Text>
          {entries.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No ledger entries recorded yet.</Text>
          ) : (
            entries.slice(0, 8).map((entry, index) => (
              <View
                key={entry.id}
                style={StyleSheet.flatten([
                  styles.entryRow,
                  index === entries.slice(0, 8).length - 1 ? styles.detailRowLast : null,
                  { borderBottomColor: colors.border },
                ])}
              >
                <View style={styles.entryInfo}>
                  <Text style={[styles.entryTitle, { color: colors.textPrimary }]}>{entry.description}</Text>
                  <Text style={[styles.entryMeta, { color: colors.textSecondary }]}>
                    {entry.type} • {formatDate(entry.transactionDate)} • Balance {formatCurrency(entry.balance)}
                  </Text>
                </View>
                <View style={styles.entrySide}>
                  <View style={StyleSheet.flatten([styles.amountPill, { backgroundColor: `${colors.accent}16`, borderColor: `${colors.accent}32` }])}>
                    <Text style={[styles.amountPillText, { color: colors.accent }]}>{formatCurrency(entry.amount)}</Text>
                  </View>
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => setEditingEntry(entry)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={[styles.editLink, { color: colors.accent }]}>Edit</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </Card>
      </ScrollView>

      <LedgerEntryEditModal
        visible={editingEntry !== null}
        entry={editingEntry}
        onClose={() => setEditingEntry(null)}
        onSaved={refetchAll}
      />
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
    marginBottom: Spacing.sm,
  },
  sectionIntro: {
    fontSize: Typography.fontSize.sm,
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  detailRow: {
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'transparent',
  },
  detailStack: {
    gap: Spacing.xs,
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
  detailValueCompact: {
    fontSize: Typography.fontSize.sm,
    lineHeight: 20,
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
    letterSpacing: 0.7,
  },
  linkedList: {
    gap: Spacing.sm,
  },
  linkedCard: {
    marginBottom: Spacing.sm,
  },
  linkedTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    marginBottom: Spacing.xs,
  },
  linkedMeta: {
    fontSize: Typography.fontSize.sm,
  },
  summaryText: {
    fontSize: Typography.fontSize.sm,
    lineHeight: 20,
  },
  emptyText: {
    fontSize: Typography.fontSize.base,
    lineHeight: 22,
  },
  entryRow: {
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  entryInfo: {
    flex: 1,
  },
  entrySide: {
    alignItems: 'flex-end',
    gap: Spacing.xs,
  },
  entryTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    marginBottom: Spacing.xs,
  },
  entryMeta: {
    fontSize: Typography.fontSize.sm,
  },
  amountPill: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    marginTop: Spacing.xs,
  },
  amountPillText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
  },
  editLink: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
  },
});

export default CompanyLedgerDetailScreen;