# Ledger Access Guide - User vs Admin

## Overview

The finance system has different interfaces for **regular users** and **administrators** to access and manage ledgers.

---

## 🔵 FOR REGULAR USERS

### Where Users See Their Own Ledger

**URL:** `/dashboard/finance/ledger`

**Access:** Automatic (users can ONLY see their own ledger)

### What Users Can Do:

✅ **View their own transactions**
- See all debit entries (amounts they owe)
- See all credit entries (payments they made)
- View current balance

✅ **Filter transactions**
- By date range
- By transaction type (DEBIT/CREDIT)
- Search by description
- Filter by shipment

✅ **Export their ledger**
- Download as PDF
- Download as Excel
- Print ledger

✅ **View summary**
- Total debit (total amount owed)
- Total credit (total amount paid)
- Current balance

### What Users CANNOT Do:

❌ Cannot add transactions
❌ Cannot edit transactions
❌ Cannot delete transactions
❌ Cannot see other users' ledgers
❌ Cannot manage finances

**User ledger is READ-ONLY** - Only admins can make changes.

---

## 🔴 FOR ADMINISTRATORS

Admins have **THREE different interfaces** for managing ledgers:

---

### 1️⃣ Admin View: ALL User Ledgers

**URL:** `/dashboard/finance/admin/ledgers`

**Purpose:** Overview of ALL users and their financial status

### What Admins See:

✅ **List of all users with:**
- User name and email
- Current balance (amount they owe or credit)
- Total debit (all charges)
- Total credit (all payments)
- Number of transactions
- Last transaction date
- Quick action buttons

✅ **Summary cards showing:**
- Total outstanding balance (all users combined)
- Total debits across all users
- Total credits across all users
- Number of users with outstanding balance

✅ **Search and filter:**
- Search by user name or email
- Filter by balance type:
  - Positive balance (users who owe money)
  - Zero balance (settled accounts)
  - Negative balance (users with credit)

✅ **Quick access:**
- Click "View Ledger" button to see individual user's ledger
- Links to record payment or add expense

---

### 2️⃣ Admin View: Individual User Ledger

**URL:** `/dashboard/finance/admin/ledgers/[userId]`

**Purpose:** Complete control over a specific user's ledger

### What Admins Can Do:

✅ **View all user's transactions**
- Complete transaction history
- Linked shipments displayed
- Notes and metadata shown

✅ **Add new transactions**
- Create DEBIT entry (charge user)
- Create CREDIT entry (record payment)
- Add description and notes
- Specify amount

✅ **Edit existing transactions**
- Update description
- Update notes
- (Amount and type locked for integrity)

✅ **Delete transactions**
- Remove incorrect entries
- Requires confirmation

✅ **Export user's ledger**
- Download as PDF
- Download as Excel
- Print user's ledger

✅ **Filter and search**
- Date range filters
- Transaction type filter
- Search descriptions and notes

✅ **View summary**
- User's current balance
- Total debits for this user
- Total credits for this user
- Balance status (owed/credit/settled)

---

### 3️⃣ Admin View: Record Payment Page

**URL:** `/dashboard/finance/record-payment`

**Purpose:** Record payments from users for their shipments

### What Admins Can Do:

✅ **Record payments:**
- Select user who is paying
- Enter payment amount
- Select which shipment(s) payment is for
- Add payment notes

✅ **Automatic processing:**
- System creates CREDIT entry
- Distributes payment across selected shipments
- Updates shipment payment status automatically
- Calculates new balance

---

### 4️⃣ Admin View: Add Expense Page

**URL:** `/dashboard/finance/add-expense`

**Purpose:** Add expenses to shipments (appears in user ledger)

### What Admins Can Do:

✅ **Add expenses:**
- Select shipment
- Choose expense type:
  - Shipping fee
  - Fuel
  - Port charges
  - Towing
  - Customs
  - Other
- Enter amount and description
- Add notes

