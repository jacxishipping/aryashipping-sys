'use client';
import { formatMoney as formatCurrency } from '@/lib/format';

import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import {
  Box,
} from '@mui/material';
import { ArrowRightLeft, ExternalLink, Landmark, Link2, ReceiptText, RefreshCcw, Upload } from 'lucide-react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { DashboardSurface, DashboardPanel, DashboardGrid } from '@/components/dashboard/DashboardSurface';
import { PageHeader, Button, StatsCard, TableSkeleton, Modal, toast , FormField } from '@/components/design-system';
import { DataTable, type Column } from '@/components/ui/DataTable';

interface BankingSummary {
  currentBalance: number;
}

interface LedgerEntry {
  id: string;
  transactionDate: string;
  description: string;
  type: 'DEBIT' | 'CREDIT';
  amount: number;
  balance: number;
  notes?: string | null;
  metadata?: Record<string, unknown> | null;
  reference?: string | null;
  category?: string | null;
}

interface ImportPreviewRow {
  transactionDate: string;
  description: string;
  type: 'DEBIT' | 'CREDIT';
  amount: number;
  reference: string | null;
  notes: string | null;
  isDuplicate: boolean;
  duplicateReason: 'ALREADY_IMPORTED' | 'DUPLICATE_IN_FILE' | null;
}

interface ImportPreview {
  totalCount: number;
  duplicateCount: number;
  importableCount: number;
  importableNetChange: number;
  currentBalance: number;
  projectedEndingBalance: number;
  statementEndingBalance: number | null;
  reconciliationDifference: number | null;
  reconciliationStatus: 'NOT_PROVIDED' | 'MATCH' | 'VARIANCE';
  rows: ImportPreviewRow[];
}

interface FilteredBankSummary {
  entryCount: number;
  totalDebit: number;
  totalCredit: number;
  netChange: number;
}

interface BankAccountSummary {
  accountId: string;
  name: string;
  mask?: string | null;
  subtype?: string | null;
  type: string;
}

interface BankItemSummary {
  id: string;
  itemId: string;
  institutionId?: string | null;
  institutionName?: string | null;
  lastSyncAt?: string | null;
  selectedAccounts?: BankAccountSummary[] | null;
  createdAt: string;
}

const emptySummary: FilteredBankSummary = {
  entryCount: 0,
  totalDebit: 0,
  totalCredit: 0,
  netChange: 0,
};

