import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Define types
interface LedgerEntry {
  description: string;
  amount: number;
  metadata?: any;
}

interface Shipment {
  id: string;
  vehicleYear: number | null;
  vehicleMake: string | null;
  vehicleModel: string | null;
  vehicleVIN: string | null;
  price: number | null;
  insuranceValue: number | null;
  damageCredit: number | null;
  container?: {
    containerNumber: string;
    vesselName: string | null;
    loadingPort: string | null;
    destinationPort: string | null;
  } | null;
  user: {
    name: string | null;
    email: string;
    phone: string | null;
    address: string | null;
    city: string | null;
    country: string | null;
  };
  containerDamages?: Array<{
    id: string;
    damageType: 'WE_PAY' | 'COMPANY_PAYS';
    amount: number;
    description: string;
    createdAt: string;
  }>;
}

interface ShipmentInvoiceData {
  invoiceNumber: string;
  date: string;
  shipment: Shipment;
  expenses: LedgerEntry[];
}

// Design system colors
const COLORS = {
  dark: [25, 28, 31] as [number, number, number],       // #191C1F
  gold: [218, 165, 32] as [number, number, number],      // #DAA520
  success: [34, 197, 94] as [number, number, number],    // #22C55E
  text: [100, 116, 139] as [number, number, number],     // #64748B
  background: [248, 250, 252] as [number, number, number], // #F8FAFC
  white: [255, 255, 255] as [number, number, number],
};

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

/**
 * Generate and download a PDF receipt for a single shipment
 * 
 * IMPORTANT: This is NOT an official invoice!
 * 
 * This function creates a quick PDF export of shipment details for reference purposes.
 * It is NOT saved to the database and NOT tracked. Use this for:
 * - Quick reference/printing
 * - Informal quotes
 * - Internal documentation
 * - Customer inquiries before official invoicing
 * 
 * For OFFICIAL customer invoices that are tracked, paid, and emailed:
 * - Go to the container page
 * - Click "Generate Invoices" 
 * - This creates UserInvoice records in the database
 * 
 * @param data - Shipment invoice data including shipment details and expenses
 * @returns jsPDF document (auto-downloads)
 */
