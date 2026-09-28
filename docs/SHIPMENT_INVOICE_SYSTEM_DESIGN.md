# Shipment Invoice System - Design & Implementation Plan

## 🎯 **Business Requirements**

### **The Challenge:**
- Multiple users have vehicles in the same container
- Each vehicle has different price and insurance
- Container expenses (shipping, customs, storage) need to be shared
- Need fair way to divide costs among users
- Users need professional invoices

### **The Solution:**
Smart invoice system that:
1. **Groups user's shipments** by container
2. **Calculates shared expenses** fairly
3. **Generates professional invoices** automatically or manually
4. **Allows user self-service** to view/download
5. **Tracks payment status**

---

## 💡 **Recommended Approach**

### **Invoice Calculation Logic:**

```
For User A with 2 vehicles in a 4-vehicle container:

Container Expenses: $1,000 (shipping, customs, storage, etc.)
Per-vehicle share: $1,000 ÷ 4 = $250 per vehicle

Vehicle 1 (Honda Accord):
├─ Vehicle Price:              $5,000.00  ← Individual
├─ Insurance:                  $500.00    ← Individual
├─ Shipping (1/4 share):       $100.00    ← Shared
├─ Customs (1/4 share):        $80.00     ← Shared
├─ Storage (1/4 share):        $50.00     ← Shared
├─ Handling (1/4 share):       $20.00     ← Shared
└─ Subtotal:                   $5,750.00

Vehicle 2 (Toyota Camry):
├─ Vehicle Price:              $3,000.00  ← Individual
├─ Insurance:                  $300.00    ← Individual
├─ Shipping (1/4 share):       $100.00    ← Shared
├─ Customs (1/4 share):        $80.00     ← Shared
├─ Storage (1/4 share):        $50.00     ← Shared
├─ Handling (1/4 share):       $20.00     ← Shared
└─ Subtotal:                   $3,550.00

TOTAL INVOICE:                 $9,300.00
```

---

## 📋 **System Design**

### **1. Database Schema**

#### **New Table: `UserInvoice`**
```prisma
model UserInvoice {
  id              String         @id @default(cuid())
  invoiceNumber   String         @unique // INV-2025-001
  userId          String
  containerId     String
  
  // Invoice Details
  status          InvoiceStatus  @default(PENDING)
  issueDate       DateTime       @default(now())
  dueDate         DateTime?
  paidDate        DateTime?
  
  // Amounts
  subtotal        Float          // Sum of all line items
  tax             Float          @default(0)
  discount        Float          @default(0)
  total           Float
  
  // Payment
  paymentMethod   String?
  paymentReference String?
  
  // Relations
  user            User           @relation(fields: [userId], references: [id])
  container       Container      @relation(fields: [containerId], references: [id])
  lineItems       InvoiceLineItem[]
  
  notes           String?
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt
  
  @@index([userId])
  @@index([containerId])
  @@index([status])
  @@index([invoiceNumber])
}

model InvoiceLineItem {
  id          String      @id @default(cuid())
  invoiceId   String
  
  // Line Item Details
  description String      // "2015 Honda Accord - Vehicle Price"
  shipmentId  String?     // Link to shipment
  type        LineItemType // VEHICLE_PRICE, INSURANCE, SHARED_EXPENSE
  
  quantity    Float       @default(1)
  unitPrice   Float
  amount      Float       // quantity × unitPrice
  
  invoice     UserInvoice @relation(fields: [invoiceId], references: [id], onDelete: Cascade)
  shipment    Shipment?   @relation(fields: [shipmentId], references: [id])
  
  @@index([invoiceId])
  @@index([shipmentId])
}

enum InvoiceStatus {
  DRAFT
  PENDING
  SENT
  PAID
  OVERDUE
  CANCELLED
}

enum LineItemType {
  VEHICLE_PRICE
  INSURANCE
  SHIPPING_FEE
  CUSTOMS_FEE
  STORAGE_FEE
  HANDLING_FEE
  OTHER_FEE
  DISCOUNT
}
```

---

## 🔄 **Invoice Generation Workflow**

### **Option A: Automatic Generation** (Recommended)

**Trigger:** When container status changes to `ARRIVED_PORT` or `RELEASED`

**Process:**
1. System detects status change
2. Gets all shipments in container
3. Groups shipments by user
4. Calculates expenses per vehicle
5. Creates invoice for each user
6. Sends email notification
7. Makes invoice available in user portal

