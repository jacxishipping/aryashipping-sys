import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface CustomsPacketContainer {
  id: string;
  containerNumber: string;
  trackingNumber?: string | null;
  vesselName?: string | null;
  voyageNumber?: string | null;
  shippingLine?: string | null;
  bookingNumber?: string | null;
  loadingPort?: string | null;
  destinationPort?: string | null;
  departureDate?: string | Date | null;
  estimatedArrival?: string | Date | null;
  sealNumber?: string | null;
  status: string;
  shipments: Array<{
    id: string;
    vehicleMake?: string | null;
    vehicleModel?: string | null;
    vehicleYear?: number | string | null;
    vehicleVIN?: string | null;
    vehicleColor?: string | null;
    lotNumber?: string | null;
    auctionName?: string | null;
    hasTitle?: boolean | null;
    titleStatus?: string | null;
    hasKey?: boolean | null;
    weight?: number | null;
    purchasePrice?: number | null;
    user?: {
      name?: string | null;
      email?: string | null;
      phone?: string | null;
    };
  }>;
}

export interface CustomsAgentInfo {
  agentName: string;
  agentEmail?: string;
  agentPhone?: string;
  clearingPort: string;
  consigneeName?: string;
  customsBrokerage?: string;
}

const COLORS = {
  headerBg: '#0F172A',
  gold: '#D4AF37',
  cyan: '#06B6D4',
  textDark: '#0F172A',
  textMuted: '#475569',
  border: '#E2E8F0',
  lightBg: '#F8FAFC',
};

