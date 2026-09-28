import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Linking, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';
import { financeApi } from '../../api/finance';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { ErrorState } from '../../components/shared/ErrorState';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ModuleSummaryHeader } from '../../components/shared/ModuleSummaryHeader';
import { Input } from '../../components/ui/Input';
import { useAppTheme } from '../../hooks/useAppTheme';
import { Typography } from '../../constants/typography';
import { BorderRadius, Spacing } from '../../constants/spacing';
import { BankingLedgerEntry, BankImportPreview } from '../../types/admin';
import { loadBankingImportDraft, loadBankingReviewState, saveBankingImportDraft, saveBankingReviewState } from '../../utils/financeFilterStorage';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);

const titleCase = (value: string) =>
  value.replace(/_/g, ' ').toLowerCase().replace(/(^|\s)\w/g, (match) => match.toUpperCase());

const FINICITY_ITEM_PREFIX = 'finicity-customer:';

const entryFilterOptions = [
  { label: 'All', value: 'all' },
  { label: 'Needs Review', value: 'pending' },
  { label: 'Reviewed', value: 'reviewed' },
  { label: 'Follow Up', value: 'follow-up' },
  { label: 'Debits', value: 'DEBIT' },
  { label: 'Credits', value: 'CREDIT' },
] as const;

const getReconciliationStatus = (entry: BankingLedgerEntry) => {
  const metadata = entry.metadata || {};
  const status = metadata.reconciliationStatus;
  return typeof status === 'string' ? status : 'PENDING';
};

const buildShipmentLabel = (entry: BankingLedgerEntry) => {
  if (!entry.shipment) {
    return 'No linked shipment';
  }

  return [entry.shipment.vehicleMake, entry.shipment.vehicleModel].filter(Boolean).join(' ') || entry.shipment.vehicleVIN || 'Linked shipment';
};

const BankingScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { colors } = useAppTheme();
  const [syncing, setSyncing] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [updatingEntry, setUpdatingEntry] = useState(false);
  const [entryFilter, setEntryFilter] = useState<(typeof entryFilterOptions)[number]['value']>('all');
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [previewingImport, setPreviewingImport] = useState(false);
  const [importingCsv, setImportingCsv] = useState(false);
  const [preview, setPreview] = useState<BankImportPreview | null>(null);
  const [statementEndingBalance, setStatementEndingBalance] = useState('');
  const [noteDraft, setNoteDraft] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [reviewNoteDrafts, setReviewNoteDrafts] = useState<Record<string, string>>({});
  const [selectedBankItemId, setSelectedBankItemId] = useState<string | null>(null);
  const [selectedBankAccountId, setSelectedBankAccountId] = useState<string | null>(null);
  const [reviewStateHydrated, setReviewStateHydrated] = useState(false);
  const [importDraftHydrated, setImportDraftHydrated] = useState(false);
  const [importDraftRestored, setImportDraftRestored] = useState(false);

  const bankItemsQuery = useQuery({
    queryKey: ['bank-items'],
    queryFn: () => financeApi.getBankItems(),
  });
  const bankItems = bankItemsQuery.data?.items || [];
  const selectedBankItem = bankItems.find((item) => item.id === selectedBankItemId) || null;
  const selectedBankAccount = selectedBankItem?.selectedAccounts?.find((account) => account.accountId === selectedBankAccountId) || null;
  const selectedFinicityCustomerId = selectedBankItem?.itemId
    ? selectedBankItem.itemId.startsWith(FINICITY_ITEM_PREFIX)
      ? selectedBankItem.itemId.slice(FINICITY_ITEM_PREFIX.length)
      : selectedBankItem.itemId
    : null;

  useEffect(() => {
    let active = true;

    void (async () => {
      const persisted = await loadBankingReviewState();
      if (!active) {
        return;
      }

      setEntryFilter(persisted.entryFilter);
      setSelectedEntryId(persisted.selectedEntryId);
      setReviewNoteDrafts(persisted.reviewNoteDrafts || {});
      setSelectedBankItemId(persisted.selectedBankItemId || null);
      setSelectedBankAccountId(persisted.selectedBankAccountId || null);
      setReviewStateHydrated(true);
    })();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    void (async () => {
      const persisted = await loadBankingImportDraft();
      if (!active) {
        return;
      }

      setSelectedFile(
        persisted.selectedFile
          ? {
              lastModified: 0,
              uri: persisted.selectedFile.uri,
              name: persisted.selectedFile.name || 'bank-import.csv',
              mimeType: persisted.selectedFile.mimeType || undefined,
            }
          : null,
      );
      setPreview(persisted.preview);
      setStatementEndingBalance(persisted.statementEndingBalance);
      setImportDraftRestored(Boolean(persisted.selectedFile || persisted.preview || persisted.statementEndingBalance));
      setImportDraftHydrated(true);
    })();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!reviewStateHydrated) {
      return;
    }

    void saveBankingReviewState({
      entryFilter,
      selectedEntryId,
      reviewNoteDrafts,
      selectedBankItemId,
      selectedBankAccountId,
    });
  }, [entryFilter, reviewNoteDrafts, reviewStateHydrated, selectedBankAccountId, selectedBankItemId, selectedEntryId]);

  useEffect(() => {
    if (!importDraftHydrated) {
      return;
    }

    void saveBankingImportDraft({
      selectedFile: selectedFile
        ? {
            uri: selectedFile.uri,
            name: selectedFile.name,
            mimeType: selectedFile.mimeType,
          }
        : null,
      preview,
      statementEndingBalance,
    });
  }, [importDraftHydrated, preview, selectedFile, statementEndingBalance]);

  const ledgerQuery = useQuery({
    queryKey: [
      'banking-ledger',
      entryFilter === 'DEBIT' || entryFilter === 'CREDIT' ? entryFilter : 'all',
      selectedFinicityCustomerId || 'all-customers',
      selectedBankAccountId || 'all-accounts',
    ],
    queryFn: () =>
      financeApi.getBankingLedger({
        type: entryFilter === 'DEBIT' || entryFilter === 'CREDIT' ? entryFilter : undefined,
        finicityCustomerId: selectedFinicityCustomerId || undefined,
        finicityAccountId: selectedBankAccountId || undefined,
      }),
    enabled: reviewStateHydrated,
  });

  const refetchAll = () => {
    void bankItemsQuery.refetch();
    void ledgerQuery.refetch();
  };

  const handleConnect = async () => {
    try {
      setConnecting(true);
      const connectUrl = await financeApi.getConnectUrl();
      await Linking.openURL(connectUrl);
    } catch (error: any) {
      Alert.alert('Unable to connect bank', error?.message || 'Bank connection could not be initialized.');
    } finally {
      setConnecting(false);
    }
  };

  const handleSync = async () => {
    try {
      setSyncing(true);
      const result = await financeApi.syncConnectedAccounts(selectedBankItemId || undefined);
      const importedCount = (result.results || []).reduce((sum, item) => sum + (item.importedCount || 0), 0);
      refetchAll();
      Alert.alert(
        'Bank sync complete',
        importedCount > 0
          ? `${importedCount} transactions imported.${selectedBankItemId ? ' Selected account context was synced.' : ''}`
          : selectedBankItemId
          ? 'No new transactions were available for the selected account context.'
          : 'No new transactions were available.',
      );
    } catch (error: any) {
      Alert.alert('Unable to sync bank accounts', error?.message || 'Bank sync failed.');
    } finally {
      setSyncing(false);
    }
  };

  const handlePickCsv = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        multiple: false,
        copyToCacheDirectory: true,
        type: ['text/csv', 'text/comma-separated-values', 'application/vnd.ms-excel'],
      });

      if (result.canceled) {
        return;
      }

      setSelectedFile(result.assets[0]);
      setPreview(null);
      setImportDraftRestored(false);
    } catch (error: any) {
      Alert.alert('Unable to select CSV', error?.message || 'The bank CSV could not be selected.');
    }
  };

  const handlePreviewCsv = async () => {
    if (!selectedFile) {
      Alert.alert('Select a CSV file', 'Choose a bank CSV file before previewing the import.');
      return;
    }

    if (Platform.OS === 'web' && !selectedFile.file) {
      Alert.alert('Re-select CSV', 'This restored draft does not include a live browser file handle. Choose the CSV again before previewing or importing.');
      return;
    }

    try {
      setPreviewingImport(true);
      const response = await financeApi.previewBankCsv(selectedFile, {
        statementEndingBalance,
      });
      setPreview(response.preview);
    } catch (error: any) {
      Alert.alert('Unable to preview CSV', error?.message || 'The bank CSV preview could not be generated.');
    } finally {
      setPreviewingImport(false);
    }
  };

  const resetCsvImport = () => {
    setSelectedFile(null);
    setPreview(null);
    setStatementEndingBalance('');
    setImportDraftRestored(false);
  };

  const handleImportCsv = async () => {
    if (!selectedFile) {
      Alert.alert('Select a CSV file', 'Choose a bank CSV file before importing.');
      return;
    }

    if (Platform.OS === 'web' && !selectedFile.file) {
      Alert.alert('Re-select CSV', 'This restored draft does not include a live browser file handle. Choose the CSV again before importing.');
      return;
    }

    if (!preview) {
      Alert.alert('Preview required', 'Preview the bank CSV before importing it.');
      return;
    }

    try {
      setImportingCsv(true);
      const result = await financeApi.importBankCsv(selectedFile, {
        statementEndingBalance,
      });
      refetchAll();
      resetCsvImport();
      Alert.alert(
        'CSV import complete',
        result.importedCount > 0
          ? `${result.importedCount} transactions imported. ${result.skippedCount > 0 ? `${result.skippedCount} duplicates skipped.` : ''}`
          : 'No new transactions were imported.',
      );
    } catch (error: any) {
      Alert.alert('Unable to import CSV', error?.message || 'The bank CSV import failed.');
    } finally {
      setImportingCsv(false);
    }
  };

  const updateReconciliationStatus = async (entry: BankingLedgerEntry, status: 'REVIEWED' | 'FOLLOW_UP' | 'PENDING') => {
    const nextMetadata = {
      ...(entry.metadata || {}),
      reconciliationStatus: status,
      reconciliationReviewedAt: status === 'PENDING' ? null : new Date().toISOString(),
      reconciliationReviewedSource: 'mobile-admin',
    };

    try {
      setUpdatingEntry(true);
      await financeApi.updateLedgerEntry(entry.id, {
        notes: noteDraft.trim() || undefined,
        metadata: nextMetadata,
      });
      clearSavedReviewDraft(entry.id);
      void ledgerQuery.refetch();
      Alert.alert(
        'Reconciliation updated',
        status === 'REVIEWED'
          ? 'Entry marked as reviewed.'
          : status === 'FOLLOW_UP'
          ? 'Entry flagged for follow-up.'
          : 'Review status cleared.',
      );
    } catch (error: any) {
      Alert.alert('Unable to update entry', error?.message || 'The reconciliation status could not be updated.');
    } finally {
      setUpdatingEntry(false);
    }
  };

  const bankingConfigured = bankItemsQuery.data?.configured !== false;
  const ledger = ledgerQuery.data;
  const contextLabel = selectedBankItem
    ? `${selectedBankItem.institutionName || 'Connected Bank'}${selectedBankAccount ? ` • ${selectedBankAccount.name}${selectedBankAccount.mask ? ` • ${selectedBankAccount.mask}` : ''}` : ''}`
    : null;
  const reviewCounts = useMemo(() => {
    const counts = { reviewed: 0, followUp: 0, pending: 0 };

    for (const entry of ledger?.entries || []) {
      const status = getReconciliationStatus(entry);
      if (status === 'REVIEWED') {
        counts.reviewed += 1;
      } else if (status === 'FOLLOW_UP') {
        counts.followUp += 1;
      } else {
        counts.pending += 1;
      }
    }

    return counts;
  }, [ledger?.entries]);

  const visibleEntries = useMemo(() => {
    const items = ledger?.entries || [];

    if (entryFilter === 'pending') {
      return items.filter((entry) => getReconciliationStatus(entry) === 'PENDING');
    }

    if (entryFilter === 'reviewed') {
      return items.filter((entry) => getReconciliationStatus(entry) === 'REVIEWED');
    }

    if (entryFilter === 'follow-up') {
      return items.filter((entry) => getReconciliationStatus(entry) === 'FOLLOW_UP');
    }

    return items;
  }, [entryFilter, ledger?.entries]);

  const selectedEntry = useMemo(
    () => visibleEntries.find((entry) => entry.id === selectedEntryId) || visibleEntries[0] || null,
    [selectedEntryId, visibleEntries],
  );
  const needsWebFileReselection = Platform.OS === 'web' && Boolean(selectedFile) && !selectedFile?.file;
  const activeReviewDraft = selectedEntry?.id ? reviewNoteDrafts[selectedEntry.id] : undefined;
  const hasCsvDraft = Boolean(selectedFile || preview || statementEndingBalance);
  const csvDraftSummary = importDraftRestored
    ? `Resumed ${selectedFile?.name || 'bank CSV draft'}${preview ? ' with preview data ready' : ''}${statementEndingBalance ? ' and ending balance applied' : ''}.`
    : hasCsvDraft
    ? 'Current CSV draft changes will persist if you leave this screen.'
    : 'No saved CSV draft yet. Choose a file to start a new draft.';

  useEffect(() => {
    if (!reviewStateHydrated) {
      return;
    }

    if (!selectedBankItemId) {
      if (selectedBankAccountId !== null) {
        setSelectedBankAccountId(null);
      }
      return;
    }

    const bankItemExists = bankItems.some((item) => item.id === selectedBankItemId);
    if (!bankItemExists) {
      setSelectedBankItemId(null);
      setSelectedBankAccountId(null);
      return;
    }

    if (!selectedBankAccountId) {
      return;
    }

    const accountExists = selectedBankItem?.selectedAccounts?.some((account) => account.accountId === selectedBankAccountId);
    if (!accountExists) {
      setSelectedBankAccountId(null);
    }
  }, [bankItems, reviewStateHydrated, selectedBankAccountId, selectedBankItem, selectedBankItemId]);

  useEffect(() => {
    if (!reviewStateHydrated) {
      return;
    }

    if (visibleEntries.length === 0) {
      if (selectedEntryId !== null) {
        setSelectedEntryId(null);
      }
      return;
    }

    const hasSelectedEntry = selectedEntryId ? visibleEntries.some((entry) => entry.id === selectedEntryId) : false;
    if (!hasSelectedEntry) {
      setSelectedEntryId(visibleEntries[0].id);
    }
  }, [reviewStateHydrated, selectedEntryId, visibleEntries]);

  useEffect(() => {
    setNoteDraft(activeReviewDraft ?? selectedEntry?.notes ?? '');
  }, [activeReviewDraft, selectedEntry?.id, selectedEntry?.notes]);

  if (!reviewStateHydrated || !importDraftHydrated || bankItemsQuery.isLoading || ledgerQuery.isLoading) return <LoadingSpinner fullScreen />;
  if (bankItemsQuery.error) return <ErrorState message={(bankItemsQuery.error as any).message} onRetry={refetchAll} />;
  if (ledgerQuery.error) return <ErrorState message={(ledgerQuery.error as any).message} onRetry={refetchAll} />;

  const handleNoteDraftChange = (value: string) => {
    setNoteDraft(value);

    if (!selectedEntry?.id) {
      return;
    }

    setReviewNoteDrafts((current) => {
      const baseline = selectedEntry.notes || '';

      if (value === baseline) {
        if (!(selectedEntry.id in current)) {
          return current;
        }

        const nextDrafts = { ...current };
        delete nextDrafts[selectedEntry.id];
        return nextDrafts;
      }

      if (current[selectedEntry.id] === value) {
        return current;
      }

      return {
        ...current,
        [selectedEntry.id]: value,
      };
    });
  };

  const clearSavedReviewDraft = (entryId: string) => {
    setReviewNoteDrafts((current) => {
      if (!(entryId in current)) {
        return current;
      }

      const nextDrafts = { ...current };
      delete nextDrafts[entryId];
      return nextDrafts;
    });
  };

  const resetEntryNoteDraft = () => {
    if (!selectedEntry) {
      return;
    }

    clearSavedReviewDraft(selectedEntry.id);
    setNoteDraft(selectedEntry.notes || '');
  };

  const saveEntryNote = async (entry: BankingLedgerEntry) => {
    try {
      setSavingNote(true);
      await financeApi.updateLedgerEntry(entry.id, {
        notes: noteDraft.trim() || undefined,
        metadata: entry.metadata || undefined,
      });
      clearSavedReviewDraft(entry.id);
      void ledgerQuery.refetch();
      Alert.alert('Reconciliation note updated', noteDraft.trim() ? 'The reconciliation note was saved.' : 'The reconciliation note was cleared.');
    } catch (error: any) {
      Alert.alert('Unable to save note', error?.message || 'The reconciliation note could not be updated.');
    } finally {
      setSavingNote(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <ModuleSummaryHeader
          eyebrow="FINANCE / BANKING"
          title="Banking"
          subtitle="Connected accounts, imported bank activity, and reconciliation entry points from the existing finance backend."
          showBack
          stats={[
            { label: 'Connections', value: String(bankItems.length) },
            { label: 'Needs Review', value: String(reviewCounts.pending) },
            { label: 'Net Change', value: formatCurrency(ledger?.filteredSummary.netChange || 0) },
          ]}
        />

        <Card style={styles.sectionCard}>
          <Text style={[styles.sectionEyebrow, { color: colors.textSecondary }]}>Bank Controls</Text>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Connection Actions</Text>
          <Text style={[styles.sectionText, styles.sectionDescription, { color: colors.textSecondary }]}>Launch a new bank connection or sync imported activity before moving into review and reconciliation.</Text>
          <View style={styles.actionRow}>
            <Button title="Connect Bank" onPress={handleConnect} loading={connecting} style={styles.actionButton} />
            <Button title="Sync Accounts" onPress={handleSync} loading={syncing} variant="secondary" style={styles.actionButton} />
          </View>
        </Card>

        {!bankingConfigured ? (
          <Card style={styles.sectionCard}>
            <Text style={[styles.sectionEyebrow, { color: colors.textSecondary }]}>Connectivity</Text>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Finicity Not Configured</Text>
            <Text style={[styles.sectionText, { color: colors.textSecondary }]}>The backend reported that live bank connectivity is not configured in this environment. Imported ledger history can still appear below when available.</Text>
          </Card>
        ) : null}

        <Card style={styles.sectionCard}>
          <Text style={[styles.sectionEyebrow, { color: colors.textSecondary }]}>Bank Items</Text>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Connected Accounts</Text>
          {selectedBankItem ? (
            <View style={styles.accountContextRow}>
              <View style={StyleSheet.flatten([styles.accountContextBadge, { backgroundColor: `${colors.info}16`, borderColor: `${colors.info}32` }])}>
                <Text style={[styles.accountContextBadgeText, { color: colors.info }]}>Focused Context</Text>
              </View>
              <Text style={[styles.accountContextText, { color: colors.textSecondary }]}>
                {contextLabel}
              </Text>
              <View style={styles.accountContextActions}>
                <Button
                  title="Clear Context"
                  variant="ghost"
                  size="sm"
                  onPress={() => {
                    setSelectedBankItemId(null);
                    setSelectedBankAccountId(null);
                  }}
                />
              </View>
            </View>
          ) : null}
          {bankItems.length === 0 ? (
            <Text style={[styles.sectionText, { color: colors.textSecondary }]}>No connected bank accounts yet.</Text>
          ) : (
            bankItems.map((item, index) => (
              <TouchableOpacity
                key={item.id}
                activeOpacity={0.85}
                onPress={() => {
                  setSelectedBankItemId(item.id);
                  setSelectedBankAccountId(null);
                }}
                style={StyleSheet.flatten([
                  styles.rowItem,
                  index === bankItems.length - 1 ? styles.rowItemLast : null,
                  {
                    borderBottomColor: colors.border,
                    backgroundColor: item.id === selectedBankItemId ? `${colors.accent}0d` : 'transparent',
                    borderRadius: item.id === selectedBankItemId ? BorderRadius.base : 0,
                    paddingHorizontal: item.id === selectedBankItemId ? Spacing.sm : 0,
                  },
                ])}
              >
                <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>{item.institutionName || 'Connected Bank'}</Text>
                <Text style={[styles.rowMeta, { color: colors.textSecondary }]}>Last sync: {item.lastSyncAt ? new Date(item.lastSyncAt).toLocaleString() : 'Never'}</Text>
                {(item.selectedAccounts || []).map((account) => {
                  const selectedAccount = item.id === selectedBankItemId && account.accountId === selectedBankAccountId;

                  return (
                    <TouchableOpacity
                      key={account.accountId}
                      activeOpacity={0.85}
                      onPress={() => {
                        setSelectedBankItemId(item.id);
                        setSelectedBankAccountId(account.accountId);
                      }}
                      style={StyleSheet.flatten([
                        styles.accountRow,
                        {
                          backgroundColor: selectedAccount ? `${colors.info}12` : 'transparent',
                          borderColor: selectedAccount ? `${colors.info}32` : 'transparent',
                        },
                      ])}
                    >
                      <Text style={[styles.rowMeta, { color: colors.textSecondary }]}> 
                        {account.name} {account.mask ? `• ${account.mask}` : ''}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </TouchableOpacity>
            ))
          )}
        </Card>

        <Card style={styles.sectionCard}>
          <Text style={[styles.sectionEyebrow, { color: colors.textSecondary }]}>Import Workflow</Text>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Bank CSV Import</Text>
          <Text style={[styles.sectionText, { color: colors.textSecondary }]}>Preview and import Bank of America CSV statements into the same banking ledger used by the web finance flow.</Text>
          <View style={styles.draftStateRow}>
            <View
              style={StyleSheet.flatten([
                styles.draftStateBadge,
                {
                  backgroundColor: importDraftRestored ? `${colors.info}16` : `${colors.accent}16`,
                  borderColor: importDraftRestored ? `${colors.info}32` : `${colors.accent}32`,
                },
              ])}
            >
              <Text style={[styles.draftStateBadgeText, { color: importDraftRestored ? colors.info : colors.accent }]}>
                {importDraftRestored ? 'Restored Draft' : 'New Draft'}
              </Text>
            </View>
            <Text style={[styles.draftStateText, { color: colors.textSecondary }]}>{csvDraftSummary}</Text>
          </View>
          <Input
            label="Statement Ending Balance"
            value={statementEndingBalance}
            onChangeText={setStatementEndingBalance}
            placeholder="Optional ending balance for reconciliation"
            keyboardType="decimal-pad"
          />

          <View style={styles.csvActionRow}>
            <Button title={selectedFile ? 'Change CSV' : 'Choose CSV'} onPress={handlePickCsv} style={styles.actionButton} />
            <Button title="Preview Import" variant="secondary" onPress={handlePreviewCsv} loading={previewingImport} disabled={!selectedFile} style={styles.actionButton} />
          </View>

          {selectedFile ? (
            <Text style={[styles.fileMeta, { color: colors.textSecondary }]}>Selected file: {selectedFile.name || 'bank-import.csv'}</Text>
          ) : null}

          {needsWebFileReselection ? (
            <Text style={[styles.draftWarningText, { color: colors.warning }]}>Draft restored. Re-select the CSV on web before previewing or importing because the browser file handle cannot be persisted.</Text>
          ) : null}

          {preview ? (
            <View style={styles.previewBlock}>
              <View style={styles.metricRow}>
                <View style={StyleSheet.flatten([styles.metricCard, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }])}>
                  <Text style={[styles.metricValue, { color: colors.textPrimary }]}>{preview.importableCount}</Text>
                  <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Importable</Text>
                </View>
                <View style={StyleSheet.flatten([styles.metricCard, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }])}>
                  <Text style={[styles.metricValue, { color: colors.textPrimary }]}>{preview.duplicateCount}</Text>
                  <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Duplicates</Text>
                </View>
              </View>

              <View style={styles.metricRow}>
                <View style={StyleSheet.flatten([styles.metricCard, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }])}>
                  <Text style={[styles.metricValue, { color: colors.textPrimary }]}>{formatCurrency(preview.projectedEndingBalance)}</Text>
                  <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Projected Ending</Text>
                </View>
                <View style={StyleSheet.flatten([styles.metricCard, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }])}>
                  <Text style={[styles.metricValue, { color: colors.textPrimary }]}>{preview.reconciliationDifference === null ? 'N/A' : formatCurrency(preview.reconciliationDifference)}</Text>
                  <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>{titleCase(preview.reconciliationStatus)}</Text>
                </View>
              </View>

              <Text style={[styles.subsectionTitle, { color: colors.textPrimary }]}>Preview Rows</Text>
              {preview.rows.slice(0, 6).map((row, index) => (
                <View
                  key={`${row.transactionDate}-${row.description}-${index}`}
                  style={StyleSheet.flatten([
                    styles.rowItem,
                    index === Math.min(preview.rows.length, 6) - 1 ? styles.rowItemLast : null,
                    { borderBottomColor: colors.border },
                  ])}
                >
                  <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>{row.description}</Text>
                  <Text style={[styles.rowMeta, { color: colors.textSecondary }]}>
                    {row.type} {formatCurrency(row.amount)} • {new Date(row.transactionDate).toLocaleDateString()} {row.isDuplicate ? `• ${titleCase(row.duplicateReason || 'duplicate')}` : ''}
                  </Text>
                </View>
              ))}

              <View style={styles.csvActionRow}>
                <Button title="Import CSV" onPress={handleImportCsv} loading={importingCsv} disabled={needsWebFileReselection} style={styles.actionButton} />
                <Button title="Reset" variant="ghost" onPress={resetCsvImport} disabled={importingCsv} style={styles.actionButton} />
              </View>
            </View>
          ) : null}
        </Card>

        <Card style={styles.sectionCard}>
          <Text style={[styles.sectionEyebrow, { color: colors.textSecondary }]}>Review Queue</Text>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Reconciliation Queue</Text>
          {contextLabel ? (
            <View style={styles.queueContextRow}>
              <View style={StyleSheet.flatten([styles.accountContextBadge, { backgroundColor: `${colors.info}16`, borderColor: `${colors.info}32` }])}>
                <Text style={[styles.accountContextBadgeText, { color: colors.info }]}>Active Bank Filter</Text>
              </View>
              <Text style={[styles.sectionText, styles.queueContextText, { color: colors.textSecondary }]}>{contextLabel}</Text>
            </View>
          ) : null}
          <View style={styles.filterRow}>
            {entryFilterOptions.map((option) => {
              const selected = option.value === entryFilter;
              return (
                <TouchableOpacity
                  key={option.value}
                  activeOpacity={0.85}
                  style={StyleSheet.flatten([
                    styles.filterChip,
                    {
                      backgroundColor: selected ? `${colors.accent}18` : colors.panel,
                      borderColor: selected ? `${colors.accent}35` : colors.border,
                    },
                  ])}
                  onPress={() => setEntryFilter(option.value)}
                >
                  <Text style={[styles.filterChipText, { color: selected ? colors.accent : colors.textPrimary }]}>{option.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <View style={styles.metricRow}>
            <View style={StyleSheet.flatten([styles.metricCard, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }])}>
              <Text style={[styles.metricValue, { color: colors.textPrimary }]}>{reviewCounts.reviewed}</Text>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Reviewed</Text>
            </View>
            <View style={StyleSheet.flatten([styles.metricCard, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }])}>
              <Text style={[styles.metricValue, { color: colors.textPrimary }]}>{reviewCounts.followUp}</Text>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Follow Up</Text>
            </View>
          </View>
        </Card>

        <Card style={styles.sectionCard}>
          <Text style={[styles.sectionEyebrow, { color: colors.textSecondary }]}>Ledger Activity</Text>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Imported Ledger Activity</Text>
          {contextLabel ? (
            <Text style={[styles.sectionText, { color: colors.textSecondary }]}>Showing imported activity for the selected connected bank context.</Text>
          ) : null}
          <View style={styles.metricRow}>
            <View style={StyleSheet.flatten([styles.metricCard, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }])}>
              <Text style={[styles.metricValue, { color: colors.textPrimary }]}>{formatCurrency(ledger?.filteredSummary.totalDebit || 0)}</Text>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Debit</Text>
            </View>
            <View style={StyleSheet.flatten([styles.metricCard, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }])}>
              <Text style={[styles.metricValue, { color: colors.textPrimary }]}>{formatCurrency(ledger?.filteredSummary.totalCredit || 0)}</Text>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Credit</Text>
            </View>
          </View>

          {visibleEntries.length === 0 ? (
            <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
              {selectedBankItemId ? 'No imported entries match the current bank context and review filter.' : 'No imported entries match the current review filter.'}
            </Text>
          ) : (
            visibleEntries.slice(0, 12).map((entry, index) => {
              const selected = selectedEntry?.id === entry.id;
              const status = getReconciliationStatus(entry);
              const hasLocalDraft = Boolean(reviewNoteDrafts[entry.id]) && reviewNoteDrafts[entry.id] !== (entry.notes || '');

              return (
                <TouchableOpacity
                  key={entry.id}
                  activeOpacity={0.85}
                  onPress={() => setSelectedEntryId(entry.id)}
                  style={StyleSheet.flatten([
                    styles.rowItem,
                    index === Math.min(visibleEntries.length, 12) - 1 ? styles.rowItemLast : null,
                    {
                      borderBottomColor: colors.border,
                      backgroundColor: selected ? `${colors.accent}0d` : 'transparent',
                      borderRadius: selected ? BorderRadius.base : 0,
                      paddingHorizontal: selected ? Spacing.sm : 0,
                    },
                  ])}
                >
                  <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>{entry.description}</Text>
                  <Text style={[styles.rowMeta, { color: colors.textSecondary }]}> 
                    {entry.user?.name || entry.user?.email || 'Unknown user'} • Balance {formatCurrency(entry.balance)} • {new Date(entry.transactionDate).toLocaleDateString()}
                  </Text>
                  <View style={styles.entryBadgeRow}>
                    {hasLocalDraft ? (
                      <View style={StyleSheet.flatten([styles.localDraftPill, { backgroundColor: `${colors.warning}14`, borderColor: `${colors.warning}2f` }])}>
                        <Text style={[styles.localDraftPillText, { color: colors.warning }]}>Draft Note</Text>
                      </View>
                    ) : null}
                    <View style={StyleSheet.flatten([styles.amountPill, { backgroundColor: `${colors.accent}16`, borderColor: `${colors.accent}32` }])}>
                      <Text style={[styles.amountPillText, { color: colors.accent }]}>{entry.type} {formatCurrency(entry.amount)}</Text>
                    </View>
                    <View
                      style={StyleSheet.flatten([
                        styles.statusPill,
                        {
                          backgroundColor: status === 'REVIEWED' ? `${colors.success}1f` : status === 'FOLLOW_UP' ? `${colors.warning}24` : `${colors.border}66`,
                          borderColor: status === 'REVIEWED' ? `${colors.success}47` : status === 'FOLLOW_UP' ? `${colors.warning}4d` : colors.border,
                        },
                      ])}
                    >
                      <Text style={[styles.statusPillText, { color: status === 'REVIEWED' ? colors.success : status === 'FOLLOW_UP' ? colors.warning : colors.textSecondary }]}>{titleCase(status)}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </Card>

        {selectedEntry ? (
          <Card style={styles.sectionCard}>
            <Text style={[styles.sectionEyebrow, { color: colors.textSecondary }]}>Entry Review</Text>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Selected Entry Review</Text>
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Customer</Text>
              <Text style={[styles.detailValue, { color: colors.textPrimary }]}>{selectedEntry.user?.name || selectedEntry.user?.email || 'Unknown user'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Shipment</Text>
              <Text style={[styles.detailValue, { color: colors.textPrimary }]}>{buildShipmentLabel(selectedEntry)}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Import Source</Text>
              <Text style={[styles.detailValue, { color: colors.textPrimary }]}>
                {typeof selectedEntry.metadata?.sourceLabel === 'string' ? selectedEntry.metadata.sourceLabel : 'Bank import'}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Imported File</Text>
              <Text style={[styles.detailValue, { color: colors.textPrimary }]}>
                {typeof selectedEntry.metadata?.importedFileName === 'string' ? selectedEntry.metadata.importedFileName : 'Not captured'}
              </Text>
            </View>
            <View style={[styles.detailRow, styles.detailRowLast]}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Notes</Text>
              <Text style={[styles.detailValue, { color: colors.textPrimary }]}>{selectedEntry.notes || 'No reconciliation note recorded.'}</Text>
            </View>

            <Input
              label="Edit Reconciliation Note"
              value={noteDraft}
              onChangeText={handleNoteDraftChange}
              placeholder="Add follow-up context, matching notes, or reviewer comments"
              autoCapitalize="sentences"
              autoCorrect
              containerStyle={styles.noteInput}
            />

            <Text style={[styles.noteDraftText, { color: colors.textSecondary }]}>Unsaved note drafts persist if you leave this screen and return later.</Text>

            <View style={styles.reviewActionRow}>
              <Button title="Save Note" onPress={() => saveEntryNote(selectedEntry)} loading={savingNote} style={styles.reviewActionButton} />
              <Button
                title="Reset Note"
                variant="ghost"
                onPress={resetEntryNoteDraft}
                disabled={savingNote}
                style={styles.reviewActionButton}
              />
            </View>

            <View style={styles.reviewActionRow}>
              <Button title="Mark Reviewed" onPress={() => updateReconciliationStatus(selectedEntry, 'REVIEWED')} loading={updatingEntry} style={styles.reviewActionButton} />
              <Button title="Flag Follow-Up" variant="secondary" onPress={() => updateReconciliationStatus(selectedEntry, 'FOLLOW_UP')} disabled={updatingEntry} style={styles.reviewActionButton} />
            </View>
            <View style={styles.reviewActionRow}>
              <Button title="Clear Status" variant="ghost" onPress={() => updateReconciliationStatus(selectedEntry, 'PENDING')} disabled={updatingEntry} style={styles.reviewActionButton} />
              <Button title="Open User" variant="secondary" onPress={() => navigation.navigate('UserDetail', { id: selectedEntry.user!.id })} disabled={!selectedEntry.user?.id} style={styles.reviewActionButton} />
            </View>
          </Card>
        ) : null}

        <Card>
          <Text style={[styles.sectionEyebrow, { color: colors.textSecondary }]}>Next Routes</Text>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Related Finance Routes</Text>
          <View style={styles.linkRow}>
            <Button title="Company Ledgers" variant="secondary" onPress={() => navigation.navigate('CompanyLedgers')} style={styles.linkButton} />
            <Button title="Reports" variant="secondary" onPress={() => navigation.navigate('FinanceReports')} style={styles.linkButton} />
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.base, paddingBottom: Spacing['4xl'] },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  actionButton: {
    flex: 1,
  },
  linkButton: {
    flex: 1,
  },
  sectionCard: { marginBottom: Spacing.base },
  sectionEyebrow: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: Spacing.xs,
  },
  csvActionRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  fileMeta: {
    fontSize: Typography.fontSize.sm,
    marginBottom: Spacing.sm,
  },
  draftStateRow: {
    marginBottom: Spacing.base,
  },
  draftStateBadge: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  draftStateBadgeText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
  },
  draftStateText: {
    fontSize: Typography.fontSize.sm,
    lineHeight: 20,
  },
  draftWarningText: {
    fontSize: Typography.fontSize.sm,
    lineHeight: 20,
    marginBottom: Spacing.sm,
  },
  previewBlock: {
    marginTop: Spacing.sm,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.base,
  },
  queueContextRow: {
    marginBottom: Spacing.base,
  },
  queueContextText: {
    marginTop: Spacing.sm,
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
  accountContextRow: {
    marginBottom: Spacing.base,
  },
  accountContextBadge: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  accountContextBadgeText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
  },
  accountContextText: {
    fontSize: Typography.fontSize.sm,
    lineHeight: 20,
  },
  accountContextActions: {
    marginTop: Spacing.sm,
  },
  accountRow: {
    borderWidth: 1,
    borderRadius: BorderRadius.base,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    marginTop: Spacing.xs,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    marginBottom: Spacing.sm,
  },
  sectionText: {
    fontSize: Typography.fontSize.sm,
    lineHeight: 20,
  },
  sectionDescription: {
    marginBottom: Spacing.base,
  },
  metricRow: {
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
    marginBottom: Spacing.xs,
  },
  entryBadgeRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    flexWrap: 'wrap',
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
    fontWeight: Typography.fontWeight.semibold,
  },
  localDraftPill: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    marginTop: Spacing.xs,
  },
  localDraftPillText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
  },
  statusPill: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    marginTop: Spacing.xs,
  },
  statusPillText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
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
  subsectionTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    marginTop: Spacing.base,
    marginBottom: Spacing.sm,
  },
  reviewActionRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  noteInput: {
    marginTop: Spacing.base,
    marginBottom: 0,
  },
  noteDraftText: {
    fontSize: Typography.fontSize.sm,
    lineHeight: 20,
    marginTop: Spacing.sm,
  },
  reviewActionButton: {
    flex: 1,
  },
  linkRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
});

export default BankingScreen;