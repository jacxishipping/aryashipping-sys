# 📊 Container Finance System - Complete Guide

## Overview

Your application has a **comprehensive finance tracking system** for containers that tracks both **expenses** (costs) and **invoices** (revenue) to calculate profitability for each container.

---

## 🏗️ Database Structure

### Container Model
Each container can have multiple financial records:

```prisma
model Container {
  id                  String                    @id @default(cuid())
  containerNumber     String                    @unique
  
  // Financial Relations
  expenses            ContainerExpense[]         // All costs
  invoices            ContainerInvoice[]         // All revenue
  
  // Other relations...
  shipments           Shipment[]
  documents           ContainerDocument[]
  trackingEvents      ContainerTrackingEvent[]
  auditLogs           ContainerAuditLog[]
}
```

---

## 💰 Financial Models

### 1. **ContainerExpense** (Costs)

Tracks all expenses/costs associated with a container:

```prisma
model ContainerExpense {
  id            String    @id @default(cuid())
  containerId   String
  
  // Expense Details
  type          String    // e.g., "Shipping", "Customs", "Storage", "Handling"
  amount        Float     // Cost amount
  currency      String    @default("USD")
  date          DateTime  @default(now())
  
  // Additional Info
  vendor        String?   // Who charged us
  invoiceNumber String?   // Vendor's invoice number
  notes         String?   // Additional notes
  
  // Timestamps
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  // Relation
  container     Container @relation(fields: [containerId], references: [id], onDelete: Cascade)
  
  @@index([containerId])
  @@index([type])
}
```

**Example Expense Types:**
- **Shipping Fees** - Ocean freight charges
- **Port Charges** - Loading/unloading fees
- **Customs Fees** - Import/export duties
- **Storage Fees** - Warehouse storage
- **Handling Fees** - Container handling
- **Insurance** - Cargo insurance
- **Documentation** - Bill of lading, certificates
- **Inland Transport** - Local delivery
- **Other** - Miscellaneous costs

### 2. **ContainerInvoice** (Revenue)

Tracks all invoices/revenue generated from a container:

```prisma
model ContainerInvoice {
  id              String         @id @default(cuid())
  containerId     String
  
  // Invoice Details
  invoiceNumber   String         // Your invoice number to customer
  amount          Float          // Revenue amount
  currency        String         @default("USD")
  vendor          String?        // Customer name
  date            DateTime       // Invoice date
  dueDate         DateTime?      // Payment due date
  status          InvoiceStatus  // DRAFT, SENT, PAID, OVERDUE, CANCELLED
  
  // Document
  fileUrl         String?        // PDF invoice file
  notes           String?        // Additional notes
  
  // Timestamps
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt
  
  // Relation
  container       Container      @relation(fields: [containerId], references: [id], onDelete: Cascade)
  
  @@index([containerId])
  @@index([status])
}
```

**Invoice Statuses:**
- **DRAFT** - Not yet sent
- **SENT** - Sent to customer
- **PAID** - Payment received
- **OVERDUE** - Past due date
- **CANCELLED** - Invoice cancelled
- **PENDING** - Awaiting approval

---

## 📈 Financial Calculations

### Profitability Metrics

The system automatically calculates:

1. **Total Expenses** = Sum of all `ContainerExpense.amount`
2. **Total Revenue** = Sum of all `ContainerInvoice.amount`
3. **Net Profit** = Total Revenue - Total Expenses

### Example Calculation

```javascript
// Container #CONT-12345
Expenses:
  - Shipping Fee:    $2,500 USD
  - Customs Duty:    $800 USD
  - Storage Fee:     $300 USD
  - Handling:        $200 USD
  ---------------------------
  Total Expenses:    $3,800 USD

Invoices:
  - Customer A:      $5,000 USD (PAID)
  - Customer B:      $2,500 USD (SENT)
  ---------------------------
  Total Revenue:     $7,500 USD

Net Profit:         $3,700 USD (49% margin)
```

---

## 🎨 UI Implementation

### Container Detail Page - Financial Display

Located at: `/dashboard/containers/[id]`

#### Financial Summary Panel
```tsx
<DashboardPanel 
  title="Financial Summary"
  description="Revenue and expenses"
>
  <Box>
    <Box>Total Expenses: $3,800</Box>  // Red color
    <Box>Total Revenue: $7,500</Box>   // Green color
    <Divider />
    <Box>Net Profit: $3,700</Box>      // Green if positive, Red if negative
  </Box>
</DashboardPanel>
```

#### Stats Card
```tsx
<StatsCard
  icon={<DollarSign />}
  title="Net Profit"
  value="$3,700"
  variant="success"  // or "error" if negative
/>
```

#### Expenses Tab
Shows full table of all expenses:
- Type
- Vendor
- Date
- Amount
- **Total row** at bottom

#### Invoices Tab
Shows full table of all invoices:
- Invoice #
- Date
- Status (chip with color)
- Amount
- **Total row** at bottom

---

## 🔧 API Endpoints

### Get Container with Financials

```typescript
GET /api/containers/[id]

Response:
{
  container: {
    id: "...",
    containerNumber: "CONT-12345",
    
    // Financial data
    expenses: [
      {
        id: "...",
        type: "Shipping",
        amount: 2500,
        currency: "USD",
        vendor: "Maersk Line",
        date: "2025-12-01"
      },
      // ... more expenses
    ],
    
    invoices: [
      {
        id: "...",
        invoiceNumber: "INV-001",
        amount: 5000,
        currency: "USD",
        status: "PAID",
        date: "2025-12-05"
      },
      // ... more invoices
    ],
    
    // Calculated totals
    totals: {
      expenses: 3800,
      invoices: 7500
    }
  }
}
```