**Pros:**
- ✅ Automatic, no admin work
- ✅ Consistent timing
- ✅ Users get notified immediately
- ✅ Reduces manual errors

**Cons:**
- ⚠️ Less flexibility
- ⚠️ Hard to make adjustments

---

### **Option B: Manual Generation** (Flexible)

**Trigger:** Admin clicks "Generate Invoices" button on container

**Process:**
1. Admin reviews container
2. Clicks "Generate Invoices"
3. System shows preview of invoices to be created
4. Admin reviews and confirms
5. Invoices created
6. Email notifications sent

**Pros:**
- ✅ Full control
- ✅ Can review before sending
- ✅ Can make adjustments
- ✅ Can delay if needed

**Cons:**
- ⚠️ Requires manual action
- ⚠️ Can be forgotten
- ⚠️ More admin work

---

### **Option C: Hybrid Approach** (Best!)

**Automatic with Manual Override:**

1. **Auto-Generate Draft Invoices**
   - When container reaches ARRIVED_PORT
   - Creates invoices with status = DRAFT
   - Admin gets notification to review

2. **Admin Review**
   - Admin can edit line items
   - Adjust amounts if needed
   - Add discounts or fees
   - Preview invoice

3. **Send to Users**
   - Admin clicks "Send Invoices"
   - Status changes to PENDING
   - Emails sent to users
   - Available in user portal

**Pros:**
- ✅ Best of both worlds
- ✅ Automation + control
- ✅ Can make adjustments
- ✅ Reduces errors

---

## 📊 **Invoice Interface Design**

### **1. Container Detail Page - Invoice Section**

```
╔══════════════════════════════════════════════════════╗
║  INVOICES (3 users)                          [Actions▾]║
╚══════════════════════════════════════════════════════╝

Actions Menu:
  • Generate Invoices for All Users
  • View All Invoices
  • Email All Invoices
  • Export Invoice List

┌────────────────────────────────────────────────────┐
│ User                 Vehicles  Amount    Status    │
├────────────────────────────────────────────────────┤
│ John Doe              2        $9,300   PENDING   │
│ Jane Smith            1        $4,800   PAID      │
│ Bob Johnson           1        $5,200   OVERDUE   │
└────────────────────────────────────────────────────┘

[Generate All Invoices]  [View Details]
```

---

### **2. Generate Invoices Modal**

```
╔══════════════════════════════════════════════════╗
║  Generate Invoices - TEMU1234567                 ║
╚══════════════════════════════════════════════════╝

Container has 4 vehicles from 3 users
Total Container Expenses: $1,000.00
Per-Vehicle Share: $250.00

┌────────────────────────────────────────────────┐
│ PREVIEW: Invoices to be Created               │
├────────────────────────────────────────────────┤
│                                                │
│ ✓ John Doe (2 vehicles)                       │
│   Total: $9,300.00                             │
│                                                │
│ ✓ Jane Smith (1 vehicle)                      │
│   Total: $4,800.00                             │
│                                                │
│ ✓ Bob Johnson (1 vehicle)                     │
│   Total: $5,200.00                             │
│                                                │
│ TOTAL: $19,300.00                              │
└────────────────────────────────────────────────┘

Options:
☑ Send email notification to users
☑ Set due date: [30 days from now ▾]
☐ Apply early payment discount (5%)

        [Cancel]  [Generate Invoices]
```

---

### **3. Invoice Detail View**

