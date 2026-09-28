import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type ReleaseTokenShipment = {
  id: string;
  serviceType?: string;
  vehicleType: string;
  vehicleMake: string | null;
  vehicleModel: string | null;
  vehicleYear: number | null;
  vehicleVIN: string | null;
  vehicleColor: string | null;
  lotNumber: string | null;
  auctionName: string | null;
  hasKey: boolean | null;
  hasTitle: boolean | null;
  titleStatus: string | null;
  price: number | null;
  insuranceValue: number | null;
  paymentStatus: string;
  paymentMode: string | null;
  releaseToken: string | null;
  releaseTokenCreatedAt: string | null;
  container: {
    containerNumber: string;
    loadingPort: string | null;
    destinationPort: string | null;
  } | null;
  user: {
    name: string | null;
    email: string;
    phone: string | null;
    address?: string | null;
    city?: string | null;
    country?: string | null;
  };
};

const COLORS = {
  dark: [25, 28, 31] as [number, number, number],
  gold: [218, 165, 32] as [number, number, number],
  text: [100, 116, 139] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  success: [34, 197, 94] as [number, number, number],
  error: [239, 68, 68] as [number, number, number],
};

const COMPANY = {
  name: 'JACXI Shipping',
  addressLine: 'Dubai, UAE',
  contactLine: 'support@jacxi.com | +971-XX-XXXXXXX',
};

const formatDate = (value: string | null) => {
  if (!value) return 'N/A';
  return new Date(value).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const formatCurrency = (amount: number | null) => {
  if (amount == null) return 'N/A';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
};

export const downloadReleaseTokenPDF = (shipment: ReleaseTokenShipment) => {
  if (!shipment.releaseToken) {
    throw new Error('Release token is missing');
  }

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let yPos = 18;

  doc.setFillColor(...COLORS.dark);
  doc.rect(0, 0, pageWidth, 46, 'F');

  // Logo area (text-based mark to keep PDF self-contained)
  doc.setFillColor(...COLORS.gold);
  doc.circle(18, 16, 7.5, 'F');
  doc.setTextColor(...COLORS.dark);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('J', 18, 18.5, { align: 'center' });

  doc.setTextColor(...COLORS.white);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('RELEASE TOKEN', 30, 14.5);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(COMPANY.name, 30, 21);
  doc.text(COMPANY.addressLine, 30, 26);
  doc.text(COMPANY.contactLine, 30, 31);

  doc.setFontSize(10);
  doc.text(`Token: ${shipment.releaseToken}`, 14, 40);
  doc.text(`Issued: ${formatDate(shipment.releaseTokenCreatedAt || new Date().toISOString())}`, 14, 45);

  const isPaid = shipment.paymentStatus === 'COMPLETED';
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...(isPaid ? COLORS.success : COLORS.error));
  doc.text(isPaid ? 'PAYMENT: PAID' : 'PAYMENT: NOT PAID', pageWidth - 14, 40, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.text);
  doc.text(`Status: ${shipment.paymentStatus}`, pageWidth - 14, 45, { align: 'right' });

  yPos = 58;

  doc.setTextColor(...COLORS.dark);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Customer Information', 14, yPos);
  yPos += 6;

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.text);
  const customerAddress = [shipment.user.address, shipment.user.city, shipment.user.country].filter(Boolean).join(', ');
  doc.text(`Name: ${shipment.user.name || 'N/A'}`, 14, yPos);
  yPos += 5;
  doc.text(`Email: ${shipment.user.email || 'N/A'}`, 14, yPos);
  yPos += 5;
  doc.text(`Phone: ${shipment.user.phone || 'N/A'}`, 14, yPos);
  yPos += 5;
  doc.text(`Address: ${customerAddress || 'N/A'}`, 14, yPos);

  yPos += 10;

  const vehicleLabel = `${shipment.vehicleYear || ''} ${shipment.vehicleMake || ''} ${shipment.vehicleModel || ''}`.trim() || 'N/A';

  autoTable(doc, {
    startY: yPos,
    head: [['Field', 'Value']],
    body: [
      ['Shipment ID', shipment.id],
      ['Service Type', shipment.serviceType || 'N/A'],
      ['Vehicle', vehicleLabel],
      ['Vehicle Type', shipment.vehicleType || 'N/A'],
      ['VIN', shipment.vehicleVIN || 'N/A'],
      ['Color', shipment.vehicleColor || 'N/A'],
      ['Lot Number', shipment.lotNumber || 'N/A'],
      ['Auction', shipment.auctionName || 'N/A'],
      ['Has Key', shipment.hasKey == null ? 'N/A' : shipment.hasKey ? 'Yes' : 'No'],
      ['Has Title', shipment.hasTitle == null ? 'N/A' : shipment.hasTitle ? 'Yes' : 'No'],
      ['Title Status', shipment.titleStatus || 'N/A'],
      ['Container', shipment.container?.containerNumber || 'N/A'],
      ['Route', `${shipment.container?.loadingPort || 'N/A'} -> ${shipment.container?.destinationPort || 'N/A'}`],
      ['Shipping Price', formatCurrency(shipment.price)],
      ['Insurance Value', formatCurrency(shipment.insuranceValue)],
      ['Payment Mode', shipment.paymentMode || 'N/A'],
      ['Payment Status', shipment.paymentStatus],
    ],
    theme: 'grid',
    headStyles: { fillColor: COLORS.dark, textColor: COLORS.white },
    columnStyles: {
      0: { cellWidth: 58, fontStyle: 'bold' },
      1: { cellWidth: 'auto' },
    },
    styles: {
      fontSize: 9,
      textColor: COLORS.dark,
    },
  });

  // Signature section
  const finalY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || yPos;
  let signatureY = finalY + 20;

  if (signatureY > pageHeight - 40) {
    doc.addPage();
    signatureY = 30;
  }

  doc.setDrawColor(...COLORS.text);
  doc.setLineWidth(0.2);
  doc.line(20, signatureY, 85, signatureY);
  doc.line(pageWidth - 85, signatureY, pageWidth - 20, signatureY);

  doc.setTextColor(...COLORS.text);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Authorized Signature', 20, signatureY + 5);
  doc.text('Customer Signature', pageWidth - 85, signatureY + 5);

  doc.setTextColor(...COLORS.dark);
  doc.setFont('helvetica', 'bold');
  doc.text(`Payment Status: ${isPaid ? 'PAID' : 'NOT PAID'}`, 20, signatureY + 14);
  doc.text(`Printed: ${formatDate(new Date().toISOString())}`, pageWidth - 20, signatureY + 14, { align: 'right' });

  const fileName = `Release-Token-${shipment.vehicleVIN || shipment.id}.pdf`;
  doc.save(fileName);
};
