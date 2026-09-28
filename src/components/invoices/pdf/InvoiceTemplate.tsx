import { formatMoney as formatCurrency } from '@/lib/format';
import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';

const INVOICE_LOGO_PATH = `${process.cwd()}/public/main-logo.png`;

// Register a standard font (optional, using standard Helvetica by default)
// Font.register({ family: 'Roboto', src: '...' });

const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 30,
    fontFamily: 'Helvetica',
  },
  // Modern header with gold accent bar
  goldBar: {
    backgroundColor: '#D4AF37',
    height: 8,
    width: '100%',
    marginLeft: -30,
    marginRight: -30,
    marginTop: -30,
    marginBottom: 0,
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingTop: 20,
    paddingBottom: 20,
    marginBottom: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: {
    flexDirection: 'column',
  },
  logo: {
    width: 68,
    height: 68,
    objectFit: 'contain',
  },
  companyName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1C1C1E',
    marginBottom: 2,
  },
  companyTagline: {
    fontSize: 10,
    color: '#5F6368',
  },
  headerRight: {
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#D4AF37',
    marginBottom: 4,
  },
  invoiceNumber: {
    fontSize: 11,
    color: '#5F6368',
    marginBottom: 8,
  },
  statusBadge: {
    padding: '4 10',
    borderRadius: 2,
    backgroundColor: '#5F6368',
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: 'bold',
  },
  separator: {
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E7EB',
    marginBottom: 15,
  },
  billToSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  billToCol: {
    width: '48%',
  },
  detailsCol: {
    width: '48%',
    alignItems: 'flex-end',
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  customerName: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  label: {
    fontSize: 9,
    color: '#5F6368',
    marginBottom: 4,
  },
  value: {
    fontSize: 9,
    color: '#5F6368',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 4,
    gap: 10,
  },
  detailLabel: {
    fontSize: 9,
    color: '#5F6368',
  },
  detailValue: {
    fontSize: 9,
    color: '#1C1C1E',
    fontWeight: 'bold',
  },
  shippingBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 2,
    padding: 10,
    marginTop: 10,
    marginBottom: 15,
  },
  shippingTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#D4AF37',
    marginBottom: 6,
  },
  shippingText: {
    fontSize: 8,
    color: '#5F6368',
  },
  tableDivider: {
    borderBottomWidth: 1,
    borderBottomColor: '#D4AF37',
    marginBottom: 10,
  },
  table: {
    width: '100%',
    marginTop: 5,
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    padding: 6,
    marginBottom: 2,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E7EB',
    padding: 6,
    backgroundColor: '#FFFFFF',
  },
  tableRowAlt: {
    backgroundColor: '#FCFCFD',
  },
  vehicleRow: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    padding: 6,
    marginTop: 4,
  },
  th: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#5F6368',
  },
  td: {
    fontSize: 9,
    color: '#1C1C1E',
  },
  col1: { width: '40%' },
  col2: { width: '15%', textAlign: 'center' },
  col3: { width: '15%', textAlign: 'center' },
  col4: { width: '15%', textAlign: 'right' },
  col5: { width: '15%', textAlign: 'right', fontWeight: 'bold' },
  totalsSection: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 0.5,
    borderTopColor: '#E5E7EB',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 5,
    width: '50%',
    gap: 20,
  },
  totalLabel: {
    fontSize: 10,
    color: '#5F6368',
  },
  totalValue: {
    fontSize: 10,
    color: '#1C1C1E',
    fontWeight: 'bold',
    width: 80,
    textAlign: 'right',
  },
  grandTotalRow: {
    marginTop: 5,
    paddingTop: 5,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  grandTotalLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#1C1C1E',
  },
  grandTotal: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#D4AF37',
  },
  paymentBox: {
    backgroundColor: '#D1FAE5',
    borderRadius: 2,
    padding: 10,
    marginTop: 15,
    marginBottom: 10,
  },
  paymentTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#10B981',
    marginBottom: 6,
  },
  paymentText: {
    fontSize: 9,
    color: '#5F6368',
  },
  notesBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 2,
    padding: 10,
    marginTop: 15,
  },
  notesTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#D4AF37',
    marginBottom: 4,
  },
  notesText: {
    fontSize: 9,
    color: '#5F6368',
    lineHeight: 1.4,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
  },
  footerLine: {
    borderTopWidth: 0.5,
    borderTopColor: '#D4AF37',
    marginBottom: 8,
  },
  footerText: {
    textAlign: 'center',
    fontSize: 8,
    color: '#5F6368',
    marginBottom: 3,
  },
  footerConfidential: {
    textAlign: 'center',
    fontSize: 7,
    color: '#9CA3AF',
  },
});

