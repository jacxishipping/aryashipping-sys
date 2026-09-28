import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type CustomerStatementPayload = {
  customer: {
    name: string | null;
    email: string;
    phone: string | null;
  };
  summary: {
    outstandingAmount: number;
    overdueAmount: number;
    paidAmount: number;
    creditAmount: number;
    openInvoiceCount: number;
    overdueInvoiceCount: number;
    paidInvoiceCount: number;
    availableCredit: number;
    accountBalance: number;
  };
  collections: {
    status: string;
    promiseToPayDate: string | null;
    followUpDate: string | null;
    notes: string | null;
  };
  aging: {
    current: { count: number; amount: number };
    days1to30: { count: number; amount: number };
    days31to60: { count: number; amount: number };
    days61to90: { count: number; amount: number };
    days90plus: { count: number; amount: number };
  };
  timeline: Array<{
    invoiceNumber: string;
    kind: string;
    status: string;
    issueDate: string;
    dueDate: string | null;
    paidDate: string | null;
    total: number;
    reference: string | null;
    daysOverdue: number | null;
    paymentMethod: string | null;
  }>;
  generatedAt: string;
};

const formatMoney = (amount: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);

const formatDate = (value: string | null) => {
  if (!value) {
    return '-';
  }

  return new Date(value).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const formatLabel = (value: string) => value.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());

export function downloadCustomerStatementPDF(statement: CustomerStatementPayload) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFillColor(212, 175, 55);
  doc.rect(0, 0, pageWidth, 10, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('Customer Statement', 14, 24);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(statement.customer.name || statement.customer.email, 14, 32);
  doc.text(statement.customer.email, 14, 38);
  if (statement.customer.phone) {
    doc.text(statement.customer.phone, 14, 44);
  }
  doc.text(`Generated ${formatDate(statement.generatedAt)}`, pageWidth - 14, 32, { align: 'right' });

  autoTable(doc, {
    startY: 52,
    theme: 'grid',
    styles: { fontSize: 9 },
    head: [['Metric', 'Value']],
    body: [
      ['Outstanding AR', formatMoney(statement.summary.outstandingAmount)],
      ['Overdue', formatMoney(statement.summary.overdueAmount)],
      ['Paid', formatMoney(statement.summary.paidAmount)],
      ['Available Credit', formatMoney(statement.summary.availableCredit)],
      ['Ledger Balance', formatMoney(statement.summary.accountBalance)],
      ['Collections Status', formatLabel(statement.collections.status)],
      ['Promise To Pay', formatDate(statement.collections.promiseToPayDate)],
      ['Follow-Up Date', formatDate(statement.collections.followUpDate)],
    ],
  });

  const firstSectionEnd = (doc as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY || 90;

  autoTable(doc, {
    startY: firstSectionEnd + 8,
    theme: 'grid',
    styles: { fontSize: 8 },
    head: [['Aging Bucket', 'Invoices', 'Amount']],
    body: [
      ['Current', String(statement.aging.current.count), formatMoney(statement.aging.current.amount)],
      ['1-30 Days', String(statement.aging.days1to30.count), formatMoney(statement.aging.days1to30.amount)],
      ['31-60 Days', String(statement.aging.days31to60.count), formatMoney(statement.aging.days31to60.amount)],
      ['61-90 Days', String(statement.aging.days61to90.count), formatMoney(statement.aging.days61to90.amount)],
      ['90+ Days', String(statement.aging.days90plus.count), formatMoney(statement.aging.days90plus.amount)],
    ],
  });

  const secondSectionEnd = (doc as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY || firstSectionEnd + 50;

  autoTable(doc, {
    startY: secondSectionEnd + 8,
    theme: 'grid',
    styles: { fontSize: 7, cellPadding: 2 },
    head: [['Invoice', 'Kind', 'Status', 'Issue', 'Due', 'Amount', 'Reference']],
    body: statement.timeline.map((invoice) => [
      invoice.invoiceNumber,
      formatLabel(invoice.kind),
      formatLabel(invoice.status),
      formatDate(invoice.issueDate),
      formatDate(invoice.dueDate),
      formatMoney(invoice.total),
      invoice.reference || 'General billing',
    ]),
  });

  if (statement.collections.notes) {
    const startY = ((doc as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY || 0) + 10;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Collections Notes', 14, startY);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const notes = doc.splitTextToSize(statement.collections.notes, pageWidth - 28);
    doc.text(notes, 14, startY + 6);
  }

  const safeName = (statement.customer.name || statement.customer.email || 'customer').replace(/[^a-z0-9]+/gi, '-').toLowerCase();
  doc.save(`${safeName}-statement.pdf`);
}