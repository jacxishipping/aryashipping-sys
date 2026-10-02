"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  FileText, 
  Package, 
  User, 
  Calendar, 
  ExternalLink, 
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
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold tracking-tight text-base sm:text-lg">
              {invoice.invoiceNumber}
            </span>
            <CopyButton value={invoice.invoiceNumber} label="Invoice Number" />
          </div>
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
          <div className="flex items-center justify-between w-full">
            <Button variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
            <div className="flex gap-2">
              <Button
                href={`/dashboard/invoices/${invoice.id}`}
                onClick={onClose}
                variant="primary"
                size="sm"
                icon={<ExternalLink className="w-4 h-4" />}
              >
                Open Full Invoice
              </Button>
            </div>
          </div>
        )
      }
    >
      {loading ? (
        <div className="flex flex-col gap-4">
          <Skeleton variant="rounded" height={90} />
          <Skeleton variant="rounded" height={120} />
          <Skeleton variant="rounded" height={160} />
        </div>
      ) : invoice ? (
        <div className="flex flex-col gap-5">
          {/* Summary Financials Banner */}
          <div className="p-4 rounded-xl bg-[var(--background)] border border-[var(--border)] flex items-center justify-between">
            <div>
              <span className="font-semibold text-xs text-[var(--text-secondary)] uppercase tracking-wider block">
                Total Invoiced Amount
              </span>
              <div className="font-extrabold text-2xl text-[var(--text-primary)] mt-1">
                {formatCurrency(invoice.total || 0)}
              </div>
            </div>
            <StatusBadge status={invoice.status} size="md" />
          </div>

          {/* Key Metadata Cards */}
          <div className="grid grid-cols-2 gap-3">
            {/* Customer */}
            <div className="p-3.5 rounded-xl bg-[var(--background)] border border-[var(--border)]">
              <div className="flex items-center gap-2 text-[var(--text-secondary)] mb-1">
                <User className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-semibold">Billed To</span>
              </div>
              <div className="font-bold text-sm text-[var(--text-primary)] truncate">
                {invoice.user?.name || invoice.user?.email || 'Client'}
              </div>
            </div>

            {/* Due Date */}
            <div className="p-3.5 rounded-xl bg-[var(--background)] border border-[var(--border)]">
              <div className="flex items-center gap-2 text-[var(--text-secondary)] mb-1">
                <Calendar className="w-4 h-4 text-amber-600" />
                <span className="text-xs font-semibold">Payment Due</span>
              </div>
              <div className="font-bold text-sm text-[var(--text-primary)] truncate">
                {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : 'Upon Receipt'}
              </div>
            </div>

            {/* Linked Container */}
            {invoice.container && (
              <div className="p-3.5 rounded-xl bg-[var(--background)] border border-[var(--border)]">
                <div className="flex items-center gap-2 text-[var(--text-secondary)] mb-1">
                  <Package className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-semibold">Container</span>
                </div>
                <Link
                  href={`/dashboard/containers/${invoice.container.id}`}
                  onClick={onClose}
                  className="font-bold text-sm text-[var(--accent-gold)] font-mono truncate block no-underline hover:underline"
                >
                  {invoice.container.containerNumber}
                </Link>
              </div>
            )}

            {/* Linked Shipment */}
            {invoice.shipment && (
              <div className="p-3.5 rounded-xl bg-[var(--background)] border border-[var(--border)]">
                <div className="flex items-center gap-2 text-[var(--text-secondary)] mb-1">
                  <FileText className="w-4 h-4 text-purple-600" />
                  <span className="text-xs font-semibold">Cargo Vehicle</span>
                </div>
                <Link
                  href={`/dashboard/shipments/${invoice.shipment.id}`}
                  onClick={onClose}
                  className="font-bold text-sm text-[var(--accent-gold)] truncate block no-underline hover:underline"
                >
                  {[invoice.shipment.vehicleYear, invoice.shipment.vehicleMake, invoice.shipment.vehicleModel].filter(Boolean).join(' ') || 'Vehicle'}
                </Link>
              </div>
            )}
          </div>

          {/* Line Items List */}
          <div className="flex flex-col gap-3">
            <span className="text-sm font-bold text-[var(--text-primary)]">
              Itemized Line Items ({invoice.items?.length || 0})
            </span>

            {invoice.items && invoice.items.length > 0 ? (
              <div className="border border-[var(--border)] rounded-xl overflow-hidden bg-[var(--panel)]">
                <div className="grid grid-cols-12 bg-[var(--background)] px-3.5 py-2 text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] border-b border-[var(--border)]">
                  <div className="col-span-7">Description</div>
                  <div className="col-span-2 text-center">Qty</div>
                  <div className="col-span-3 text-right">Amount</div>
                </div>
                <div className="divide-y divide-[var(--border)] max-h-56 overflow-y-auto">
                  {invoice.items.map((item) => (
                    <div key={item.id} className="grid grid-cols-12 items-center px-3.5 py-2.5 text-xs">
                      <div className="col-span-7 font-medium text-[var(--text-primary)] truncate">
                        {item.description}
                      </div>
                      <div className="col-span-2 text-center text-[var(--text-secondary)]">
                        {item.quantity}
                      </div>
                      <div className="col-span-3 text-right font-semibold text-[var(--text-primary)]">
                        {formatCurrency(item.total)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-4 border border-dashed border-[var(--border)] rounded-xl text-center text-[var(--text-secondary)] text-sm">
                No individual line items specified.
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="text-sm text-[var(--text-secondary)] text-center py-8">
          No invoice selected.
        </div>
      )}
    </Drawer>
  );
}