✅ **Automatic processing:**
- System creates DEBIT entry in user's ledger
- Links expense to shipment
- Updates user's balance
- Available in financial reports

---

## URL Structure Summary

```
User URLs:
└── /dashboard/finance/ledger
    └── (User's own ledger - read-only)

Admin URLs:
├── /dashboard/finance/admin/ledgers
│   └── (List of all user ledgers with summary)
│
├── /dashboard/finance/admin/ledgers/[userId]
│   └── (Individual user ledger management)
│
├── /dashboard/finance/record-payment
│   └── (Record payments from users)
│
├── /dashboard/finance/add-expense
│   └── (Add expenses to shipments)
│
└── /dashboard/finance/reports
    └── (Financial reports and analytics)
```

---

## Access Control

### Automatic Redirection:

**If regular user tries to access admin pages:**
```
User visits: /dashboard/finance/admin/ledgers
System redirects to: /dashboard/finance/ledger
```

**If admin visits user ledger:**
```
Admin visits: /dashboard/finance/ledger
Shows: Admin's own ledger (can access all via admin pages)
```

### Role-Based Access:

| Page | User Access | Admin Access |
|------|------------|--------------|
| `/dashboard/finance/ledger` | ✅ Own ledger only | ✅ Own ledger |
| `/dashboard/finance/admin/ledgers` | ❌ Redirected | ✅ Full access |
| `/dashboard/finance/admin/ledgers/[userId]` | ❌ Redirected | ✅ Full control |
| `/dashboard/finance/record-payment` | ❌ Not accessible | ✅ Record payments |
| `/dashboard/finance/add-expense` | ❌ Not accessible | ✅ Add expenses |

---

## Workflow Examples

### Example 1: User Wants to Check Their Balance

1. User logs in
2. Navigates to: **Dashboard → Finance → My Ledger**
3. URL: `/dashboard/finance/ledger`
4. Views their transaction history
5. Sees current balance at top
6. Can export to PDF or Excel

---

### Example 2: Admin Wants to See All Users' Financial Status

1. Admin logs in
2. Navigates to: **Dashboard → Finance → Admin → All Ledgers**
3. URL: `/dashboard/finance/admin/ledgers`
4. Sees summary cards with totals
5. Views list of all users with balances
6. Can search or filter users
7. Clicks "View Ledger" on any user

---

### Example 3: Admin Wants to Manage a Specific User's Ledger

1. Admin on all ledgers page
2. Clicks "View Ledger" for John Doe
3. URL: `/dashboard/finance/admin/ledgers/user123`
4. Sees John's complete transaction history
5. Can add, edit, or delete transactions
6. Can export John's ledger

**Or:**

1. Admin directly navigates to:
   `/dashboard/finance/admin/ledgers/[userId]`
2. Replace `[userId]` with actual user ID

---

### Example 4: User Makes a Payment

**From Admin Side:**

1. Admin navigates to: `/dashboard/finance/record-payment`
2. Selects user who is paying
3. Enters payment amount (e.g., $2,000)
4. Selects which shipment(s) payment is for
5. Submits payment
6. System automatically:
   - Creates CREDIT entry in user's ledger
   - Updates user's balance
   - Updates shipment payment status
   - If fully paid → shipment marked COMPLETED
   - If partially paid → shipment stays PENDING

**User Can See:**
1. User views their ledger: `/dashboard/finance/ledger`
2. Sees new CREDIT entry: "Payment received for shipment..."
3. Balance decreased by payment amount

---

### Example 5: Adding Expense to Shipment

**From Admin Side:**

1. Admin navigates to: `/dashboard/finance/add-expense`
2. Selects shipment
3. Chooses expense type: "Port Charges"
4. Enters amount: $500
5. Adds description: "Port handling fees"
6. Submits expense
7. System automatically:
   - Creates DEBIT entry in user's ledger
   - Links expense to shipment
   - Increases user's balance by $500