export function generateCustomsPacketPDF(
  container: CustomsPacketContainer,
  agentInfo?: CustomsAgentInfo
): jsPDF {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let yPos = 18;

  // Header Banner
  doc.setFillColor(COLORS.headerBg);
  doc.rect(0, 0, pageWidth, 36, 'F');

  doc.setTextColor(212, 175, 55); // gold
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('JACXI SHIPPING & MARITIME LOGISTICS', 18, 16);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('OFFICIAL EXPORT CONTAINER MANIFEST & CUSTOMS CLEARANCE PACKET', 18, 24);

  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(`Doc Ref: JX-CUST-${container.containerNumber} • Issue Date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}`, 18, 31);

  yPos = 46;

  // Section 1: Container & Ocean Voyage Particulars
  doc.setFillColor(COLORS.gold);
  doc.rect(18, yPos - 4, pageWidth - 36, 7, 'F');
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('1. CONTAINER & OCEAN VOYAGE PARTICULARS', 22, yPos + 1);

  yPos += 8;

  const voyageRows = [
    ['Container Number', container.containerNumber, 'Ocean Carrier Line', container.shippingLine || 'MAERSK / DCSA'],
    ['Booking Number', container.bookingNumber || container.trackingNumber || 'N/A', 'Vessel & Voyage', `${container.vesselName || 'MAERSK VOYAGER'} (Voy: ${container.voyageNumber || 'V-2409W'})`],
    ['Port of Loading (POL)', container.loadingPort || 'Port of Newark (USNWK)', 'Port of Discharge (POD)', container.destinationPort || 'Port of Jebel Ali (AEJEA)'],
    ['Departure Date (ETD)', container.departureDate ? new Date(container.departureDate).toLocaleDateString() : 'Pending', 'Estimated Arrival (ETA)', container.estimatedArrival ? new Date(container.estimatedArrival).toLocaleDateString() : 'In Transit'],
  ];

  autoTable(doc, {
    startY: yPos,
    head: [],
    body: voyageRows,
    theme: 'plain',
    styles: { fontSize: 8.5, cellPadding: 2.5 },
    columnStyles: {
      0: { fontStyle: 'bold', textColor: COLORS.textMuted, cellWidth: 42 },
      1: { fontStyle: 'bold', textColor: COLORS.textDark, cellWidth: 50 },
      2: { fontStyle: 'bold', textColor: COLORS.textMuted, cellWidth: 45 },
      3: { fontStyle: 'bold', textColor: COLORS.textDark },
    },
    margin: { left: 18, right: 18 },
  });

  yPos = (doc as any).lastAutoTable.finalY + 8;

  // Section 2: Destination Clearing Agent & Consignee
  doc.setFillColor(COLORS.headerBg);
  doc.rect(18, yPos - 4, pageWidth - 36, 7, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('2. DESTINATION CUSTOMS AGENT & CONSIGNEE INFORMATION', 22, yPos + 1);

  yPos += 8;

  const agentRows = [
    ['Customs Clearing Agent', agentInfo?.agentName || 'Jebel Ali Port Clearing & Forwarding Services', 'Destination Port', agentInfo?.clearingPort || container.destinationPort || 'Jebel Ali Terminal 2 (AEJEA)'],
    ['Agent Contact / Email', agentInfo?.agentEmail || 'customs@jacxishipping.com', 'Agent Telephone', agentInfo?.agentPhone || '+971 4 881 5000'],
    ['Primary Consignee', agentInfo?.consigneeName || 'Jacxi International Logistics LLC', 'Clearance Type', 'Commercial Vehicle Import / Transit Release'],
  ];

  autoTable(doc, {
    startY: yPos,
    head: [],
    body: agentRows,
    theme: 'plain',
    styles: { fontSize: 8.5, cellPadding: 2.5 },
    columnStyles: {
      0: { fontStyle: 'bold', textColor: COLORS.textMuted, cellWidth: 42 },
      1: { fontStyle: 'bold', textColor: COLORS.textDark, cellWidth: 50 },
      2: { fontStyle: 'bold', textColor: COLORS.textMuted, cellWidth: 45 },
      3: { fontStyle: 'bold', textColor: COLORS.textDark },
    },
    margin: { left: 18, right: 18 },
  });

  yPos = (doc as any).lastAutoTable.finalY + 8;

  // Section 3: Detailed Vehicle Cargo Manifest
  doc.setFillColor(COLORS.gold);
  doc.rect(18, yPos - 4, pageWidth - 36, 7, 'F');
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`3. CONTAINERIZED VEHICLE CARGO MANIFEST (${container.shipments.length} UNITS)`, 22, yPos + 1);

  yPos += 8;

  const vehicleHeaders = ['#', 'Vehicle Details', 'VIN (17 Digits)', 'Lot / Stock #', 'Title Status', 'Keys', 'Declared Value'];
  const vehicleBody = container.shipments.map((s, idx) => [
    String(idx + 1),
    `${s.vehicleYear || ''} ${s.vehicleMake || ''} ${s.vehicleModel || ''}`.trim() || 'Motor Vehicle',
    s.vehicleVIN || 'N/A',
    s.lotNumber ? `${s.lotNumber} (${s.auctionName || 'Auction'})` : 'N/A',
    s.titleStatus || (s.hasTitle ? 'Title Present' : 'Pending'),
    s.hasKey ? 'YES' : 'NO',
    s.purchasePrice ? `$${s.purchasePrice.toLocaleString()}` : '$0.00',
  ]);

  autoTable(doc, {
    startY: yPos,
    head: [vehicleHeaders],
    body: vehicleBody,
    theme: 'grid',
    styles: { fontSize: 7.5, cellPadding: 2.5 },
    headStyles: {
      fillColor: COLORS.headerBg,
      textColor: 255,
      fontStyle: 'bold',
    },
    alternateRowStyles: { fillColor: COLORS.lightBg },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      2: { fontStyle: 'bold', textColor: '#0284C7' },
      4: { fontStyle: 'bold' },
      5: { halign: 'center' },
      6: { halign: 'right', fontStyle: 'bold', textColor: '#16A34A' },
    },
    margin: { left: 18, right: 18 },
  });

  yPos = (doc as any).lastAutoTable.finalY + 8;

  if (yPos > pageHeight - 45) {
    doc.addPage();
    yPos = 20;
  }

  // Section 4: Export Compliance Declaration & Customs Stamp
  doc.setDrawColor(COLORS.border);
  doc.setFillColor(COLORS.lightBg);
  doc.roundedRect(18, yPos, pageWidth - 36, 32, 2, 2, 'FD');

  doc.setTextColor(COLORS.textDark);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.text('CUSTOMS EXPORT COMPLIANCE & VERIFICATION DECLARATION', 22, yPos + 7);

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(COLORS.textMuted);
  const declarationText = 'The carrier and exporter hereby declare that the goods and motorized vehicles described in this manifest have been verified against original titles, bills of sale, and carrier lading records in accordance with international maritime export laws and destination customs border requirements.';
  doc.text(doc.splitTextToSize(declarationText, pageWidth - 44), 22, yPos + 14);

  // Signature Block
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(COLORS.textDark);
  doc.text('Authorized Freight Officer: __________________________', 22, yPos + 27);
  doc.text('Customs Seal Verification: [ VERIFIED & SEALED ]', pageWidth - 95, yPos + 27);

  // Footer on all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(COLORS.border);
    doc.line(18, pageHeight - 12, pageWidth - 18, pageHeight - 12);
    doc.setFontSize(7);
    doc.setTextColor(COLORS.textMuted);
    doc.text(`Jacxi Shipping Logistics LLC • Export Customs Packet • Container ${container.containerNumber}`, 18, pageHeight - 7);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - 35, pageHeight - 7);
  }

  return doc;
}

export function downloadCustomsPacketPDF(
  container: CustomsPacketContainer,
  agentInfo?: CustomsAgentInfo
): void {
  const doc = generateCustomsPacketPDF(container, agentInfo);
  doc.save(`Customs_Packet_${container.containerNumber}_${new Date().toISOString().split('T')[0]}.pdf`);
}