```
╔══════════════════════════════════════════════════════════╗
║  INVOICE #INV-2025-001                    [Actions ▾]    ║
╚══════════════════════════════════════════════════════════╝

Actions:
  • Download PDF
  • Send Email
  • Mark as Paid
  • Edit Invoice
  • Cancel Invoice

┌──────────────────────────────────────────────────────┐
│ CUSTOMER INFORMATION                                 │
├──────────────────────────────────────────────────────┤
│ John Doe                                             │
│ john.doe@email.com                                   │
│ +1 (555) 123-4567                                    │
└──────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│ INVOICE DETAILS                                      │
├──────────────────────────────────────────────────────┤
│ Container:     TEMU1234567                           │
│ Issue Date:    Dec 9, 2025                           │
│ Due Date:      Jan 8, 2026                           │
│ Status:        PENDING                               │
└──────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│ LINE ITEMS                                           │
├──────────────────────────────────────────────────────┤
│                                                      │
│ 2015 Honda Accord (VIN: 1HGBH41JXMN109186)         │
│   Vehicle Price              $5,000.00              │
│   Insurance                  $500.00                │
│   Shipping (1/4 share)       $100.00                │
│   Customs (1/4 share)        $80.00                 │
│   Storage (1/4 share)        $50.00                 │
│   Handling (1/4 share)       $20.00                 │
│   Subtotal:                  $5,750.00              │
│                                                      │
│ 2018 Toyota Camry (VIN: 4T1BF1FK5CU123456)         │
│   Vehicle Price              $3,000.00              │
│   Insurance                  $300.00                │
│   Shipping (1/4 share)       $100.00                │
│   Customs (1/4 share)        $80.00                 │
│   Storage (1/4 share)        $50.00                 │
│   Handling (1/4 share)       $20.00                 │
│   Subtotal:                  $3,550.00              │
│                                                      │
├──────────────────────────────────────────────────────┤
│                                                      │
│ Subtotal:                    $9,300.00              │
│ Tax (0%):                    $0.00                  │
│ Discount:                    $0.00                  │
│                                                      │
│ TOTAL:                       $9,300.00              │
└──────────────────────────────────────────────────────┘

Payment Information:
  Method:     N/A
  Reference:  N/A
  Paid Date:  N/A
```

---

### **4. User Portal - My Invoices**

```
╔══════════════════════════════════════════════════════╗
║  MY INVOICES                                         ║
╚══════════════════════════════════════════════════════╝

Filter: [All ▾]  [Pending ▾]  [Paid ▾]

┌────────────────────────────────────────────────────┐
│ Invoice #        Container      Amount    Status   │
├────────────────────────────────────────────────────┤
│ INV-2025-001    TEMU1234567    $9,300   PENDING  │
│   Due: Jan 8, 2026                   [View] [Pay] │
│                                                    │
│ INV-2025-002    CONT5678901    $4,500   PAID     │
│   Paid: Nov 15, 2025                      [View]  │
│                                                    │
│ INV-2024-234    SHIP9876543    $6,200   OVERDUE  │
│   Due: Oct 1, 2025                   [View] [Pay] │
└────────────────────────────────────────────────────┘
```

---

## 💰 **Expense Distribution Logic**

### **Fair Distribution Methods:**

#### **Method 1: Equal Split** (Recommended)
```
Container Expenses: $1,000
Number of Vehicles: 4
Per Vehicle: $1,000 ÷ 4 = $250

Each vehicle gets equal share regardless of value
```

**Pros:**
- ✅ Simple and fair
- ✅ Easy to understand
- ✅ Equal treatment

**Cons:**
- ⚠️ Doesn't account for vehicle value

---

#### **Method 2: Value-Based Split**
```
Container Expenses: $1,000
Total Vehicle Value: $20,000

Vehicle 1 ($5,000): 25% × $1,000 = $250
Vehicle 2 ($8,000): 40% × $1,000 = $400
Vehicle 3 ($4,000): 20% × $1,000 = $200
Vehicle 4 ($3,000): 15% × $1,000 = $150
```

**Pros:**
- ✅ Proportional to value
- ✅ Higher value = higher cost

**Cons:**
- ⚠️ More complex
- ⚠️ Can feel unfair
- ⚠️ Hard to explain

---

#### **Method 3: Size-Based Split**
```
Container Expenses: $1,000
Space allocation by vehicle size:

Sedan (small):    0.8 units × 2 = 1.6 units
SUV (large):      1.2 units × 2 = 2.4 units
Total: 4.0 units

Sedan share: (0.8 ÷ 4.0) × $1,000 = $200 each
SUV share:   (1.2 ÷ 4.0) × $1,000 = $300 each
```

**Pros:**
- ✅ Accounts for space usage
- ✅ Fair based on size

**Cons:**
- ⚠️ Complex tracking
- ⚠️ Need vehicle dimensions
- ⚠️ Hard to calculate

---

### **✅ Recommendation: Equal Split**

**Why:**
- Simple and transparent
- Easy to explain to customers
- Fair treatment for all
- Easy to implement
- Industry standard

---

## 🎨 **Professional Invoice PDF**

### **Invoice Layout:**