// Helper types matching the Prisma/App models
interface InvoiceTemplateProps {
  invoice: {
    invoiceNumber: string;
    issueDate: Date | string;
    dueDate: Date | string | null;
    status: string;
    subtotal: number;
    tax: number;
    discount: number;
    total: number;
    notes: string | null;
    user: {
      name: string | null;
      email: string;
      address: string | null;
      city: string | null;
      country: string | null;
      phone: string | null;
    };
    container: {
      containerNumber: string;
      vesselName: string | null;
      loadingPort: string | null;
      destinationPort: string | null;
    };
    lineItems: Array<{
      id: string;
      description: string;
      type: string;
      expenseSource?: string | null;
      quantity: number;
      unitPrice: number;
      amount: number;
    }>;
  };
}

const getLineItemTypeLabel = (type: string, description: string, expenseSource?: string | null): string => {
  const source = expenseSource?.toUpperCase();
  if (source === 'DISPATCH') return 'DISPATCH EXPENSE';
  if (source === 'SHIPMENT') return 'SHIPPING EXPENSE';
  if (source === 'TRANSIT') return 'TRANSIT EXPENSE';

  if (/^dispatch expense/i.test(description)) return 'DISPATCH EXPENSE';
  if (/^(container|shipping) expense/i.test(description)) return 'SHIPPING EXPENSE';
  if (/^transit expense/i.test(description)) return 'TRANSIT EXPENSE';

  if (type === 'DISCOUNT' && /damage/i.test(description)) {
    return 'DAMAGE CREDIT';
  }

  return type.replace('_', ' ');
};

const getInvoiceLineDescription = (lineItem: { description: string; expenseSource?: string | null }) => {
  if (lineItem.expenseSource) {
    return lineItem.description;
  }

  return lineItem.description
    .replace(/^(?:dispatch|transit|container|shipping) expense(?: allocation)?\s*-\s*/i, '')
    .replace(/\s+-\s+[^-]+?\s+for\s+.*$/i, '')
    .replace(/\s+for\s+.*$/i, '')
    .trim();
};

