'use client';
import { formatMoney as formatCurrency } from '@/lib/format';

import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { ArrowRightLeft, ExternalLink, Landmark, Link2, ReceiptText, RefreshCcw, Upload } from 'lucide-react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { DashboardSurface, DashboardPanel, DashboardGrid } from '@/components/dashboard/DashboardSurface';
import { PageHeader, Button, StatsCard, TableSkeleton, Modal, FormField, toast } from '@/components/design-system';
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
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-[var(--text-primary)]">{row.description}</span>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wider bg-[rgba(var(--info-rgb),0.12)] text-[var(--info-dark,var(--info))] border border-[rgba(var(--info-rgb),0.22)] uppercase">
                Bank Import
              </span>
            </div>
            <div className="text-xs text-[var(--text-secondary)] mt-0.5">
              {typeof row.metadata?.category === 'string' ? row.metadata.category : row.category || 'Bank Statement'}
              {row.reference ? ` • Ref: ${row.reference}` : ''}
            </div>
            {row.notes && (
              <div className="text-xs text-[var(--text-secondary)] mt-1">{row.notes}</div>
            )}
          </div>
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
            <div className="flex items-center gap-2 flex-wrap">
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
            </div>
          }
        />

        <DashboardPanel
          title="Account Overview"
          description="Bank imports and active integrations"
        >
          <div className="mb-4 text-sm text-[var(--text-secondary)]">
            Bank imports now post into <strong>{session?.user?.name || session?.user?.email || 'your account'}</strong> instead of a company ledger. Use Finicity to auto-sync a Bank of America account or keep using CSV uploads when needed.
          </div>

          <div
            className={`mb-4 p-3 rounded-xl border text-xs leading-relaxed ${
              bankProviderConfigured
                ? 'bg-[rgba(var(--success-rgb),0.06)] border-[rgba(var(--success-rgb),0.2)] text-[var(--text-secondary)]'
                : 'bg-[rgba(var(--status-yellow-rgb),0.08)] border-[rgba(var(--status-yellow-rgb),0.2)] text-[var(--text-secondary)]'
            }`}
          >
            {bankProviderConfigured
              ? `Connected bank accounts: ${loadingBankItems ? 'Loading...' : bankItems.length}. Background auto-sync is available through the protected cron endpoint once Finicity credentials and CRON_SECRET are configured in deployment.`
              : 'Finicity is not configured yet. Add FINICITY_PARTNER_ID, FINICITY_PARTNER_SECRET, FINICITY_APP_KEY, and FINICITY_ENCRYPTION_KEY to enable automatic Bank of America sync.'}
          </div>

          <DashboardPanel
            title="Connected Accounts"
            description="Linked bank accounts that can auto-sync into this ledger"
          >
            {loadingBankItems ? (
              <div className="py-4 text-center text-sm text-[var(--text-secondary)]">Loading connected accounts...</div>
            ) : bankItems.length === 0 ? (
              <div className="py-4 text-center text-sm text-[var(--text-secondary)]">
                No connected bank account yet. Use <strong>Connect Bank</strong> to link Bank of America through Finicity.
              </div>
            ) : (
              <div className="grid gap-3 mb-4">
                {bankItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-xl border border-[var(--border)] bg-[var(--panel)] flex justify-between gap-4 flex-wrap"
                  >
                    <div>
                      <div className="font-bold text-sm text-[var(--text-primary)]">{item.institutionName || 'Connected Bank'}</div>
                      <div className="text-xs text-[var(--text-secondary)] mt-1">
                        Last sync: {item.lastSyncAt ? new Date(item.lastSyncAt).toLocaleString() : 'Not synced yet'}
                      </div>
                    </div>
                    <div className="text-xs text-[var(--text-secondary)]">
                      {item.selectedAccounts?.map((account) => `${account.name}${account.mask ? ` • ${account.mask}` : ''}`).join(', ') || 'Accounts not captured yet'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </DashboardPanel>

          <DashboardGrid className="grid-cols-1 md:grid-cols-2 xl:grid-cols-4 my-4">
            <StatsCard icon={<ReceiptText className="w-5 h-5" />} title="Imported Rows" value={summary.entryCount} variant="default" />
            <StatsCard icon={<ArrowRightLeft className="w-5 h-5" />} title="Money In" value={formatCurrency(summary.totalDebit)} variant="error" />
            <StatsCard icon={<ArrowRightLeft className="w-5 h-5" />} title="Money Out" value={formatCurrency(summary.totalCredit)} variant="success" />
            <StatsCard icon={<Landmark className="w-5 h-5" />} title="Imported Net" value={formatCurrency(summary.netChange)} variant="info" />
          </DashboardGrid>

          <div className="mb-4 p-3 rounded-xl border border-[var(--border)] bg-[rgba(var(--info-rgb),0.06)] text-xs text-[var(--text-secondary)]">
            Imported bank rows are stored on your ledger with bank-import metadata, but CSV upload starts here in Banking instead of from the ledger screen.
          </div>

          <DashboardPanel
            title="Bank Ledger"
            description="Bank-imported rows in your ledger"
            fullHeight
          >
            {entries.length === 0 ? (
              <div className="py-8 text-center text-sm text-[var(--text-secondary)]">
                No bank-imported transactions yet.
              </div>
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
            <div className="flex gap-2 justify-end w-full">
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
            </div>
          }
        >
          <div className="space-y-4">
            <p className="text-xs text-[var(--text-secondary)]">
              This import will post directly into your ledger. Money in is imported as <strong>DEBIT</strong>. Money out is imported as <strong>CREDIT</strong>.
            </p>
            <FormField
              label="Ledger Category"
              value={importForm.category}
              onChange={(e) => {
                setImportForm((prev) => ({ ...prev, category: e.target.value }));
                setImportPreview(null);
              }}
              placeholder="Bank Statement"
            />
            <FormField
              label="Statement Ending Balance"
              value={importForm.statementEndingBalance}
              onChange={(e) => {
                setImportForm((prev) => ({ ...prev, statementEndingBalance: e.target.value }));
                setImportPreview(null);
              }}
              placeholder="0.00"
              hint="Optional, but recommended so the preview can reconcile against the statement total"
            />
            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">CSV File</label>
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={handleImportFileChange}
                className="w-full text-xs text-[var(--text-primary)] file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[var(--accent-gold)] file:text-black hover:file:opacity-90 cursor-pointer"
              />
              {importFile && (
                <div className="mt-1.5 text-xs text-[var(--text-secondary)]">
                  Selected: <strong>{importFile.name}</strong>
                </div>
              )}
            </div>

            {importPreview && (
              <div className="space-y-4 pt-2 border-t border-[var(--border)]">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="p-3 rounded-xl border border-[var(--border)] bg-[var(--panel)]">
                    <div className="text-[10px] text-[var(--text-secondary)] uppercase font-bold">Rows</div>
                    <div className="mt-1 font-bold text-base text-[var(--text-primary)]">{importPreview.totalCount}</div>
                    <div className="text-xs text-[var(--text-secondary)]">{importPreview.importableCount} ready to import</div>
                  </div>
                  <div className="p-3 rounded-xl border border-[var(--border)] bg-[var(--panel)]">
                    <div className="text-[10px] text-[var(--text-secondary)] uppercase font-bold">Duplicates</div>
                    <div className="mt-1 font-bold text-base text-[var(--text-primary)]">{importPreview.duplicateCount}</div>
                    <div className="text-xs text-[var(--text-secondary)]">Already in ledger</div>
                  </div>
                  <div className="p-3 rounded-xl border border-[var(--border)] bg-[var(--panel)]">
                    <div className="text-[10px] text-[var(--text-secondary)] uppercase font-bold">Net Change</div>
                    <div className="mt-1 font-bold text-base text-[var(--text-primary)]">{formatCurrency(importPreview.importableNetChange)}</div>
                    <div className="text-xs text-[var(--text-secondary)]">{formatCurrency(importPreview.projectedEndingBalance)}</div>
                  </div>
                  <div className="p-3 rounded-xl border border-[var(--border)] bg-[var(--panel)]">
                    <div className="text-[10px] text-[var(--text-secondary)] uppercase font-bold">Status</div>
                    <div className={`mt-1 font-bold text-xs ${importPreview.reconciliationStatus === 'MATCH' ? 'text-[var(--success)]' : 'text-[var(--warning)]'}`}>
                      {importPreview.reconciliationStatus === 'MATCH' ? 'Reconciled' : 'Variance'}
                    </div>
                  </div>
                </div>

                {importPreview.statementEndingBalance !== null && (
                  <div
                    className={`p-3 rounded-xl border text-xs ${
                      importPreview.reconciliationStatus === 'MATCH' ? 'bg-[rgba(var(--success-rgb),0.08)] border-[rgba(var(--success-rgb),0.2)]' : 'bg-[rgba(var(--error-rgb),0.08)] border-[rgba(var(--error-rgb),0.2)]'
                    }`}
                  >
                    <div className="font-bold text-[var(--text-primary)]">
                      Statement ending balance: {formatCurrency(importPreview.statementEndingBalance)}
                    </div>
                    <div className="text-xs text-[var(--text-secondary)] mt-1">
                      {importPreview.reconciliationStatus === 'MATCH'
                        ? 'Projected ledger ending balance matches the statement total.'
                        : `Projected ledger ending balance differs by ${formatCurrency(Math.abs(importPreview.reconciliationDifference || 0))}. Review duplicates and source data before importing.`}
                    </div>
                  </div>
                )}

                <div className="border border-[var(--border)] rounded-xl overflow-hidden">
                  <div className="px-4 py-2.5 font-bold text-xs border-b border-[var(--border)] bg-[var(--panel)]">
                    Preview Rows
                  </div>
                  <div className="max-h-60 overflow-y-auto">
                    <table className="w-full border-collapse text-xs">
                      <thead>
                        <tr className="bg-[var(--panel)] border-b border-[var(--border)]">
                          <th className="text-left p-2.5">Date</th>
                          <th className="text-left p-2.5">Description</th>
                          <th className="text-left p-2.5">Status</th>
                          <th className="text-right p-2.5">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border)]">
                        {importPreview.rows.map((row, index) => (
                          <tr key={`${row.transactionDate}-${row.description}-${index}`}>
                            <td className="p-2.5 align-top whitespace-nowrap">{new Date(`${row.transactionDate}T00:00:00`).toLocaleDateString()}</td>
                            <td className="p-2.5 align-top">
                              <div className="font-semibold text-[var(--text-primary)]">{row.description}</div>
                              <div className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                                {row.reference ? `Ref: ${row.reference}` : 'No reference'}{row.notes ? ` • ${row.notes}` : ''}
                              </div>
                            </td>
                            <td className="p-2.5 align-top whitespace-nowrap">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  row.isDuplicate ? 'bg-[var(--warning-light,rgba(255,193,7,0.15))] text-[var(--warning-dark,#b28900)]' : 'bg-[var(--success-light,rgba(40,167,69,0.15))] text-[var(--success-dark,#1e7e34)]'
                                }`}
                              >
                                {row.isDuplicate
                                  ? row.duplicateReason === 'ALREADY_IMPORTED'
                                    ? 'Already Imported'
                                    : 'Duplicate In File'
                                  : 'Will Import'}
                              </span>
                            </td>
                            <td className="p-2.5 align-top text-right font-bold whitespace-nowrap" style={{ color: row.type === 'DEBIT' ? 'var(--error)' : 'var(--success)' }}>
                              {row.type === 'DEBIT' ? '+' : '-'}{formatCurrency(row.amount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Modal>
      </DashboardSurface>
    </ProtectedRoute>
  );
}