```
╔══════════════════════════════════════════════════════╗
║                                                      ║
║  [LOGO]              YOUR COMPANY NAME               ║
║                      123 Business St                 ║
║                      City, State 12345               ║
║                      +1 (555) 123-4567               ║
║                                                      ║
╠══════════════════════════════════════════════════════╣
║                                                      ║
║  INVOICE                                             ║
║                                                      ║
╚══════════════════════════════════════════════════════╝

┌──────────────────────┬──────────────────────────────┐
│ BILL TO:             │ INVOICE DETAILS:             │
│ John Doe             │ Invoice #:  INV-2025-001     │
│ john@email.com       │ Date:       Dec 9, 2025      │
│ +1 (555) 123-4567    │ Due Date:   Jan 8, 2026      │
│                      │ Container:  TEMU1234567      │
└──────────────────────┴──────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│ DESCRIPTION                           QTY   AMOUNT   │
├──────────────────────────────────────────────────────┤
│ 2015 Honda Accord (VIN: 1HGBH41JXMN109186)         │
│   Vehicle Purchase Price              1    $5,000.00│
│   Insurance Coverage                  1    $500.00  │
│   Ocean Freight (proportional)        1    $100.00  │
│   Customs Clearance (proportional)    1    $80.00   │
│   Port Storage (proportional)         1    $50.00   │
│   Handling Charges (proportional)     1    $20.00   │
│                                                      │
│ 2018 Toyota Camry (VIN: 4T1BF1FK5CU123456)         │
│   Vehicle Purchase Price              1    $3,000.00│
│   Insurance Coverage                  1    $300.00  │
│   Ocean Freight (proportional)        1    $100.00  │
│   Customs Clearance (proportional)    1    $80.00   │
│   Port Storage (proportional)         1    $50.00   │
│   Handling Charges (proportional)     1    $20.00   │
├──────────────────────────────────────────────────────┤
│                                                      │
│                               Subtotal:   $9,300.00 │
│                                     Tax:   $0.00    │
│                                Discount:   $0.00    │
│                                                      │
│                              TOTAL DUE:   $9,300.00 │
└──────────────────────────────────────────────────────┘

PAYMENT INFORMATION:
  Bank Name:      ABC Bank
  Account Name:   Your Company Name
  Account Number: 1234567890
  Routing Number: 987654321

NOTES:
  • Payment due within 30 days of invoice date
  • Please include invoice number with payment
  • Late payments subject to 5% monthly interest
  • For questions, contact: billing@yourcompany.com

Thank you for your business!
```

---

## 🔔 **Notification System**

### **Email Notifications:**

#### **1. Invoice Created**
```
Subject: Invoice #INV-2025-001 - Payment Due

Dear John Doe,

Your invoice for container TEMU1234567 is ready.

Invoice Amount: $9,300.00
Due Date: January 8, 2026

Your shipment includes:
  • 2015 Honda Accord
  • 2018 Toyota Camry

[View Invoice] [Download PDF] [Pay Now]

Questions? Reply to this email or call us at +1 (555) 123-4567
```

#### **2. Payment Reminder**
```
Subject: Reminder: Invoice #INV-2025-001 Due in 7 Days

Dear John Doe,

This is a friendly reminder that your invoice is due soon.

Invoice: #INV-2025-001
Amount: $9,300.00
Due Date: January 8, 2026 (7 days)

[View Invoice] [Pay Now]
```

#### **3. Payment Received**
```
Subject: Payment Received - Invoice #INV-2025-001

Dear John Doe,

Thank you! We've received your payment.

Invoice: #INV-2025-001
Amount Paid: $9,300.00
Payment Date: December 15, 2025
Payment Method: Bank Transfer

[Download Receipt]
```

---

## 📱 **User Self-Service Portal**

### **Features:**

1. **View All Invoices**
   - List of pending and paid invoices
   - Filter by status, date, container
   - Search functionality

2. **Invoice Details**
   - Full breakdown of charges
   - Shipment details
   - Payment status

3. **Download PDF**
   - Professional invoice PDF
   - Print-ready format
   - Save for records

4. **Payment Integration** (Future)
   - Pay online with credit card
   - Bank transfer instructions
   - Payment confirmation

5. **Payment History**
   - View past payments
   - Download receipts
   - Track payment status

---

## 🔧 **Implementation Steps**

### **Phase 1: Database & Backend** (Week 1)
- [ ] Add UserInvoice and InvoiceLineItem models to schema
- [ ] Run database migration
- [ ] Create API routes for invoices
- [ ] Implement invoice generation logic
- [ ] Add expense distribution calculation