const formatDate = (date: Date | string | null) => {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const InvoiceTemplate: React.FC<InvoiceTemplateProps> = ({ invoice }) => {
  // Determine status color using design system
  const statusColor = 
    invoice.status === 'PAID' ? '#10B981' :     // success
    invoice.status === 'OVERDUE' ? '#EF4444' :  // error
    invoice.status === 'SENT' ? '#3B82F6' :     // info
    invoice.status === 'PENDING' ? '#F59E0B' :  // warning
    '#5F6368';  // textSecondary

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        
        {/* Gold accent bar at top */}
        <View style={styles.goldBar} />
        
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Image src={INVOICE_LOGO_PATH} style={styles.logo} />
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.title}>INVOICE</Text>
            <Text style={styles.invoiceNumber}>#{invoice.invoiceNumber}</Text>
            <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
              <Text style={styles.statusText}>{invoice.status}</Text>
            </View>
          </View>
        </View>

        {/* Separator */}
        <View style={styles.separator} />

        {/* Bill To & Details */}
        <View style={styles.billToSection}>
          <View style={styles.billToCol}>
            <Text style={styles.sectionTitle}>BILL TO</Text>
            <Text style={styles.customerName}>{invoice.user.name || 'Valued Customer'}</Text>
            <Text style={styles.value}>{invoice.user.email}</Text>
            {invoice.user.phone && <Text style={styles.value}>{invoice.user.phone}</Text>}
            {invoice.user.address && (
              <Text style={[styles.value, { marginTop: 4 }]}>
                {invoice.user.address}
                {invoice.user.city ? `, ${invoice.user.city}` : ''}
                {invoice.user.country ? `, ${invoice.user.country}` : ''}
              </Text>
            )}
          </View>

          <View style={styles.detailsCol}>
            <Text style={[styles.sectionTitle, { textAlign: 'right' }]}>INVOICE DETAILS</Text>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Invoice Date</Text>
              <Text style={styles.detailValue}>{formatDate(invoice.issueDate)}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Due Date</Text>
              <Text style={styles.detailValue}>{formatDate(invoice.dueDate)}</Text>
            </View>
            <View style={[styles.detailRow, { marginTop: 6 }]}>
              <Text style={styles.detailLabel}>Container #</Text>
              <Text style={styles.detailValue}>{invoice.container.containerNumber}</Text>
            </View>
            {invoice.container.vesselName && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Vessel</Text>
                <Text style={styles.detailValue}>{invoice.container.vesselName}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Shipping Details Box */}
        {(invoice.container.vesselName || invoice.container.loadingPort || invoice.container.destinationPort) && (
          <View style={styles.shippingBox}>
            <Text style={styles.shippingTitle}>SHIPPING DETAILS</Text>
            <Text style={styles.shippingText}>
              {invoice.container.vesselName && `Vessel: ${invoice.container.vesselName}`}
              {invoice.container.loadingPort && ` • From: ${invoice.container.loadingPort}`}
              {invoice.container.destinationPort && ` • To: ${invoice.container.destinationPort}`}
            </Text>
          </View>
        )}

        {/* Table divider */}
        <View style={styles.tableDivider} />

        {/* Line Items Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.th, styles.col1]}>Description</Text>
            <Text style={[styles.th, styles.col2]}>Type</Text>
            <Text style={[styles.th, styles.col3]}>Qty</Text>
            <Text style={[styles.th, styles.col4]}>Price</Text>
            <Text style={[styles.th, styles.col5]}>Amount</Text>
          </View>

          {invoice.lineItems.map((item, index) => (
            <View key={item.id} style={[styles.tableRow, index % 2 === 1 ? styles.tableRowAlt : {}]}>
              <Text style={[styles.td, styles.col1]}>{getInvoiceLineDescription(item)}</Text>
              <Text style={[styles.td, styles.col2]}>{getLineItemTypeLabel(item.type, item.description, item.expenseSource)}</Text>
              <Text style={[styles.td, styles.col3]}>{item.quantity}</Text>
              <Text style={[styles.td, styles.col4]}>{formatCurrency(item.unitPrice)}</Text>
              <Text style={[styles.td, styles.col5]}>{formatCurrency(item.amount)}</Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={styles.totalsSection}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text style={styles.totalValue}>{formatCurrency(invoice.subtotal)}</Text>
          </View>
          {invoice.discount > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Discount</Text>
              <Text style={[styles.totalValue, { color: '#10B981' }]}>-{formatCurrency(invoice.discount)}</Text>
            </View>
          )}
          {invoice.tax > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Tax</Text>
              <Text style={styles.totalValue}>{formatCurrency(invoice.tax)}</Text>
            </View>
          )}
          <View style={[styles.totalRow, styles.grandTotalRow]}>
            <Text style={styles.grandTotalLabel}>TOTAL DUE</Text>
            <Text style={styles.grandTotal}>{formatCurrency(invoice.total)}</Text>
          </View>
        </View>

        {/* Payment Information (if paid) */}
        {invoice.status === 'PAID' && (
          <View style={styles.paymentBox}>
            <Text style={styles.paymentTitle}>PAYMENT RECEIVED</Text>
            <Text style={styles.paymentText}>This invoice has been paid in full.</Text>
          </View>
        )}

        {/* Notes */}
        {invoice.notes && (
          <View style={styles.notesBox}>
            <Text style={styles.notesTitle}>NOTES</Text>
            <Text style={styles.notesText}>{invoice.notes}</Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.footerLine} />
          <Text style={styles.footerText}>
            Thank you for your business with JACXI Shipping
          </Text>
          <Text style={styles.footerConfidential}>
            This invoice is confidential and intended solely for the addressee.
          </Text>
        </View>
      </Page>
    </Document>
  );
};

export default InvoiceTemplate;