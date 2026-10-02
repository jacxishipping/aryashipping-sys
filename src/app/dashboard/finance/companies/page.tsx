'use client';
import { formatMoney as formatCurrency } from '@/lib/format';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import React from 'react';
function sxToStyle(sx?: any): React.CSSProperties {
  if (!sx) return {};
  const style: any = {};
  for (const [key, val] of Object.entries(sx)) {
    if (key.startsWith('&') || key.startsWith('@')) continue;
    if (typeof val === 'object' && val !== null) {
      const resolved = (val as any).xs ?? (val as any).md ?? (val as any).lg;
      if (resolved !== undefined) style[key] = resolved;
      continue;
    }
    if (key === 'bgcolor') style.backgroundColor = val;
    else if (key === 'p') style.padding = typeof val === 'number' ? `${val * 8}px` : val;
    else if (key === 'px') { style.paddingLeft = typeof val === 'number' ? `${val * 8}px` : val; style.paddingRight = typeof val === 'number' ? `${val * 8}px` : val; }
    else if (key === 'py') { style.paddingTop = typeof val === 'number' ? `${val * 8}px` : val; style.paddingBottom = typeof val === 'number' ? `${val * 8}px` : val; }
    else if (key === 'pt') style.paddingTop = typeof val === 'number' ? `${val * 8}px` : val;
    else if (key === 'pb') style.paddingBottom = typeof val === 'number' ? `${val * 8}px` : val;
    else if (key === 'pl') style.paddingLeft = typeof val === 'number' ? `${val * 8}px` : val;
    else if (key === 'pr') style.paddingRight = typeof val === 'number' ? `${val * 8}px` : val;
    else if (key === 'm') style.margin = typeof val === 'number' ? `${val * 8}px` : val;
    else if (key === 'mx') { style.marginLeft = typeof val === 'number' ? `${val * 8}px` : val; style.marginRight = typeof val === 'number' ? `${val * 8}px` : val; }
    else if (key === 'my') { style.marginTop = typeof val === 'number' ? `${val * 8}px` : val; style.marginBottom = typeof val === 'number' ? `${val * 8}px` : val; }
    else if (key === 'mt') style.marginTop = typeof val === 'number' ? `${val * 8}px` : val;
    else if (key === 'mb') style.marginBottom = typeof val === 'number' ? `${val * 8}px` : val;
    else if (key === 'gap') style.gap = typeof val === 'number' ? `${val * 8}px` : val;
    else if (key === 'borderRadius') style.borderRadius = typeof val === 'number' ? `${val * 8}px` : val;
    else style[key] = val;
  }
  return style;
}

function Box({ children, className = '', component: Component = 'div', sx, style, ...props }: any) {
  return (
    <Component className={className} style={{ ...sxToStyle(sx), ...style }} {...props}>
      {children}
    </Component>
  );
}

function Checkbox({ checked, onChange, name, disabled, className = '', sx, style, ...props }: any) {
  return (
    <input
      type="checkbox"
      checked={checked}
      name={name}
      disabled={disabled}
      onChange={onChange}
      className={`w-4 h-4 rounded text-[var(--accent-gold)] focus:ring-[var(--accent-gold)] ${className}`}
      style={{ ...sxToStyle(sx), ...style }}
      {...props}
    />
  );
}

function FormControlLabel({ control, label, className = '', sx, style }: any) {
  return (
    <label className={`inline-flex items-center gap-2 cursor-pointer text-xs font-medium text-[var(--text-primary)] ${className}`} style={{ ...sxToStyle(sx), ...style }}>
      {control}
      <span>{label}</span>
    </label>
  );
}

function FormGroup({ children, row, className = '', sx, style }: any) {
  return (
    <div className={`flex ${row ? 'flex-row flex-wrap gap-4' : 'flex-col gap-2'} ${className}`} style={{ ...sxToStyle(sx), ...style }}>
      {children}
    </div>
  );
}

function FormLabel({ children, className = '', sx, style }: any) {
  return (
    <span className={`block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1 ${className}`} style={{ ...sxToStyle(sx), ...style }}>
      {children}
    </span>
  );
}

