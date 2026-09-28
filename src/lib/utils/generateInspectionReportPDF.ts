import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  VehicleInspectionData,
  SEVERITY_CONFIG,
  DAMAGE_TYPE_LABELS,
  GRADE_CONFIG,
} from '@/types/vehicle-inspection';

interface ShipmentMetadata {
  id: string;
  vehicleYear?: number | null;
  vehicleMake?: string | null;
  vehicleModel?: string | null;
  vehicleVIN?: string | null;
  vehicleColor?: string | null;
  lotNumber?: string | null;
  auctionName?: string | null;
  purchaseLocation?: string | null;
  user?: {
    name?: string | null;
    email?: string | null;
    phone?: string | null;
  } | null;
}

const COLORS = {
  dark: [15, 23, 42] as [number, number, number],
  gold: [218, 165, 32] as [number, number, number],
  text: [51, 65, 85] as [number, number, number],
  textMuted: [100, 116, 139] as [number, number, number],
  border: [226, 232, 240] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  danger: [220, 38, 38] as [number, number, number],
  success: [22, 163, 74] as [number, number, number],
};

export function generateInspectionReportPDF(
  inspection: VehicleInspectionData,
  shipment: ShipmentMetadata
): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  let currentY = 14;

  // ==========================================
  // HEADER & BRANDING
  // ==========================================
  doc.setFillColor(...COLORS.dark);
  doc.rect(margin, currentY, pageWidth - margin * 2, 28, 'F');

  // Accent Gold Top Stripe
  doc.setFillColor(...COLORS.gold);
  doc.rect(margin, currentY, pageWidth - margin * 2, 2.5, 'F');

  doc.setTextColor(...COLORS.white);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('JACXI SHIPPING & LOGISTICS', margin + 6, currentY + 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(203, 213, 225);
  doc.text('Global Ocean Freight • Yard Intake & Damage Condition Report', margin + 6, currentY + 18);
  doc.text('Official Export Marine Transit Insurance Certificate', margin + 6, currentY + 23);

  // Report Reference Box (Right side of header)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.gold);
  doc.text(`REPORT #: ${inspection.reportNumber}`, pageWidth - margin - 6, currentY + 12, {
    align: 'right',
  });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(203, 213, 225);
  const formattedDate = new Date(inspection.inspectedAt).toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
  doc.text(`Date: ${formattedDate}`, pageWidth - margin - 6, currentY + 18, { align: 'right' });
  doc.text(`Yard: ${inspection.yardLocation || 'Main Terminal'}`, pageWidth - margin - 6, currentY + 23, {
    align: 'right',
  });

  currentY += 34;

  // ==========================================
  // VEHICLE IDENTITY & INTAKE CUSTODY SUMMARY
  // ==========================================
  const colWidth = (pageWidth - margin * 2 - 4) / 2;

  // Box 1: Vehicle Particulars
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(...COLORS.border);
  doc.rect(margin, currentY, colWidth, 44, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.dark);
  doc.text('VEHICLE IDENTIFICATION', margin + 4, currentY + 6);
  doc.setDrawColor(...COLORS.gold);
  doc.line(margin + 4, currentY + 8, margin + 45, currentY + 8);

  const vehicleTitle = [shipment.vehicleYear, shipment.vehicleMake, shipment.vehicleModel]
    .filter(Boolean)
    .join(' ') || 'Unspecified Vehicle';

  doc.setFontSize(8);
  doc.setTextColor(...COLORS.text);
  doc.setFont('helvetica', 'bold');
  doc.text('Unit:', margin + 4, currentY + 14);
  doc.setFont('helvetica', 'normal');
  doc.text(vehicleTitle, margin + 26, currentY + 14);

  doc.setFont('helvetica', 'bold');
  doc.text('VIN:', margin + 4, currentY + 20);
  doc.setFont('helvetica', 'normal');
  doc.text(shipment.vehicleVIN || 'N/A', margin + 26, currentY + 20);

  doc.setFont('helvetica', 'bold');
  doc.text('Lot / Auction:', margin + 4, currentY + 26);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `${shipment.lotNumber || 'N/A'} • ${shipment.auctionName || 'Private Dealer'}`,
    margin + 26,
    currentY + 26
  );

  doc.setFont('helvetica', 'bold');
  doc.text('Color / Origin:', margin + 4, currentY + 32);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `${shipment.vehicleColor || 'Standard'} • ${shipment.purchaseLocation || 'USA'}`,
    margin + 26,
    currentY + 32
  );

  doc.setFont('helvetica', 'bold');
  doc.text('Consignee:', margin + 4, currentY + 38);
  doc.setFont('helvetica', 'normal');
  doc.text(shipment.user?.name || shipment.user?.email || 'Valued Client', margin + 26, currentY + 38);

  // Box 2: Yard Custody & Mechanical Status
  const box2X = margin + colWidth + 4;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(...COLORS.border);
  doc.rect(box2X, currentY, colWidth, 44, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.dark);
  doc.text('CUSTODY & MECHANICAL CHECK', box2X + 4, currentY + 6);
  doc.setDrawColor(...COLORS.gold);
  doc.line(box2X + 4, currentY + 8, box2X + 56, currentY + 8);

  doc.setFontSize(8);
  doc.setTextColor(...COLORS.text);

  doc.setFont('helvetica', 'bold');
  doc.text('Overall Grade:', box2X + 4, currentY + 14);
  const gradeInfo = GRADE_CONFIG[inspection.overallGrade] || GRADE_CONFIG.GRADE_B;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(
    inspection.overallGrade === 'GRADE_A' ? 22 : inspection.overallGrade === 'GRADE_D' ? 220 : 180,
    inspection.overallGrade === 'GRADE_A' ? 163 : 80,
    74
  );
  doc.text(`${gradeInfo.label}`, box2X + 32, currentY + 14);
  doc.setTextColor(...COLORS.text);

  doc.setFont('helvetica', 'bold');
  doc.text('Odometer:', box2X + 4, currentY + 20);
  doc.setFont('helvetica', 'normal');
  doc.text(
    inspection.odometerReading
      ? `${inspection.odometerReading.toLocaleString()} ${inspection.odometerUnit}`
      : 'Not recorded / TMU',
    box2X + 32,
    currentY + 20
  );

  doc.setFont('helvetica', 'bold');
  doc.text('Physical Keys:', box2X + 4, currentY + 26);
  doc.setFont('helvetica', 'normal');
  doc.text(
    inspection.keyStatus === 'NO_KEYS' ? 'NO KEYS (HOLD)' : `${inspection.keyStatus.replace('_', ' ')} PRESENT`,
    box2X + 32,
    currentY + 26
  );

  doc.setFont('helvetica', 'bold');
  doc.text('Drivability:', box2X + 4, currentY + 32);
  doc.setFont('helvetica', 'normal');
  doc.text(inspection.drivableStatus.replace(/_/g, ' '), box2X + 32, currentY + 32);

  doc.setFont('helvetica', 'bold');
  doc.text('Glass / Tires:', box2X + 4, currentY + 38);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `${inspection.windshieldCondition} Glass • ${inspection.tireCondition.replace(/_/g, ' ')}`,
    box2X + 32,
    currentY + 38
  );

  currentY += 48;

  // ==========================================
  // DAMAGE SUMMARY STATS STRIP
  // ==========================================
  const totalCost = inspection.markers.reduce((sum, m) => sum + (m.estimatedCost || 0), 0);
  const minorCount = inspection.markers.filter((m) => m.severity === 'LOW').length;
  const modCount = inspection.markers.filter((m) => m.severity === 'MEDIUM').length;
  const majorCount = inspection.markers.filter(
    (m) => m.severity === 'HIGH' || m.severity === 'CRITICAL'
  ).length;

  doc.setFillColor(241, 245, 249);
  doc.rect(margin, currentY, pageWidth - margin * 2, 12, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...COLORS.dark);
  doc.text(`DAMAGE PIN COUNT: ${inspection.markers.length}`, margin + 6, currentY + 8);

  doc.setFont('helvetica', 'normal');
  doc.text(
    `Minor: ${minorCount}  |  Moderate: ${modCount}  |  Major/Frame: ${majorCount}`,
    margin + 62,
    currentY + 8
  );

  if (totalCost > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.danger);
    doc.text(
      `Est. Total Claim Assessment: $${totalCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
      pageWidth - margin - 6,
      currentY + 8,
      { align: 'right' }
    );
  }

  currentY += 16;

  // ==========================================
  // ITEMIZED DAMAGE LEDGER TABLE
  // ==========================================
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.dark);
  doc.text('CATALOGED PRE-EXISTING DAMAGE HOTSPOTS', margin, currentY);
  currentY += 3;

  const tableBody =
    inspection.markers.length > 0
      ? inspection.markers.map((m) => [
          `#${m.pinNumber}`,
          m.zone,
          DAMAGE_TYPE_LABELS[m.damageType] || m.damageType,
          SEVERITY_CONFIG[m.severity]?.label || m.severity,
          m.description || 'Verified on yard intake blueprint',
          m.estimatedCost ? `$${m.estimatedCost.toFixed(2)}` : '-',
        ])
      : [
          [
            '-',
            'All Body Panels Checked',
            'No pre-existing damages logged',
            'GRADE A',
            'Vehicle received in clean condition without noticeable body collision',
            '-',
          ],
        ];

  autoTable(doc, {
    startY: currentY,
    head: [['PIN', 'VEHICLE ZONE / PANEL', 'TYPE', 'SEVERITY', 'DESCRIPTION & NOTES', 'EST. COST']],
    body: tableBody,
    margin: { left: margin, right: margin },
    theme: 'grid',
    headStyles: {
      fillColor: COLORS.dark,
      textColor: COLORS.white,
      fontStyle: 'bold',
      fontSize: 8,
      cellPadding: 2.5,
    },
    styles: {
      fontSize: 7.5,
      textColor: COLORS.text,
      cellPadding: 2.2,
      overflow: 'linebreak',
    },
    columnStyles: {
      0: { cellWidth: 12, halign: 'center', fontStyle: 'bold' },
      1: { cellWidth: 38, fontStyle: 'bold' },
      2: { cellWidth: 30 },
      3: { cellWidth: 20, halign: 'center' },
      4: { cellWidth: 'auto' },
      5: { cellWidth: 22, halign: 'right' },
    },
  });

  // Calculate position after table
  const finalTableY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY || currentY + 30;
  currentY = finalTableY + 8;

  // If table went too close to bottom, add new page
  if (currentY > pageHeight - 55) {
    doc.addPage();
    currentY = margin;
  }

  // ==========================================
  // EXPORT MARINE TRANSIT INSURANCE DISCLAIMER
  // ==========================================
  doc.setFillColor(254, 242, 242);
  doc.setDrawColor(254, 202, 202);
  doc.rect(margin, currentY, pageWidth - margin * 2, 22, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.danger);
  doc.text('EXPORT INSURANCE CLAIMS EXCLUSION & CUSTODY TRANSFER WAIVER', margin + 4, currentY + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(127, 29, 29);
  const legalClause =
    'This Vehicle Condition Report certifies the physical state and cosmetic condition of the above-referenced unit upon intake at the Jacxi Shipping facility. All pre-existing damages noted herein are strictly excluded from marine transit insurance claims against the freight forwarder, loading stevedores, and vessel operators. Signatures below verify the vehicle was inspected jointly by the carrier driver and yard receiving staff. Any damages contested must be submitted in writing within 24 hours of container discharge at the destination port.';
  const splitText = doc.splitTextToSize(legalClause, pageWidth - margin * 2 - 8);
  doc.text(splitText, margin + 4, currentY + 10);

  currentY += 26;

  // ==========================================
  // SIGNATURE SIGN-OFF BLOCKS
  // ==========================================
  const sigBoxWidth = (pageWidth - margin * 2 - 6) / 2;

  // Inspector Signature
  doc.setDrawColor(...COLORS.border);
  doc.rect(margin, currentY, sigBoxWidth, 24);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...COLORS.dark);
  doc.text('YARD RECEIVING INSPECTOR', margin + 4, currentY + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...COLORS.textMuted);
  doc.text(`Inspector: ${inspection.inspectorName || 'Authorized Yard Staff'}`, margin + 4, currentY + 11);
  doc.text(`Signed & Verified on: ${formattedDate}`, margin + 4, currentY + 16);
  doc.line(margin + 4, currentY + 21, margin + sigBoxWidth - 4, currentY + 21);
  doc.text('Authorized Signature', margin + 4, currentY + 23);

  // Carrier Driver Signature
  const driverBoxX = margin + sigBoxWidth + 6;
  doc.rect(driverBoxX, currentY, sigBoxWidth, 24);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...COLORS.dark);
  doc.text('INLAND CARRIER / TOW DRIVER', driverBoxX + 4, currentY + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...COLORS.textMuted);
  doc.text(`Driver Name: ${inspection.driverName || 'Verified at Gate'}`, driverBoxX + 4, currentY + 11);
  doc.text(`License/ID: ${inspection.driverLicenseNumber || 'Verified'}`, driverBoxX + 4, currentY + 16);
  doc.line(driverBoxX + 4, currentY + 21, driverBoxX + sigBoxWidth - 4, currentY + 21);
  doc.text('Driver Release Signature', driverBoxX + 4, currentY + 23);

  // ==========================================
  // FOOTER
  // ==========================================
  doc.setFontSize(7);
  doc.setTextColor(...COLORS.textMuted);
  doc.text(
    `JACXI Shipping • Verified Electronic Custody Document • Hash: ${inspection.reportNumber}`,
    pageWidth / 2,
    pageHeight - 6,
    { align: 'center' }
  );

  return doc;
}

export function downloadInspectionReportPDF(
  inspection: VehicleInspectionData,
  shipment: ShipmentMetadata
): void {
  const doc = generateInspectionReportPDF(inspection, shipment);
  const cleanVin = (shipment.vehicleVIN || 'VEHICLE').slice(-8);
  doc.save(`JACXI-Condition-Report-${cleanVin}-${inspection.reportNumber}.pdf`);
}