export const generateShipmentInvoicePDF = (data: ShipmentInvoiceData) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let yPos = 20;

  // Header
  doc.setFillColor(...COLORS.dark);
  doc.rect(0, 0, pageWidth, 45, 'F');
  
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.text('SHIPMENT RECEIPT', 20, 20); // Changed from INVOICE to RECEIPT
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated: ${formatDate(new Date().toISOString())}`, 20, 30);
  doc.text(data.invoiceNumber, 20, 37);
  
  // Add watermark/note that this is not an official invoice
  doc.setFontSize(8);
  doc.setTextColor(200, 200, 200);
  doc.text('For reference only - Not an official invoice', pageWidth - 20, 20, { align: 'right' });

  yPos = 55;

  // Bill To
  doc.setTextColor(...COLORS.dark);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('BILL TO', 20, yPos);
  doc.text('VEHICLE DETAILS', pageWidth / 2 + 10, yPos);
  
  yPos += 8;

  // Customer Info
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(data.shipment.user.name || 'Valued Customer', 20, yPos);
  yPos += 5;
  
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.text);
  doc.text(data.shipment.user.email, 20, yPos);
  yPos += 5;
  if (data.shipment.user.phone) {
    doc.text(data.shipment.user.phone, 20, yPos);
    yPos += 5;
  }
  if (data.shipment.user.address) {
    const addr = [
      data.shipment.user.address, 
      data.shipment.user.city, 
      data.shipment.user.country
    ].filter(Boolean).join(', ');
    doc.text(addr, 20, yPos);
  }

  // Vehicle Details (Right Side)
  let detailsY = 63;
  const labelX = pageWidth / 2 + 10;
  const valueX = pageWidth - 20;

  const addRow = (label: string, value: string) => {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.text);
    doc.text(label + ':', labelX, detailsY);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.dark);
    doc.text(value, valueX, detailsY, { align: 'right' });
    detailsY += 6;
  };

  const vehicleName = `${data.shipment.vehicleYear || ''} ${data.shipment.vehicleMake || ''} ${data.shipment.vehicleModel || ''}`.trim();
  addRow('Vehicle', vehicleName || 'N/A');
  addRow('VIN', data.shipment.vehicleVIN || 'N/A');
  if (data.shipment.container) {
    addRow('Container', data.shipment.container.containerNumber);
  }

  yPos = Math.max(yPos + 10, detailsY + 10);

  // Table Data
  const tableRows: any[] = [];
  let subtotal = 0;

  // 1. Vehicle Price
  if (data.shipment.price && data.shipment.price > 0) {
    tableRows.push(['Vehicle Cost', 'Base Price', '1', formatCurrency(data.shipment.price), formatCurrency(data.shipment.price)]);
    subtotal += data.shipment.price;
  }

  // 2. Insurance
  if (data.shipment.insuranceValue && data.shipment.insuranceValue > 0) {
    tableRows.push(['Insurance', 'Insurance', '1', formatCurrency(data.shipment.insuranceValue), formatCurrency(data.shipment.insuranceValue)]);
    subtotal += data.shipment.insuranceValue;
  }

  // 3. Expenses
  data.expenses.forEach(exp => {
    const amount = exp.amount;
    tableRows.push([exp.description, 'Expense', '1', formatCurrency(amount), formatCurrency(amount)]);
    subtotal += amount;
  });

  // 4. Damage Credit (company-absorbed damage shown as customer deduction)
  if (data.shipment.damageCredit && data.shipment.damageCredit > 0) {
    tableRows.push([
      'Damage Credit (Company Absorbed)',
      'Credit',
      '1',
      formatCurrency(-data.shipment.damageCredit),
      formatCurrency(-data.shipment.damageCredit),
    ]);
    subtotal -= data.shipment.damageCredit;
  }

  // 5. Shipment damage records from container damage tracking
  (data.shipment.containerDamages || []).forEach((damage) => {
    if (damage.damageType === 'WE_PAY') {
      tableRows.push([
        `Damage Compensation - ${damage.description}`,
        'Damage Credit',
        '1',
        formatCurrency(-damage.amount),
        formatCurrency(-damage.amount),
      ]);
      subtotal -= damage.amount;
    } else {
      // Informational only - company pays this damage, not the customer.
      tableRows.push([
        `Damage Note (Company Pays) - ${damage.description}`,
        'Damage Note',
        '1',
        // Show assessed amount for transparency but keep billed amount zero.
        formatCurrency(damage.amount),
        formatCurrency(damage.amount),
      ]);
    }
  });

  // Table
  autoTable(doc, {
    startY: yPos,
    head: [['Description', 'Type', 'Qty', 'Unit Price', 'Amount']],
    body: tableRows,
    foot: [
      ['', '', '', 'TOTAL:', formatCurrency(subtotal)],
    ],
    theme: 'grid',
    headStyles: { fillColor: COLORS.dark, textColor: COLORS.white },
    footStyles: { fillColor: COLORS.background, textColor: COLORS.dark, fontStyle: 'bold' },
    columnStyles: {
        0: { cellWidth: 80 },
        4: { halign: 'right', fontStyle: 'bold' },
        3: { halign: 'right' },
        2: { halign: 'center' },
        1: { halign: 'center' }
    }
  });

  // Footer
  const footerY = pageHeight - 20;
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.text);
  doc.setFont('helvetica', 'normal');
  doc.text('Thank you for your business!', pageWidth / 2, footerY, { align: 'center' });

  return doc;
};

export const downloadShipmentInvoicePDF = (data: ShipmentInvoiceData) => {
  const doc = generateShipmentInvoicePDF(data);
  const fileName = `Invoice_${data.shipment.vehicleVIN || 'Shipment'}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
};