function IconButton({ children, onClick, disabled, className = '', sx, style, size = 'medium', color, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { sx?: any; size?: any; color?: any }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[rgba(var(--accent-gold-rgb),0.08)] transition-colors disabled:opacity-40 disabled:pointer-events-none ${className}`}
      style={{ ...sxToStyle(sx), ...style }}
      {...props}
    >
      {children}
    </button>
  );
}

function MenuItem({ value, children }: any) {
  return <option value={value}>{children}</option>;
}

function TextField({ label, placeholder, value, onChange, type = 'text', size, select, fullWidth, InputProps, helperText, required, disabled, multiline, minRows, rows, children, className = '', sx, style, ...props }: any) {
  return (
    <div className={`space-y-1.5 ${fullWidth ? 'w-full' : ''} ${className}`} style={{ ...sxToStyle(sx), ...style }}>
      {label && (
        <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
          {label} {required && <span className="text-[var(--error)]">*</span>}
        </label>
      )}
      <div className={`flex items-center rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--text-primary)] focus-within:ring-2 focus-within:ring-[var(--accent-gold)] focus-within:border-transparent transition-all ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
        {InputProps?.startAdornment}
        {select ? (
          <select
            value={value}
            onChange={onChange}
            disabled={disabled}
            className="w-full bg-transparent border-none outline-none text-sm text-[var(--text-primary)]"
            {...props}
          >
            {children}
          </select>
        ) : multiline ? (
          <textarea
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            rows={rows || minRows || 3}
            disabled={disabled}
            className="w-full bg-transparent border-none outline-none resize-none text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]"
            {...props}
          />
        ) : (
          <input
            type={type}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            disabled={disabled}
            className="w-full bg-transparent border-none outline-none text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]"
            {...props}
          />
        )}
        {InputProps?.endAdornment}
      </div>
      {helperText && <p className="text-xs text-[var(--text-secondary)]">{helperText}</p>}
    </div>
  );
}
import { Building2, GitCompareArrows, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import PermissionRoute from '@/components/auth/PermissionRoute';
import { DashboardSurface, DashboardPanel, DashboardGrid } from '@/components/dashboard/DashboardSurface';
import { Breadcrumbs, Button, StatsCard, toast, PageHeader, Modal, ConfirmDialog, Tooltip } from '@/components/design-system';
import { DataTable, Column } from '@/components/ui/DataTable';

interface Company {
  id: string;
  name: string;
  code: string | null;
  companyType: 'SHIPPING' | 'DISPATCH' | 'TRANSIT';
  isDispatch: boolean;
  isShipping: boolean;
  isTransit: boolean;
  email: string | null;
  phone: string | null;
  address: string | null;
  country: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  currentBalance: number;
  totalDebit: number;
  totalCredit: number;
  priceLists?: Array<{
    importedAuctionRateCount: number;
    importedStateRateCount: number;
    sourceFileName: string;
    destinationLabel: string;
    createdAt: string;
  }>;
  _count: {
    ledgerEntries: number;
    priceLists?: number;
  };
}

const emptyForm = { name: '', code: '', email: '', phone: '', address: '', country: '', notes: '', isDispatch: false, isShipping: false, isTransit: false };

export default function CompanyFinancePage() {
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'SHIPPING' | 'DISPATCH' | 'TRANSIT'>('ALL');
  const [openCreate, setOpenCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState(emptyForm);

  // Edit state
  const [openEdit, setOpenEdit] = useState(false);
  const [editCompany, setEditCompany] = useState<Company | null>(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  // Delete state
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Company | null>(null);

  const activeTypeLabel =
    typeFilter === 'ALL'
      ? 'All Companies'
      : typeFilter === 'SHIPPING'
      ? 'Shipping Companies'
      : typeFilter === 'DISPATCH'
      ? 'Dispatch Companies'
      : 'Transit Companies';

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (typeFilter !== 'ALL') params.append('companyType', typeFilter);

      const response = await fetch(`/api/finance/companies?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch companies');
      }

      setCompanies(data.companies || []);
    } catch (error) {
      console.error('Error fetching companies:', error);
      toast.error('Failed to load companies');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchCompanies();
  }, [search, typeFilter]);

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      toast.error('Company name is required');
      return;
    }
    if (!formData.isDispatch && !formData.isShipping && !formData.isTransit) {
      toast.error('Select at least one company type');
      return;
    }

    try {
      setCreating(true);
      // Derive companyType for backward compat (first selected)
      const companyType = formData.isDispatch ? 'DISPATCH' : formData.isShipping ? 'SHIPPING' : 'TRANSIT';
      const response = await fetch('/api/finance/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, companyType }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create company');
      }

      toast.success('Company created');
      setOpenCreate(false);
      setFormData(emptyForm);
      await fetchCompanies();
    } catch (error) {
      console.error('Error creating company:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create company');
    } finally {
      setCreating(false);
    }
  };

  const openEditDialog = (company: Company, event: React.MouseEvent) => {
    event.stopPropagation();
    setEditCompany(company);
    setEditForm({
      name: company.name,
      code: company.code || '',
      isDispatch: company.isDispatch ?? company.companyType === 'DISPATCH',
      isShipping: company.isShipping ?? company.companyType === 'SHIPPING',
      isTransit: company.isTransit ?? company.companyType === 'TRANSIT',
      email: company.email || '',
      phone: company.phone || '',
      address: company.address || '',
      country: company.country || '',
      notes: company.notes || '',
    });
    setOpenEdit(true);
  };

  const handleEdit = async () => {
    if (!editCompany || !editForm.name.trim()) {
      toast.error('Company name is required');
      return;
    }
    if (!editForm.isDispatch && !editForm.isShipping && !editForm.isTransit) {
      toast.error('Select at least one company type');
      return;
    }

    try {
      setSaving(true);
      const companyType = editForm.isDispatch ? 'DISPATCH' : editForm.isShipping ? 'SHIPPING' : 'TRANSIT';
      const response = await fetch(`/api/finance/companies/${editCompany.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editForm.name,
          code: editForm.code || null,
          companyType,
          isDispatch: editForm.isDispatch,
          isShipping: editForm.isShipping,
          isTransit: editForm.isTransit,
          email: editForm.email || null,
          phone: editForm.phone || null,
          address: editForm.address || null,
          country: editForm.country || null,
          notes: editForm.notes || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update company');
      }

      toast.success('Company updated');
      setOpenEdit(false);
      setEditCompany(null);
      await fetchCompanies();
    } catch (error) {
      console.error('Error updating company:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update company');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (company: Company, event: React.MouseEvent) => {
    event.stopPropagation();
    setDeleteTarget(company);
  };

  const confirmDeleteCompany = async () => {
    if (!deleteTarget || deleting) return;
    const company = deleteTarget;

    const hasEntries = company._count.ledgerEntries > 0;

    try {
      setDeleting(company.id);
      const url = hasEntries
        ? `/api/finance/companies/${company.id}?force=true`
        : `/api/finance/companies/${company.id}`;

      const response = await fetch(url, { method: 'DELETE' });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete company');
      }

      toast.success('Company deleted');
      await fetchCompanies();
    } catch (error) {
      console.error('Error deleting company:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete company');
    } finally {
      setDeleting(null);
      setDeleteTarget(null);
    }
  };

  const stats = useMemo(() => {
    // ⚡ Bolt: Consolidated multiple .reduce() iterations into a single O(N) loop
    let totalDebit = 0;
    let totalCredit = 0;
    let netBalance = 0;

    for (const company of companies) {
      totalDebit += company.totalDebit;
      totalCredit += company.totalCredit;
      netBalance += company.currentBalance;
    }

    return {
      companies: companies.length,
      totalDebit,
      totalCredit,
      netBalance,
    };
  }, [companies]);

  const columns = useMemo<Column<Company>[]>(
    () => [
      {
        key: 'name',
        header: 'Company',
        sortable: true,
        render: (_, row) => (
          <Box>
            <Box sx={{ fontWeight: 600 }}>{row.name}</Box>
            <Box sx={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              {row.code || row.email || 'No reference'}
            </Box>
          </Box>
        ),
      },
      {
        key: 'companyType',
        header: 'Type',
        align: 'center',
        render: (_, row) => {
          const roles: string[] = [];
          if (row.isDispatch) roles.push('Dispatch');
          if (row.isShipping) roles.push('Shipping');
          if (row.isTransit) roles.push('Transit');
          return roles.length > 0 ? roles.join(' / ') : row.companyType === 'SHIPPING' ? 'Shipping' : row.companyType === 'DISPATCH' ? 'Dispatch' : 'Transit';
        },
      },
      {
        key: 'phone',
        header: 'Contact',
        render: (_, row) => row.phone || row.email || '-',
      },
      {
        key: 'priceLists',
        header: 'Price List',
        align: 'center',
        render: (_, row) => {
          const activeList = row.priceLists?.[0];
          if (!activeList) return 'Not uploaded';
          const rowCount = activeList.importedAuctionRateCount || activeList.importedStateRateCount;
          return `${rowCount} rows`;
        },
      },
      {
        key: 'totalDebit',
        header: 'Total Debit',
        align: 'right',
        render: (_, row) => formatCurrency(row.totalDebit),
      },
      {
        key: 'totalCredit',
        header: 'Total Credit',
        align: 'right',
        render: (_, row) => formatCurrency(row.totalCredit),
      },
      {
        key: 'currentBalance',
        header: 'Balance',
        align: 'right',
        render: (_, row) => (
          <span style={{ color: row.currentBalance >= 0 ? 'var(--text-primary)' : 'var(--error)', fontWeight: 600 }}>
            {formatCurrency(row.currentBalance)}
          </span>
        ),
      },
      {
        key: '_count',
        header: 'Transactions',
        align: 'center',
        render: (_, row) => row._count.ledgerEntries,
      },
      {
        key: 'actions',
        header: 'Actions',
        align: 'center',
        render: (_, row) => (
          <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center', flexWrap: 'nowrap', whiteSpace: 'nowrap' }} onClick={(e) => e.stopPropagation()}>
            <Tooltip title="Edit company">
              <IconButton
                size="small"
                onClick={(event) => openEditDialog(row, event)}
              >
                <Pencil className="w-4 h-4" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete company">
              <IconButton
                size="small"
                color="error"
                disabled={deleting === row.id}
                onClick={(event) => void handleDelete(row, event)}
              >
                <Trash2 className="w-4 h-4" />
              </IconButton>
            </Tooltip>
          </Box>
        ),
      },
    ],
    []
  );

  return (
    <PermissionRoute permission="finance:manage">
      <DashboardSurface>
        <PageHeader
          showBreadcrumbs
          title="Company Finance Ledgers"
          description="Create and manage ledgers for partner companies"
          actions={
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Button variant="outline" icon={<GitCompareArrows className="w-4 h-4" />} onClick={() => router.push('/dashboard/finance/price-comparison')}>
                Compare Prices
              </Button>
              <Button variant="primary" icon={<Plus className="w-4 h-4" />} onClick={() => setOpenCreate(true)}>
                Add Company
              </Button>
            </Box>
          }
        />

        <DashboardPanel noHeaderBorder>
          <DashboardGrid className="grid-cols-1 md:grid-cols-4 mb-4">
            <StatsCard icon={<Building2 className="w-5 h-5" />} title="Companies" value={stats.companies} variant="default" />
            <StatsCard icon={<Building2 className="w-5 h-5" />} title="Total Debit" value={formatCurrency(stats.totalDebit)} variant="error" />
            <StatsCard icon={<Building2 className="w-5 h-5" />} title="Total Credit" value={formatCurrency(stats.totalCredit)} variant="success" />
            <StatsCard icon={<Building2 className="w-5 h-5" />} title="Net Balance" value={formatCurrency(stats.netBalance)} variant="info" />
          </DashboardGrid>

          <Box sx={{ mb: 2, display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 220px' }, gap: 1.5 }}>
            <TextField
              fullWidth
              size="small"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search company by name, code, email"
              InputProps={{
                startAdornment: <Search className="w-4 h-4 mr-2 text-[var(--text-secondary)]" />,
              }}
            />
            <TextField
              select
              size="small"
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value as 'ALL' | 'SHIPPING' | 'DISPATCH' | 'TRANSIT')}
            >
              <MenuItem value="ALL">All Types</MenuItem>
              <MenuItem value="SHIPPING">Shipping</MenuItem>
              <MenuItem value="DISPATCH">Dispatch</MenuItem>
              <MenuItem value="TRANSIT">Transit</MenuItem>
            </TextField>
          </Box>

          <Box sx={{ mb: 2 }}>
            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                px: 1.25,
                py: 0.5,
                borderRadius: 9999,
                border: '1px solid var(--border)',
                background: 'var(--panel)',
                color: 'var(--text-secondary)',
                fontSize: '0.75rem',
              }}
            >
              Showing:
              <Box component="span" sx={{ ml: 0.75, fontWeight: 700, color: 'var(--text-primary)' }}>
                {activeTypeLabel}
              </Box>
            </Box>
          </Box>

          {loading ? (
            <Box sx={{ py: 3, textAlign: 'center', color: 'var(--text-secondary)' }}>Loading companies...</Box>
          ) : (
            <DataTable
              data={companies}
              columns={columns}
              keyField="id"
              onRowClick={(row) => router.push(`/dashboard/finance/companies/${row.id}`)}
            />
          )}
        </DashboardPanel>

        <Modal
          open={openCreate}
          onClose={() => !creating && setOpenCreate(false)}
          title="Create Company Ledger"
          size="sm"
          contentSx={{ display: 'grid', gap: 2 }}
          actions={
            <>
              <Button variant="outline" onClick={() => setOpenCreate(false)} disabled={creating}>Cancel</Button>
              <Button variant="primary" onClick={handleCreate} disabled={creating}>{creating ? 'Creating...' : 'Create'}</Button>
            </>
          }
        >
            <TextField label="Company Name" value={formData.name} onChange={(event) => setFormData((prev) => ({ ...prev, name: event.target.value }))} required />
            <TextField label="Code" value={formData.code} onChange={(event) => setFormData((prev) => ({ ...prev, code: event.target.value }))} />
            <Box>
              <FormLabel component="legend" sx={{ fontSize: '0.85rem', mb: 0.5 }}>Company Type (select all that apply)</FormLabel>
              <FormGroup row>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.isDispatch}
                      onChange={(e) => setFormData((prev) => ({ ...prev, isDispatch: e.target.checked }))}
                    />
                  }
                  label="Dispatch"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.isShipping}
                      onChange={(e) => setFormData((prev) => ({ ...prev, isShipping: e.target.checked }))}
                    />
                  }
                  label="Shipping"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.isTransit}
                      onChange={(e) => setFormData((prev) => ({ ...prev, isTransit: e.target.checked }))}
                    />
                  }
                  label="Transit"
                />
              </FormGroup>
            </Box>
            <TextField label="Email" value={formData.email} onChange={(event) => setFormData((prev) => ({ ...prev, email: event.target.value }))} />
            <TextField label="Phone" value={formData.phone} onChange={(event) => setFormData((prev) => ({ ...prev, phone: event.target.value }))} />
            <TextField label="Address" value={formData.address} onChange={(event) => setFormData((prev) => ({ ...prev, address: event.target.value }))} />
            <TextField label="Country" value={formData.country} onChange={(event) => setFormData((prev) => ({ ...prev, country: event.target.value }))} />
            <TextField label="Notes" multiline rows={3} value={formData.notes} onChange={(event) => setFormData((prev) => ({ ...prev, notes: event.target.value }))} />
        </Modal>

        <Modal
          open={openEdit}
          onClose={() => !saving && setOpenEdit(false)}
          title="Edit Company"
          size="sm"
          contentSx={{ display: 'grid', gap: 2 }}
          actions={
            <>
              <Button variant="outline" onClick={() => setOpenEdit(false)} disabled={saving}>Cancel</Button>
              <Button variant="primary" onClick={handleEdit} disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</Button>
            </>
          }
        >
            <TextField label="Company Name" value={editForm.name} onChange={(event) => setEditForm((prev) => ({ ...prev, name: event.target.value }))} required />
            <TextField label="Code" value={editForm.code} onChange={(event) => setEditForm((prev) => ({ ...prev, code: event.target.value }))} />
            <Box>
              <FormLabel component="legend" sx={{ fontSize: '0.85rem', mb: 0.5 }}>Company Type (select all that apply)</FormLabel>
              <FormGroup row>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={editForm.isDispatch}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, isDispatch: e.target.checked }))}
                    />
                  }
                  label="Dispatch"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={editForm.isShipping}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, isShipping: e.target.checked }))}
                    />
                  }
                  label="Shipping"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={editForm.isTransit}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, isTransit: e.target.checked }))}
                    />
                  }
                  label="Transit"
                />
              </FormGroup>
            </Box>
            <TextField label="Email" value={editForm.email} onChange={(event) => setEditForm((prev) => ({ ...prev, email: event.target.value }))} />
            <TextField label="Phone" value={editForm.phone} onChange={(event) => setEditForm((prev) => ({ ...prev, phone: event.target.value }))} />
            <TextField label="Address" value={editForm.address} onChange={(event) => setEditForm((prev) => ({ ...prev, address: event.target.value }))} />
            <TextField label="Country" value={editForm.country} onChange={(event) => setEditForm((prev) => ({ ...prev, country: event.target.value }))} />
            <TextField label="Notes" multiline rows={3} value={editForm.notes} onChange={(event) => setEditForm((prev) => ({ ...prev, notes: event.target.value }))} />
        </Modal>

        <ConfirmDialog
          open={deleteTarget !== null}
          onClose={() => setDeleteTarget(null)}
          onConfirm={() => void confirmDeleteCompany()}
          title="Delete Company"
          message={
            deleteTarget && deleteTarget._count.ledgerEntries > 0
              ? `Delete "${deleteTarget.name}" and all ${deleteTarget._count.ledgerEntries} transaction(s)? This cannot be undone.`
              : `Delete company "${deleteTarget?.name}"? This cannot be undone.`
          }
          confirmText="Delete"
          severity="error"
          loading={deleting === deleteTarget?.id}
        />
      </DashboardSurface>
    </PermissionRoute>
  );
}