**User Can See:**
1. User views their ledger: `/dashboard/finance/ledger`
2. Sees new DEBIT entry: "Port handling fees - Port charges..."
3. Balance increased by $500
4. Entry shows linked shipment

---

## Navigation Menu Structure

### For Regular Users:
```
Dashboard
└── Finance
    ├── My Ledger (/dashboard/finance/ledger)
    ├── My Shipments
    └── Reports (if accessible)
```

### For Admins:
```
Dashboard
└── Finance
    ├── My Ledger (/dashboard/finance/ledger)
    ├── Admin
    │   ├── All User Ledgers (/dashboard/finance/admin/ledgers)
    │   ├── Record Payment (/dashboard/finance/record-payment)
    │   └── Add Expense (/dashboard/finance/add-expense)
    ├── Reports (/dashboard/finance/reports)
    │   ├── Summary Report
    │   ├── Due Aging Report
    │   └── Financial Analytics
    └── Shipments
```

---

## Page Features Comparison

| Feature | User Ledger | Admin: All Ledgers | Admin: User Ledger |
|---------|------------|-------------------|-------------------|
| View own transactions | ✅ | ❌ (sees summary) | ✅ (any user) |
| View all users | ❌ | ✅ | ❌ |
| Add transaction | ❌ | ❌ | ✅ |
| Edit transaction | ❌ | ❌ | ✅ |
| Delete transaction | ❌ | ❌ | ✅ |
| Export PDF | ✅ | ❌ | ✅ |
| Export Excel | ✅ | ❌ | ✅ |
| Print | ✅ | ❌ | ✅ |
| Filter by date | ✅ | ❌ | ✅ |
| Search transactions | ✅ | ✅ (by user) | ✅ |
| View summary | ✅ | ✅ (all users) | ✅ (one user) |

---

## Important Notes

### Data Security:
- ✅ Users can ONLY see their own ledger
- ✅ API automatically filters by user ID for non-admins
- ✅ Admin routes check role before allowing access
- ✅ All actions logged in audit trail

### Balance Calculation:
- **Positive balance** = User owes money (red)
- **Negative balance** = User has credit (green)
- **Zero balance** = Account settled (gray)

Formula: `Balance = Total Debit - Total Credit`

### Transaction Rules:
- **DEBIT** = Amount user owes (increases balance)
- **CREDIT** = Amount user pays (decreases balance)
- Running balance maintained with each transaction
- Transactions can be linked to shipments

---

## Quick Reference

### I'm a regular user and want to:
- **See my transactions** → `/dashboard/finance/ledger`
- **Check my balance** → `/dashboard/finance/ledger` (see summary cards)
- **Export my ledger** → `/dashboard/finance/ledger` → Click "PDF" or "Excel"
- **Print my ledger** → `/dashboard/finance/ledger` → Click "Print"

### I'm an admin and want to:
- **See all user balances** → `/dashboard/finance/admin/ledgers`
- **Manage a user's ledger** → `/dashboard/finance/admin/ledgers/[userId]`
- **Add a transaction** → `/dashboard/finance/admin/ledgers/[userId]` → Click "Add Transaction"
- **Record a payment** → `/dashboard/finance/record-payment`
- **Add an expense** → `/dashboard/finance/add-expense`
- **View reports** → `/dashboard/finance/reports`

---

## Summary

✅ **Users:** Have read-only access to their own ledger at `/dashboard/finance/ledger`

✅ **Admins:** Have three main interfaces:
1. All ledgers overview: `/dashboard/finance/admin/ledgers`
2. Individual user ledger management: `/dashboard/finance/admin/ledgers/[userId]`
3. Payment/expense recording: Separate dedicated pages

✅ **Complete separation** between user view and admin controls

✅ **Automatic access control** ensures users can't see other users' data

✅ **Full audit trail** of all admin actions

---

**Created:** December 6, 2025
**Status:** Complete and Production Ready