### **Phase 2: Admin Interface** (Week 2)
- [ ] Add "Generate Invoices" button to container detail
- [ ] Create invoice generation modal
- [ ] Build invoice list view
- [ ] Create invoice detail page
- [ ] Add edit invoice functionality
- [ ] Implement PDF generation for invoices

### **Phase 3: User Portal** (Week 3)
- [ ] Create "My Invoices" page for users
- [ ] Add invoice list with filtering
- [ ] Build invoice detail view for users
- [ ] Implement PDF download for users
- [ ] Add payment status tracking

### **Phase 4: Notifications** (Week 4)
- [ ] Set up email templates
- [ ] Implement invoice created email
- [ ] Add payment reminder system
- [ ] Create payment confirmation email
- [ ] Test email delivery

### **Phase 5: Polish & Testing** (Week 5)
- [ ] Professional invoice PDF design
- [ ] Comprehensive testing
- [ ] User acceptance testing
- [ ] Bug fixes and improvements
- [ ] Documentation

---

## 💡 **Additional Features**

### **Nice to Have:**

1. **Bulk Invoice Generation**
   - Generate invoices for multiple containers at once
   - Batch email sending
   - Progress tracking

2. **Invoice Templates**
   - Multiple invoice designs
   - Customizable templates
   - Branded invoices per client

3. **Payment Integration**
   - Stripe/PayPal integration
   - Online payment portal
   - Automatic status updates

4. **Recurring Invoices**
   - Monthly storage fees
   - Subscription services
   - Automated billing

5. **Invoice Disputes**
   - User can dispute charges
   - Admin review system
   - Resolution tracking

6. **Multi-Currency**
   - Support different currencies
   - Automatic conversion
   - Currency preference per user

7. **Tax Calculation**
   - Automatic tax computation
   - Different tax rates by region
   - Tax reports

8. **Discounts & Promotions**
   - Early payment discounts
   - Loyalty discounts
   - Promotional codes

---

## 📊 **Reporting & Analytics**

### **Admin Reports:**

1. **Revenue Report**
   - Total invoiced amount
   - Paid vs pending
   - By time period

2. **Customer Report**
   - Invoice history per customer
   - Payment behavior
   - Outstanding balances

3. **Container Report**
   - Revenue per container
   - Expense distribution
   - Profitability analysis

4. **Aging Report**
   - Invoices by age
   - Overdue amounts
   - Collection priority

---

## ✅ **My Recommendations**

### **Start with:**

1. **✅ Equal Expense Distribution**
   - Simple and fair
   - Easy to implement
   - Customer-friendly

2. **✅ Hybrid Invoice Generation**
   - Auto-create drafts
   - Admin review and adjust
   - Manual sending

3. **✅ Professional PDF Invoices**
   - Branded design
   - Clear breakdown
   - Easy to understand

4. **✅ User Self-Service Portal**
   - View invoices
   - Download PDFs
   - Track payment status

5. **✅ Email Notifications**
   - Invoice created
   - Payment reminders
   - Payment confirmation

### **Add Later:**

1. **💳 Online Payment Integration**
   - Stripe/PayPal
   - Credit card processing
   - Automatic updates

2. **📱 Mobile App**
   - View invoices on mobile
   - Push notifications
   - Quick payments

3. **🤖 Automated Reminders**
   - Smart reminder system
   - Escalation for overdue
   - Collection workflow

---

## 🎯 **Quick Summary**

**The Best Approach:**

```
1. Container Arrives → Auto-create DRAFT invoices
2. Admin Reviews → Adjust if needed
3. Admin Sends → Status = PENDING, emails sent
4. User Receives → Views in portal, downloads PDF
5. User Pays → Admin marks as PAID
6. Confirmation → User receives receipt

Expense Distribution:
  • Vehicle Price: Individual (from shipment.price)
  • Insurance: Individual (from shipment.insuranceValue)
  • Container Expenses: Divided equally among all vehicles
  • Clear line items showing calculation
```

---

## 📝 **Next Steps**

1. **Review this design** with your team
2. **Decide on approach** (I recommend Hybrid)
3. **Prioritize features** (start with basics)
4. **I can implement** Phase 1-3 for you
5. **Test with real data**
6. **Gather user feedback**
7. **Iterate and improve**

---

**Want me to start implementing this system? I recommend starting with the database schema and invoice generation logic!** 🚀