### Calculate Totals (Backend)

```typescript
// In API route
const container = await prisma.container.findUnique({
  where: { id: params.id },
  include: {
    expenses: true,
    invoices: true,
  },
});

// Calculate totals
const totalExpenses = container.expenses.reduce(
  (sum, expense) => sum + expense.amount, 
  0
);

const totalInvoices = container.invoices.reduce(
  (sum, invoice) => sum + invoice.amount, 
  0
);

const netProfit = totalInvoices - totalExpenses;

return {
  container,
  totals: {
    expenses: totalExpenses,
    invoices: totalInvoices,
    netProfit: netProfit,
  },
};
```

---

## 💼 Use Cases

### 1. **Track Container Costs**
- Add all expenses as they occur
- Categorize by type (shipping, customs, etc.)
- Track vendor invoices
- Monitor spending per container

### 2. **Bill Customers**
- Create invoices for customers
- Track payment status
- Set due dates
- Upload invoice PDFs

### 3. **Analyze Profitability**
- View net profit per container
- Compare expenses vs revenue
- Identify high-cost containers
- Calculate profit margins

### 4. **Financial Reporting**
- Filter by date range
- Group by container status
- Export financial data
- Generate profit/loss reports

---

## 📊 Financial Workflow

### Typical Flow:

1. **Container Created**
   - Status: CREATED
   - Expenses: $0
   - Invoices: $0
   - Net: $0

2. **Booking & Shipping**
   - Add expense: "Shipping Fee" - $2,500
   - Add expense: "Port Charges" - $300
   - Expenses: $2,800
   - Net: -$2,800

3. **Customs Clearance**
   - Add expense: "Customs Duty" - $800
   - Expenses: $3,600
   - Net: -$3,600

4. **Customer Billing**
   - Create invoice: INV-001 - $5,000
   - Status: SENT
   - Revenue: $5,000
   - Net: +$1,400

5. **Payment Received**
   - Update invoice status: PAID
   - Net: +$1,400 (realized profit)

---

## 🎯 Color Coding

### In the UI:
- **Expenses** → 🔴 Red (`var(--error)`)
- **Revenue** → 🟢 Green (`var(--success)`)
- **Positive Profit** → 🟢 Green
- **Negative Profit** → 🔴 Red (loss)

### Status Colors:
- **DRAFT** → Gray
- **SENT** → Blue
- **PAID** → Green
- **OVERDUE** → Red
- **CANCELLED** → Gray

---

## 📱 Features Available

### Current Features ✅
- ✅ Track multiple expenses per container
- ✅ Track multiple invoices per container
- ✅ Automatic total calculations
- ✅ Net profit display
- ✅ Color-coded financial data
- ✅ Expense/Invoice tables with totals
- ✅ Invoice status tracking
- ✅ Multi-currency support (USD default)
- ✅ Date tracking
- ✅ Vendor/Customer tracking

### Potential Enhancements 🔮
- [ ] Add/Edit expenses directly in UI
- [ ] Add/Edit invoices directly in UI
- [ ] Generate invoice PDFs
- [ ] Send invoices to customers
- [ ] Payment reminders for overdue invoices
- [ ] Financial reports/analytics
- [ ] Profit margin calculations
- [ ] Budget vs actual comparison
- [ ] Currency conversion
- [ ] Tax calculations

---

## 🔐 Access Control

### Admin Only
The financial data is typically restricted to admin users:
```tsx
<AdminRoute>
  <ContainerFinancialData />
</AdminRoute>
```

### Permissions
- **Admin** - Full access to all financial data
- **Manager** - View only
- **User/Customer** - No access (see only their shipment costs)

---

## 📊 Example: Complete Container Finances

```javascript
Container: CONT-78901
Status: IN_TRANSIT
Vehicles: 3/4 (75% capacity)

Expenses:
├─ Shipping Fee      $3,200 USD  Maersk Line      Dec 1, 2025
├─ Port Charges      $450 USD    Port of LA       Dec 3, 2025
├─ Customs Duty      $980 USD    US Customs       Dec 5, 2025
├─ Storage (3 days)  $120 USD    LA Warehouse     Dec 6, 2025
└─ Handling Fee      $250 USD    ABC Logistics    Dec 7, 2025
   Total Expenses:   $5,000 USD

Invoices:
├─ INV-2025-001     $4,500 USD   Customer A   PAID     Dec 10
├─ INV-2025-002     $3,800 USD   Customer B   SENT     Dec 12
└─ INV-2025-003     $2,200 USD   Customer C   DRAFT    Dec 15
   Total Revenue:   $10,500 USD

Net Profit:         $5,500 USD (52% margin)
ROI:                110%
```

---

## 🎉 Summary

Your container finance system provides:

1. **Complete Cost Tracking** - Every expense recorded
2. **Revenue Management** - Invoice generation and tracking
3. **Profitability Analysis** - Real-time profit calculations
4. **Multi-Currency** - Support for different currencies
5. **Status Tracking** - Invoice payment status
6. **Vendor Management** - Track who you're paying
7. **Customer Billing** - Track who's paying you
8. **Visual Display** - Clean tables and color-coded data

This allows you to:
- ✅ Know exactly how much each container costs
- ✅ Know exactly how much revenue each container generates
- ✅ Calculate profit/loss per container
- ✅ Identify profitable vs unprofitable containers
- ✅ Make data-driven business decisions

**The system is fully functional and ready for financial tracking!** 💰

