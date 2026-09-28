"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Box, Typography, Divider } from '@mui/material';
import { 
  FileText, 
  Package, 
  User, 
  Calendar, 
  DollarSign, 
  ExternalLink, 
  Download,
  CreditCard,
  Building2,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { 
  Drawer, 
  StatusBadge, 
  Button, 
  CopyButton, 
  Skeleton
} from '@/components/design-system';
import { formatMoney as formatCurrency } from '@/lib/format';

interface InvoiceQuickPeekProps {
  invoiceId: string | null;
  open: boolean;
  onClose: () => void;
}

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  expenseSource?: string;
}

interface InvoiceDetail {
  id: string;
  invoiceNumber: string;
  status: string;
  issueDate: string;
  dueDate: string | null;
  total: number;
  paidAmount?: number;
  user?: {
    id?: string;
    name: string | null;
    email: string;
  };
  container?: {
    id: string;
    containerNumber: string;
  } | null;
  shipment?: {
    id: string;
    vehicleVIN?: string | null;
    vehicleYear?: number | null;
    vehicleMake?: string | null;
    vehicleModel?: string | null;
  } | null;
  items?: InvoiceItem[];
}

export default function InvoiceQuickPeek({
  invoiceId,
  open,
  onClose,
}: InvoiceQuickPeekProps) {
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !invoiceId) {
      setInvoice(null);
      return;
    }

    let cancelled = false;
    setLoading(true);

    async function fetchDetails() {
      try {
        const res = await fetch(`/api/invoices/${invoiceId}`);
        if (!res.ok) throw new Error('Failed to load invoice');
        const data = await res.json();
        if (!cancelled) {
          setInvoice(data.invoice || data);
        }
      } catch (err) {
        console.error('Error loading invoice quick peek:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchDetails();

    return () => {
      cancelled = true;
    };
  }, [open, invoiceId]);

  return (
    <Drawer
      open={open}
      onClose={onClose}
      size="lg"
      title={
        invoice ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <span className="font-mono font-bold tracking-tight text-base sm:text-lg">
              {invoice.invoiceNumber}
            </span>
            <CopyButton value={invoice.invoiceNumber} label="Invoice Number" />
          </Box>
        ) : (
          'Invoice Details'
        )
      }
      description={
        invoice?.issueDate
          ? `Issued on ${new Date(invoice.issueDate).toLocaleDateString()}`
          : undefined
      }
      badge={invoice ? <StatusBadge status={invoice.status} /> : undefined}
      actions={
        invoice && (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <Button variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                href={`/dashboard/invoices/${invoice.id}`}
                onClick={onClose}
                variant="primary"
                size="sm"
                icon={<ExternalLink className="w-4 h-4" />}
              >
                Open Full Invoice
              </Button>
            </Box>
          </Box>
        )
      }
    >
      {loading ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Skeleton variant="rounded" height={90} />
          <Skeleton variant="rounded" height={120} />
          <Skeleton variant="rounded" height={160} />
        </Box>
      ) : invoice ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          {/* Summary Financials Banner */}
          <Box
            sx={{
              p: 2.5,
              borderRadius: 2,
              bgcolor: 'var(--background, #F9FAFB)',
              border: '1px solid var(--border, #E5E7EB)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <Typography variant="caption" sx={{ fontWeight: 600, color: 'var(--text-secondary, #6B7280)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Total Invoiced Amount
              </Typography>
              <Typography sx={{ fontWeight: 800, fontSize: '1.5rem', color: 'var(--text-primary, #111827)', mt: 0.25 }}>
                {formatCurrency(invoice.total || 0)}
              </Typography>
            </div>
            <StatusBadge status={invoice.status} size="md" />
          </Box>

          {/* Key Metadata Cards */}
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1.5 }}>
            {/* Customer */}
            <Box sx={{ p: 2, borderRadius: 2, bgcolor: 'var(--background, #F9FAFB)', border: '1px solid var(--border, #E5E7EB)' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'var(--text-secondary, #6B7280)', mb: 0.5 }}>
                <User className="w-4 h-4 text-blue-600" />
                <Typography variant="caption" sx={{ fontWeight: 600 }}>Billed To</Typography>
              </Box>
              <Typography sx={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary, #111827)' }} noWrap>
                {invoice.user?.name || invoice.user?.email || 'Client'}
              </Typography>
            </Box>

            {/* Due Date */}
            <Box sx={{ p: 2, borderRadius: 2, bgcolor: 'var(--background, #F9FAFB)', border: '1px solid var(--border, #E5E7EB)' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'var(--text-secondary, #6B7280)', mb: 0.5 }}>
                <Calendar className="w-4 h-4 text-amber-600" />
                <Typography variant="caption" sx={{ fontWeight: 600 }}>Payment Due</Typography>
              </Box>
              <Typography sx={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary, #111827)' }} noWrap>
                {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : 'Upon Receipt'}
              </Typography>
            </Box>

            {/* Linked Container */}
            {invoice.container && (
              <Box sx={{ p: 2, borderRadius: 2, bgcolor: 'var(--background, #F9FAFB)', border: '1px solid var(--border, #E5E7EB)' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'var(--text-secondary, #6B7280)', mb: 0.5 }}>
                  <Package className="w-4 h-4 text-emerald-600" />
                  <Typography variant="caption" sx={{ fontWeight: 600 }}>Container</Typography>
                </Box>
                <Link
                  href={`/dashboard/containers/${invoice.container.id}`}
                  onClick={onClose}
                  style={{ textDecoration: 'none' }}
                >
                  <Typography sx={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--accent-gold, #D4AF37)', fontFamily: 'monospace' }} noWrap>
                    {invoice.container.containerNumber}
                  </Typography>
                </Link>
              </Box>
            )}

            {/* Linked Shipment */}
            {invoice.shipment && (
              <Box sx={{ p: 2, borderRadius: 2, bgcolor: 'var(--background, #F9FAFB)', border: '1px solid var(--border, #E5E7EB)' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'var(--text-secondary, #6B7280)', mb: 0.5 }}>
                  <FileText className="w-4 h-4 text-purple-600" />
                  <Typography variant="caption" sx={{ fontWeight: 600 }}>Cargo Vehicle</Typography>
                </Box>
                <Link
                  href={`/dashboard/shipments/${invoice.shipment.id}`}
                  onClick={onClose}
                  style={{ textDecoration: 'none' }}
                >
                  <Typography sx={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--accent-gold, #D4AF37)' }} noWrap>
                    {[invoice.shipment.vehicleYear, invoice.shipment.vehicleMake, invoice.shipment.vehicleModel].filter(Boolean).join(' ') || 'Vehicle'}
                  </Typography>
                </Link>
              </Box>
            )}
          </Box>

          {/* Line Items List */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Typography sx={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary, #111827)' }}>
              Itemized Line Items ({invoice.items?.length || 0})
            </Typography>

            {invoice.items && invoice.items.length > 0 ? (
              <Box sx={{ border: '1px solid var(--border, #E5E7EB)', borderRadius: 2, overflow: 'hidden', bgcolor: 'var(--panel-bg, #FFFFFF)' }}>
                <div className="grid grid-cols-12 bg-[var(--background,#F9FAFB)] px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary,#6B7280)] border-b border-[var(--border,#E5E7EB)]">
                  <div className="col-span-7">Description</div>
                  <div className="col-span-2 text-center">Qty</div>
                  <div className="col-span-3 text-right">Amount</div>
                </div>
                <div className="divide-y divide-[var(--border,#E5E7EB)] max-h-[220px] overflow-y-auto">
                  {invoice.items.map((item) => (
                    <div key={item.id} className="grid grid-cols-12 items-center px-3 py-2 text-xs">
                      <div className="col-span-7 font-medium text-[var(--text-primary,#111827)] truncate">
                        {item.description}
                      </div>
                      <div className="col-span-2 text-center text-[var(--text-secondary)]">
                        {item.quantity}
                      </div>
                      <div className="col-span-3 text-right font-semibold text-[var(--text-primary,#111827)]">
                        {formatCurrency(item.total)}
                      </div>
                    </div>
                  ))}
                </div>
              </Box>
            ) : (
              <Box sx={{ p: 3, border: '1px dashed var(--border, #E5E7EB)', borderRadius: 2, textAlign: 'center', color: 'var(--text-secondary, #6B7280)' }}>
                <Typography variant="body2">No individual line items specified.</Typography>
              </Box>
            )}
          </Box>
        </Box>
      ) : (
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
          No invoice selected.
        </Typography>
      )}
    </Drawer>
  );
}