export default function BankingFinancePage() {
  const { data: session, status } = useSession();
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [summary, setSummary] = useState<FilteredBankSummary>(emptySummary);
  const [bankItems, setBankItems] = useState<BankItemSummary[]>([]);
  const [bankProviderConfigured, setBankProviderConfigured] = useState(true);
  const [loadingBankItems, setLoadingBankItems] = useState(true);
  const [preparingBankConnection, setPreparingBankConnection] = useState(false);
  const [syncingBankItems, setSyncingBankItems] = useState(false);
  const [loading, setLoading] = useState(true);
  const [openImportDialog, setOpenImportDialog] = useState(false);
  const [previewingImport, setPreviewingImport] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const [importForm, setImportForm] = useState({
    category: 'Bank Statement',
    statementEndingBalance: '',
  });

  const resetImportForm = () => {
    setImportFile(null);
    setImportPreview(null);
    setImportForm({
      category: 'Bank Statement',
      statementEndingBalance: '',
    });
  };

  const fetchBankItems = async () => {
    try {
      setLoadingBankItems(true);
      const response = await fetch('/api/finicity/items');
      const data = await response.json();

      if (response.status === 503) {
        setBankProviderConfigured(false);
        setBankItems([]);
        return;
      }

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load connected bank accounts');
      }

      setBankProviderConfigured(true);
      setBankItems(data.items || []);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Failed to load connected bank accounts');
    } finally {
      setLoadingBankItems(false);
    }
  };

  const fetchBankingData = async () => {
    try {
      setLoading(true);
      const [ledgerResponse] = await Promise.all([
        fetch('/api/ledger?source=BANK_IMPORT&page=1&limit=500'),
        fetchBankItems(),
      ]);
      const data = await ledgerResponse.json();

      if (!ledgerResponse.ok) {
        throw new Error(data.error || 'Failed to load bank ledger');
      }

      setEntries(data.entries || []);
      setSummary({
        entryCount: data.filteredSummary?.entryCount || data.pagination?.totalCount || 0,
        totalDebit: data.filteredSummary?.totalDebit || 0,
        totalCredit: data.filteredSummary?.totalCredit || 0,
        netChange: data.filteredSummary?.netChange || 0,
      });
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Failed to load bank activity');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status !== 'authenticated') return;
    void fetchBankingData();
  }, [status]);

  const handlePrepareBankConnection = async () => {
    try {
      setPreparingBankConnection(true);
      const response = await fetch('/api/finicity/connect-url', { method: 'POST' });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to initialize bank connection');
      }

      if (!data.connectUrl || typeof data.connectUrl !== 'string') {
        throw new Error('Finicity did not return a connect URL');
      }

      window.location.assign(data.connectUrl);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Failed to initialize bank connection');
    } finally {
      setPreparingBankConnection(false);
    }
  };

  const handleSyncBankItems = async () => {
    try {
      setSyncingBankItems(true);
      const response = await fetch('/api/finicity/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh: true }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to sync connected bank accounts');
      }

      const importedCount = (data.results || []).reduce((sum: number, item: { importedCount?: number }) => sum + (item.importedCount || 0), 0);
      toast.success('Bank sync complete', {
        description: importedCount > 0 ? `${importedCount} new transaction${importedCount === 1 ? '' : 's'} imported` : 'No new transactions were available',
      });
      await fetchBankingData();
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Failed to sync connected bank accounts');
    } finally {
      setSyncingBankItems(false);
    }
  };

  const handleImportFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    setImportFile(event.target.files?.[0] || null);
    setImportPreview(null);
  };

  const handlePreviewBankCsv = async () => {
    if (!importFile) {
      toast.error('Select a CSV file to preview');
      return;
    }

    try {
      setPreviewingImport(true);
      const body = new FormData();
      body.append('action', 'preview');
      body.append('file', importFile);
      body.append('category', importForm.category.trim() || 'Bank Statement');
      body.append('sourceLabel', 'Bank of America CSV');
      body.append('statementEndingBalance', importForm.statementEndingBalance.trim());

      const response = await fetch('/api/ledger/import-bank-csv', {
        method: 'POST',
        body,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to preview Bank of America CSV');
      }

      setImportPreview(data.preview as ImportPreview);
      toast.success('Bank CSV preview ready');
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Failed to preview Bank of America CSV');
    } finally {
      setPreviewingImport(false);
    }
  };

  const handleImportBankCsv = async () => {
    if (!importFile) {
      toast.error('Select a CSV file to import');
      return;
    }

    if (!importPreview) {
      toast.error('Preview the CSV before importing');
      return;
    }

    try {
      setImporting(true);
      const body = new FormData();
      body.append('action', 'import');
      body.append('file', importFile);
      body.append('category', importForm.category.trim() || 'Bank Statement');
      body.append('sourceLabel', 'Bank of America CSV');
      body.append('statementEndingBalance', importForm.statementEndingBalance.trim());

      const response = await fetch('/api/ledger/import-bank-csv', {
        method: 'POST',
        body,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to import Bank of America CSV');
      }

      if (data.importedCount > 0) {
        toast.success(
          `${data.importedCount} bank transaction${data.importedCount === 1 ? '' : 's'} imported`,
          data.skippedCount > 0
            ? { description: `${data.skippedCount} duplicate row${data.skippedCount === 1 ? '' : 's'} skipped` }
            : undefined
        );
      } else {
        toast.info(
          'No new bank transactions were imported',
          data.skippedCount > 0
            ? { description: 'All rows were already imported previously' }
            : undefined
        );
      }

      setOpenImportDialog(false);
      resetImportForm();
      await fetchBankingData();
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Failed to import Bank of America CSV');
    } finally {
      setImporting(false);
    }
  };

  const columns = useMemo<Column<LedgerEntry>[]>(
    () => [
      {
        key: 'transactionDate',
        header: 'Date',
        sortable: true,
        render: (_, row) => new Date(row.transactionDate).toLocaleDateString(),
      },
      {
        key: 'description',
        header: 'Description',
        sortable: true,
        render: (_, row) => (
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <Box sx={{ fontWeight: 600 }}>{row.description}</Box>
              <Box
                component="span"
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  px: 0.75,
                  py: 0.25,
                  borderRadius: 1,
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  letterSpacing: '0.05em',
                  backgroundColor: 'rgba(var(--info-rgb), 0.12)',
                  color: 'var(--info-dark)',
                  border: '1px solid rgba(var(--info-rgb), 0.22)',
                  textTransform: 'uppercase',
                }}
              >
                Bank Import
              </Box>
            </Box>
            <Box sx={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              {typeof row.metadata?.category === 'string' ? row.metadata.category : row.category || 'Bank Statement'}
              {row.reference ? ` • Ref: ${row.reference}` : ''}
            </Box>
            {row.notes && (
              <Box sx={{ fontSize: '0.75rem', color: 'var(--text-secondary)', mt: 0.5 }}>{row.notes}</Box>
            )}
          </Box>
        ),
      },
      {
        key: 'type',
        header: 'Type',
        align: 'center',
        render: (_, row) => row.type,
      },
      {
        key: 'amount',
        header: 'Amount',
        align: 'right',
        render: (_, row) => (
          <span style={{ color: row.type === 'DEBIT' ? 'var(--error)' : 'var(--success-dark)', fontWeight: 700 }}>
            {row.type === 'DEBIT' ? '+' : '-'}{formatCurrency(row.amount)}
          </span>
        ),
      },
      {
        key: 'balance',
        header: 'Balance',
        align: 'right',
        render: (_, row) => <span style={{ fontWeight: 700 }}>{formatCurrency(row.balance)}</span>,
      },
    ],
    [formatCurrency]
  );

  if (status === 'loading' || loading) {
    return (
      <ProtectedRoute>
        <DashboardSurface>
          <TableSkeleton rows={8} />
        </DashboardSurface>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <DashboardSurface>
        <PageHeader
          showBreadcrumbs
          title="Banking & Statement Reconciliation"
          description="Import your bank CSV into your ledger or sync connected accounts"
          actions={
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Link href="/dashboard/finance/ledger" style={{ textDecoration: 'none' }}>
                <Button variant="outline" size="sm" icon={<ExternalLink className="w-4 h-4" />}>
                  My Ledger
                </Button>
              </Link>
              <Button
                variant="outline"
                size="sm"
                icon={<Link2 className="w-4 h-4" />}
                onClick={handlePrepareBankConnection}
                disabled={!bankProviderConfigured || preparingBankConnection || syncingBankItems}
              >
                {preparingBankConnection ? 'Opening Finicity...' : 'Connect Bank'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                icon={<RefreshCcw className="w-4 h-4" />}
                onClick={handleSyncBankItems}
                disabled={!bankProviderConfigured || syncingBankItems || bankItems.length === 0}
              >
                {syncingBankItems ? 'Syncing...' : 'Sync Now'}
              </Button>
              <Button variant="primary" size="sm" icon={<Upload className="w-4 h-4" />} onClick={() => setOpenImportDialog(true)}>
                Import Bank CSV
              </Button>
            </Box>
          }
        />

        <DashboardPanel
          title="Account Overview"
          description="Bank imports and active integrations"
        >
          <Box sx={{ mb: 2, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Bank imports now post into <strong>{session?.user?.name || session?.user?.email || 'your account'}</strong> instead of a company ledger. Use Finicity to auto-sync a Bank of America account or keep using CSV uploads when needed.
          </Box>

          <Box
            sx={{
              mb: 2,
              p: 1.5,
              borderRadius: 2,
              border: '1px solid var(--border)',
              background: bankProviderConfigured ? 'rgba(var(--success-rgb), 0.06)' : 'rgba(var(--status-yellow-rgb), 0.08)',
              color: 'var(--text-secondary)',
              fontSize: '0.82rem',
            }}
          >
            {bankProviderConfigured
              ? `Connected bank accounts: ${loadingBankItems ? 'Loading...' : bankItems.length}. Background auto-sync is available through the protected cron endpoint once Finicity credentials and CRON_SECRET are configured in deployment.`
              : 'Finicity is not configured yet. Add FINICITY_PARTNER_ID, FINICITY_PARTNER_SECRET, FINICITY_APP_KEY, and FINICITY_ENCRYPTION_KEY to enable automatic Bank of America sync.'}
          </Box>

          <DashboardPanel
            title="Connected Accounts"
            description="Linked bank accounts that can auto-sync into this ledger"
          >
            {loadingBankItems ? (
              <Box sx={{ py: 2, color: 'var(--text-secondary)' }}>Loading connected accounts...</Box>
            ) : bankItems.length === 0 ? (
              <Box sx={{ py: 2, color: 'var(--text-secondary)' }}>
                No connected bank account yet. Use <strong>Connect Bank</strong> to link Bank of America through Finicity.
              </Box>
            ) : (
              <Box sx={{ display: 'grid', gap: 1.5, mb: 2 }}>
                {bankItems.map((item) => (
                  <Box
                    key={item.id}
                    sx={{
                      p: 1.5,
                      borderRadius: 2,
                      border: '1px solid var(--border)',
                      background: 'var(--panel)',
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
                      <Box>
                        <Box sx={{ fontWeight: 700 }}>{item.institutionName || 'Connected Bank'}</Box>
                        <Box sx={{ fontSize: '0.78rem', color: 'var(--text-secondary)', mt: 0.5 }}>
                          Last sync: {item.lastSyncAt ? new Date(item.lastSyncAt).toLocaleString() : 'Not synced yet'}
                        </Box>
                      </Box>
                      <Box sx={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                        {item.selectedAccounts?.map((account) => `${account.name}${account.mask ? ` • ${account.mask}` : ''}`).join(', ') || 'Accounts not captured yet'}
                      </Box>
                    </Box>
                  </Box>
                ))}
              </Box>
            )}
          </DashboardPanel>

          <DashboardGrid className="grid-cols-1 md:grid-cols-2 xl:grid-cols-4 mb-4">
            <StatsCard icon={<ReceiptText className="w-5 h-5" />} title="Imported Rows" value={summary.entryCount} variant="default" />
            <StatsCard icon={<ArrowRightLeft className="w-5 h-5" />} title="Money In" value={formatCurrency(summary.totalDebit)} variant="error" />
            <StatsCard icon={<ArrowRightLeft className="w-5 h-5" />} title="Money Out" value={formatCurrency(summary.totalCredit)} variant="success" />
            <StatsCard icon={<Landmark className="w-5 h-5" />} title="Imported Net" value={formatCurrency(summary.netChange)} variant="info" />
          </DashboardGrid>

          <Box
            sx={{
              mb: 2,
              p: 1.5,
              borderRadius: 2,
              border: '1px solid var(--border)',
              background: 'rgba(var(--info-rgb), 0.06)',
              color: 'var(--text-secondary)',
              fontSize: '0.82rem',
            }}
          >
            Imported bank rows are stored on your ledger with bank-import metadata, but CSV upload starts here in Banking instead of from the ledger screen.
          </Box>

          <DashboardPanel
            title="Bank Ledger"
            description="Bank-imported rows in your ledger"
            fullHeight
          >
            {entries.length === 0 ? (
              <Box sx={{ py: 3, textAlign: 'center', color: 'var(--text-secondary)' }}>
                No bank-imported transactions yet.
              </Box>
            ) : (
              <DataTable data={entries} columns={columns} keyField="id" />
            )}
          </DashboardPanel>
        </DashboardPanel>

        {/* Modal for Bank CSV Import */}
        <Modal
          open={openImportDialog}
          onClose={() => {
            if (!importing && !previewingImport) {
              setOpenImportDialog(false);
              resetImportForm();
            }
          }}
          size="lg"
          title="Import Bank of America CSV"
          description="Upload statements to post debit and credit transactions into your ledger"
          actions={
            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', width: '100%' }}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setOpenImportDialog(false);
                  resetImportForm();
                }}
                disabled={importing || previewingImport}
              >
                Cancel
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handlePreviewBankCsv}
                disabled={!importFile || previewingImport || importing}
              >
                {previewingImport ? 'Generating preview...' : 'Preview Import'}
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleImportBankCsv}
                disabled={!importPreview || importing || previewingImport}
              >
                {importing ? 'Importing...' : 'Confirm & Post'}
              </Button>
            </Box>
          }
        >
          <Box sx={{ display: 'grid', gap: 2 }}>
            <Box sx={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              This import will post directly into your ledger. Money in is imported as <strong>DEBIT</strong>. Money out is imported as <strong>CREDIT</strong>.
            </Box>
            <FormField
              size="small"
              label="Ledger Category"
              value={importForm.category}
              onChange={(event) => {
                setImportForm((prev) => ({ ...prev, category: event.target.value }));
                setImportPreview(null);
              }}
              placeholder="Bank Statement"
              fullWidth
            />
            <FormField
              size="small"
              label="Statement Ending Balance"
              value={importForm.statementEndingBalance}
              onChange={(event) => {
                setImportForm((prev) => ({ ...prev, statementEndingBalance: event.target.value }));
                setImportPreview(null);
              }}
              placeholder="0.00"
              helperText="Optional, but recommended so the preview can reconcile against the statement total"
              fullWidth
            />
            <Box>
              <Box sx={{ fontSize: '0.8rem', color: 'var(--text-secondary)', mb: 1, fontWeight: 600 }}>CSV File</Box>
              <input type="file" accept=".csv,text/csv" onChange={handleImportFileChange} className="text-sm" />
              {importFile && (
                <Box sx={{ mt: 1, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Selected: <strong>{importFile.name}</strong>
                </Box>
              )}
            </Box>

            {importPreview && (
              <Box sx={{ display: 'grid', gap: 2 }}>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 1.5 }}>
                  <Box sx={{ p: 1.5, borderRadius: 2, border: '1px solid var(--border)', background: 'var(--panel)' }}>
                    <Box sx={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>Rows</Box>
                    <Box sx={{ mt: 0.5, fontWeight: 700, fontSize: '1rem' }}>{importPreview.totalCount}</Box>
                    <Box sx={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{importPreview.importableCount} ready to import</Box>
                  </Box>
                  <Box sx={{ p: 1.5, borderRadius: 2, border: '1px solid var(--border)', background: 'var(--panel)' }}>
                    <Box sx={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>Duplicates</Box>
                    <Box sx={{ mt: 0.5, fontWeight: 700, fontSize: '1rem' }}>{importPreview.duplicateCount}</Box>
                    <Box sx={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Already in ledger</Box>
                  </Box>
                  <Box sx={{ p: 1.5, borderRadius: 2, border: '1px solid var(--border)', background: 'var(--panel)' }}>
                    <Box sx={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>Net Change</Box>
                    <Box sx={{ mt: 0.5, fontWeight: 700, fontSize: '1rem' }}>{formatCurrency(importPreview.importableNetChange)}</Box>
                    <Box sx={{ mt: 0.5, fontWeight: 700, fontSize: '1rem' }}>{formatCurrency(importPreview.projectedEndingBalance)}</Box>
                    <Box sx={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                      {importPreview.reconciliationStatus === 'MATCH' ? 'Reconciles with statement' : 'Variance detected'}
                    </Box>
                  </Box>
                </Box>

                {importPreview.statementEndingBalance !== null && (
                  <Box
                    sx={{
                      p: 1.5,
                      borderRadius: 2,
                      border: '1px solid var(--border)',
                      background: importPreview.reconciliationStatus === 'MATCH' ? 'rgba(var(--success-rgb), 0.08)' : 'rgba(var(--error-rgb), 0.08)',
                    }}
                  >
                    <Box sx={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                      Statement ending balance: {formatCurrency(importPreview.statementEndingBalance)}
                    </Box>
                    <Box sx={{ fontSize: '0.82rem', color: 'var(--text-secondary)', mt: 0.5 }}>
                      {importPreview.reconciliationStatus === 'MATCH'
                        ? 'Projected ledger ending balance matches the statement total.'
                        : `Projected ledger ending balance differs by ${formatCurrency(Math.abs(importPreview.reconciliationDifference || 0))}. Review duplicates and source data before importing.`}
                    </Box>
                  </Box>
                )}

                <Box sx={{ border: '1px solid var(--border)', borderRadius: 2, overflow: 'hidden' }}>
                  <Box sx={{ px: 2, py: 1.25, fontWeight: 700, borderBottom: '1px solid var(--border)', background: 'var(--panel)' }}>
                    Preview Rows
                  </Box>
                  <Box sx={{ maxHeight: 320, overflow: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                      <thead>
                        <tr style={{ background: 'var(--panel)', borderBottom: '1px solid var(--border)' }}>
                          <th style={{ textAlign: 'left', padding: '10px 12px' }}>Date</th>
                          <th style={{ textAlign: 'left', padding: '10px 12px' }}>Description</th>
                          <th style={{ textAlign: 'left', padding: '10px 12px' }}>Status</th>
                          <th style={{ textAlign: 'right', padding: '10px 12px' }}>Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importPreview.rows.map((row, index) => (
                          <tr key={`${row.transactionDate}-${row.description}-${index}`} style={{ borderBottom: '1px solid var(--border)' }}>
                            <td style={{ padding: '10px 12px', verticalAlign: 'top' }}>{new Date(`${row.transactionDate}T00:00:00`).toLocaleDateString()}</td>
                            <td style={{ padding: '10px 12px', verticalAlign: 'top' }}>
                              <div style={{ fontWeight: 600 }}>{row.description}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                                {row.reference ? `Ref: ${row.reference}` : 'No reference'}{row.notes ? ` • ${row.notes}` : ''}
                              </div>
                            </td>
                            <td style={{ padding: '10px 12px', verticalAlign: 'top' }}>
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  padding: '4px 8px',
                                  borderRadius: 999,
                                  fontSize: '0.72rem',
                                  fontWeight: 700,
                                  background: row.isDuplicate ? 'var(--warning-light)' : 'var(--success-light)',
                                  color: row.isDuplicate ? 'var(--warning-dark)' : 'var(--success-dark)',
                                }}
                              >
                                {row.isDuplicate
                                  ? row.duplicateReason === 'ALREADY_IMPORTED'
                                    ? 'Already Imported'
                                    : 'Duplicate In File'
                                  : 'Will Import'}
                              </span>
                            </td>
                            <td style={{ padding: '10px 12px', verticalAlign: 'top', textAlign: 'right', color: row.type === 'DEBIT' ? 'var(--error)' : 'var(--success)', fontWeight: 700 }}>
                              {row.type === 'DEBIT' ? '+' : '-'}{formatCurrency(row.amount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </Box>
                </Box>
              </Box>
            )}
          </Box>
        </Modal>
      </DashboardSurface>
    </ProtectedRoute>
  );
}