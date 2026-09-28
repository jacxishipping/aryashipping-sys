import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Container {
  id: string;
  containerNumber: string;
  trackingNumber: string | null;
  vesselName: string | null;
  voyageNumber: string | null;
  shippingLine: string | null;
  bookingNumber: string | null;
  loadingPort: string | null;
  destinationPort: string | null;
  transshipmentPorts: string[];
  loadingDate: string | null;
  departureDate: string | null;
  estimatedArrival: string | null;
  actualArrival: string | null;
  status: string;
  currentLocation: string | null;
  progress: number;
  maxCapacity: number;
  currentCount: number;
  notes: string | null;
  createdAt: string;
  shipments: any[];
  expenses: any[];
  invoices: any[];
  documents: any[];
  trackingEvents: any[];
  totals: {
    expenses: number;
    invoices: number;
  };
}

const COLORS = {
  primary: '#0EA5E9', // Cyan
  gold: '#C99B2F', // Gold accent
  dark: '#1E293B',
  medium: '#475569',
  light: '#94A3B8',
  success: '#22C55E',
  error: '#EF4444',
  warning: '#F59E0B',
  background: '#F8FAFC',
  border: '#E2E8F0',
};

const formatDate = (date: string | null) => {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

const formatStatus = (status: string) => {
  return status.replace(/_/g, ' ');
};

export const generateContainerPDF = (container: Container) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let yPos = 20;

  // ==================== HEADER ====================
  // Company Logo Area (you can add actual logo later)
  doc.setFillColor(COLORS.dark);
  doc.rect(0, 0, pageWidth, 35, 'F');
  
  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('CONTAINER REPORT', 20, 18);
  
  // Subtitle
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated on ${new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })}`, 20, 28);
  
  yPos = 50;

  // ==================== CONTAINER INFO SECTION ====================
  // Section Header
  doc.setFillColor(COLORS.gold);
  doc.rect(20, yPos - 5, pageWidth - 40, 10, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('CONTAINER INFORMATION', 25, yPos + 2);
  
  yPos += 15;

  // Container Number (Large)
  doc.setTextColor(COLORS.dark);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(container.containerNumber, 20, yPos);
  
  // Status Badge
  const statusText = formatStatus(container.status);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  const statusWidth = doc.getTextWidth(statusText) + 8;
  doc.setFillColor(COLORS.primary);
  doc.roundedRect(pageWidth - 20 - statusWidth, yPos - 6, statusWidth, 8, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.text(statusText, pageWidth - 20 - statusWidth + 4, yPos - 1);
  
  yPos += 10;

  // Progress Bar
  doc.setTextColor(COLORS.medium);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Progress: ${container.progress}%`, 20, yPos);
  
  // Progress bar background
  doc.setFillColor(COLORS.border);
  doc.rect(60, yPos - 4, 130, 5, 'F');
  
  // Progress bar fill
  const progressWidth = (130 * container.progress) / 100;
  doc.setFillColor(COLORS.gold);
  doc.rect(60, yPos - 4, progressWidth, 5, 'F');
  
  yPos += 12;

  // Basic Details Table
  const basicDetails = [
    ['Tracking Number', container.trackingNumber || 'N/A'],
    ['Booking Number', container.bookingNumber || 'N/A'],
    ['Capacity', `${container.currentCount} / ${container.maxCapacity} vehicles`],
    ['Created', formatDate(container.createdAt)],
  ];

  autoTable(doc, {
    startY: yPos,
    head: [],
    body: basicDetails,
    theme: 'plain',
    styles: {
      fontSize: 9,
      cellPadding: 3,
    },
    columnStyles: {
      0: { 
        textColor: COLORS.medium, 
        fontStyle: 'normal',
        cellWidth: 50,
      },
      1: { 
        textColor: COLORS.dark, 
        fontStyle: 'bold',
      },
    },
    margin: { left: 20, right: 20 },
  });

  yPos = (doc as any).lastAutoTable.finalY + 10;

  // ==================== SHIPPING DETAILS ====================
  doc.setFillColor(COLORS.gold);
  doc.rect(20, yPos - 5, pageWidth - 40, 10, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('SHIPPING DETAILS', 25, yPos + 2);
  
  yPos += 12;

  const shippingDetails = [
    ['Vessel Name', container.vesselName || 'N/A'],
    ['Voyage Number', container.voyageNumber || 'N/A'],
    ['Shipping Line', container.shippingLine || 'N/A'],
    ['Loading Port', container.loadingPort || 'N/A'],
    ['Destination Port', container.destinationPort || 'N/A'],
    ['Current Location', container.currentLocation || 'N/A'],
  ];

  autoTable(doc, {
    startY: yPos,
    head: [],
    body: shippingDetails,
    theme: 'plain',
    styles: {
      fontSize: 9,
      cellPadding: 3,
    },
    columnStyles: {
      0: { 
        textColor: COLORS.medium, 
        fontStyle: 'normal',
        cellWidth: 50,
      },
      1: { 
        textColor: COLORS.dark, 
        fontStyle: 'bold',
      },
    },
    margin: { left: 20, right: 20 },
  });

  yPos = (doc as any).lastAutoTable.finalY + 10;

  // ==================== IMPORTANT DATES ====================
  doc.setFillColor(COLORS.gold);
  doc.rect(20, yPos - 5, pageWidth - 40, 10, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('IMPORTANT DATES', 25, yPos + 2);
  
  yPos += 12;

  const dates = [
    ['Loading Date', formatDate(container.loadingDate)],
    ['Departure Date', formatDate(container.departureDate)],
    ['Estimated Arrival', formatDate(container.estimatedArrival)],
    ['Actual Arrival', formatDate(container.actualArrival)],
  ];

  autoTable(doc, {
    startY: yPos,
    head: [],
    body: dates,
    theme: 'plain',
    styles: {
      fontSize: 9,
      cellPadding: 3,
    },
    columnStyles: {
      0: { 
        textColor: COLORS.medium, 
        fontStyle: 'normal',
        cellWidth: 50,
      },
      1: { 
        textColor: COLORS.dark, 
        fontStyle: 'bold',
      },
    },
    margin: { left: 20, right: 20 },
  });

  yPos = (doc as any).lastAutoTable.finalY + 10;

  // Check if new page needed
  if (yPos > pageHeight - 60) {
    doc.addPage();
    yPos = 20;
  }

  // ==================== FINANCIAL SUMMARY ====================
  doc.setFillColor(COLORS.gold);
  doc.rect(20, yPos - 5, pageWidth - 40, 10, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('FINANCIAL SUMMARY', 25, yPos + 2);
  
  yPos += 12;

  const netProfit = container.totals.invoices - container.totals.expenses;
  
  const financials = [
    ['Total Expenses', formatCurrency(container.totals.expenses)],
    ['Total Revenue', formatCurrency(container.totals.invoices)],
    ['Net Profit', formatCurrency(netProfit)],
  ];

  autoTable(doc, {
    startY: yPos,
    head: [],
    body: financials,
    theme: 'plain',
    styles: {
      fontSize: 10,
      cellPadding: 4,
    },
    columnStyles: {
      0: { 
        textColor: COLORS.medium, 
        fontStyle: 'normal',
        cellWidth: 50,
      },
      1: { 
        textColor: netProfit >= 0 ? COLORS.success : COLORS.error,
        fontStyle: 'bold',
        fontSize: 11,
      },
    },
    margin: { left: 20, right: 20 },
  });

  yPos = (doc as any).lastAutoTable.finalY + 10;

  // ==================== ASSIGNED SHIPMENTS ====================
  if (container.shipments.length > 0) {
    if (yPos > pageHeight - 80) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFillColor(COLORS.gold);
    doc.rect(20, yPos - 5, pageWidth - 40, 10, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`ASSIGNED VEHICLES (${container.shipments.length})`, 25, yPos + 2);
    
    yPos += 12;

    const shipmentData = container.shipments.map((s: any) => [
      `${s.vehicleMake || ''} ${s.vehicleModel || ''}`.trim() || 'N/A',
      s.vehicleVIN || 'N/A',
      s.status || 'N/A',
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['Vehicle', 'VIN', 'Status']],
      body: shipmentData,
      theme: 'grid',
      styles: {
        fontSize: 8,
        cellPadding: 3,
      },
      headStyles: {
        fillColor: COLORS.dark,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: COLORS.background,
      },
      margin: { left: 20, right: 20 },
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;
  }

  // ==================== EXPENSES ====================
  if (container.expenses.length > 0) {
    if (yPos > pageHeight - 80) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFillColor(COLORS.gold);
    doc.rect(20, yPos - 5, pageWidth - 40, 10, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`EXPENSES (${container.expenses.length})`, 25, yPos + 2);
    
    yPos += 12;

    const expenseData = container.expenses.map((e: any) => [
      e.type || 'N/A',
      e.vendor || 'N/A',
      formatDate(e.date),
      formatCurrency(e.amount),
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['Type', 'Vendor', 'Date', 'Amount']],
      body: expenseData,
      theme: 'grid',
      styles: {
        fontSize: 8,
        cellPadding: 3,
      },
      headStyles: {
        fillColor: COLORS.dark,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: COLORS.background,
      },
      columnStyles: {
        3: { 
          textColor: COLORS.error,
          fontStyle: 'bold',
        },
      },
      margin: { left: 20, right: 20 },
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;
  }

  // ==================== TRACKING EVENTS ====================
  if (container.trackingEvents && container.trackingEvents.length > 0) {
    if (yPos > pageHeight - 80) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFillColor(COLORS.gold);
    doc.rect(20, yPos - 5, pageWidth - 40, 10, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`TRACKING HISTORY (${container.trackingEvents.length} events)`, 25, yPos + 2);
    
    yPos += 12;

    const trackingData = container.trackingEvents.slice(0, 10).map((e: any) => [
      e.status || 'N/A',
      e.location || 'N/A',
      formatDate(e.eventDate),
      e.completed ? '✓' : '○',
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['Status', 'Location', 'Date', 'Done']],
      body: trackingData,
      theme: 'grid',
      styles: {
        fontSize: 8,
        cellPadding: 3,
      },
      headStyles: {
        fillColor: COLORS.dark,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: COLORS.background,
      },
      columnStyles: {
        3: { 
          halign: 'center',
          textColor: COLORS.success,
          fontStyle: 'bold',
        },
      },
      margin: { left: 20, right: 20 },
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;
  }

  // ==================== NOTES ====================
  if (container.notes) {
    if (yPos > pageHeight - 40) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFillColor(COLORS.gold);
    doc.rect(20, yPos - 5, pageWidth - 40, 10, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('NOTES', 25, yPos + 2);
    
    yPos += 12;

    doc.setTextColor(COLORS.dark);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const splitNotes = doc.splitTextToSize(container.notes, pageWidth - 50);
    doc.text(splitNotes, 25, yPos);
  }

  // ==================== FOOTER ====================
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    
    // Footer line
    doc.setDrawColor(COLORS.border);
    doc.line(20, pageHeight - 20, pageWidth - 20, pageHeight - 20);
    
    // Page number
    doc.setTextColor(COLORS.medium);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Page ${i} of ${pageCount}`,
      pageWidth / 2,
      pageHeight - 12,
      { align: 'center' }
    );
    
    // Footer text
    doc.text(
      'Container Management System - Confidential',
      pageWidth / 2,
      pageHeight - 7,
      { align: 'center' }
    );
  }

  return doc;
};

export const downloadContainerPDF = (container: Container) => {
  const doc = generateContainerPDF(container);
  doc.save(`Container_${container.containerNumber}_${new Date().toISOString().split('T')[0]}.pdf`);
};
