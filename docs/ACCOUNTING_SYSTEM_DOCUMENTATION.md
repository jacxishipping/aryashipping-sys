# Accounting & Finance System Documentation

## Overview

The Accounting & Finance system is a comprehensive ledger-based financial management solution integrated into the car-shipping management software. It provides complete tracking of financial transactions, payment management, and detailed reporting capabilities.

## Key Features

### 1. User Ledger System

Every user automatically gets their own ledger when their account is created. The ledger tracks:

- **Debit Entries**: Amounts owed by the user
- **Credit Entries**: Payments received from the user
- **Running Balance**: Real-time balance calculation
- **Linked Shipments**: Each transaction can be linked to specific shipments
- **Transaction History**: Complete audit trail of all financial activities

#### Ledger Features:
- Search and filter by date range, transaction type, and shipment
- Export to CSV/Excel format
- Print-friendly view
- Pagination for large datasets
- Real-time balance calculations

### 2. Payment Mode System

When creating a shipment, admins can select a payment mode:

#### A. Cash Payment
- Creates both debit and credit entries (net zero balance)
- Shipment is immediately marked as "Paid"
- Perfect for immediate settlements
- No outstanding balance

#### B. Due Payment
- Creates only a debit entry
- Amount is added to user's outstanding balance
- Shipment marked as "Due"
- Payment must be recorded later

### 3. Payment Recording

Admins can record payments received from users:

#### Features:
- Select one or multiple shipments to apply payment
- Automatic payment distribution across selected shipments
- Partial payment support (payment remains on multiple shipments)
- Full payment detection (automatically marks shipment as "Paid")
- Notes and metadata support

#### Payment Flow:
1. Admin selects user
2. System shows all pending/due shipments
3. Admin selects shipments and enters amount
4. System creates credit entry
5. System distributes payment across shipments
6. Updates shipment payment status automatically

### 4. Additional Expenses

Any additional costs (shipping, fuel, repairs, etc.) can be added as ledger entries:

- Linked to specific shipments
- Supports both debit and credit entries
- Includes description, notes, and metadata
- Affects user's running balance

### 5. Admin Controls

Full administrative control over the financial system:

#### Capabilities:
- **Add Transactions**: Create new ledger entries manually
- **Edit Transactions**: Update description, notes, and metadata (amounts are immutable for audit integrity)
- **Delete Transactions**: Remove entries with automatic balance recalculation
- **View All Ledgers**: Access any user's financial history
- **Record Payments**: Log received payments
- **Generate Reports**: Create comprehensive financial reports

### 6. Ledger Structure

Each ledger entry contains:

```typescript
{
  id: string                  // Unique transaction ID
  transactionDate: DateTime   // Date and time of transaction
  description: string         // Transaction description
  type: 'DEBIT' | 'CREDIT'   // Transaction type
  amount: number             // Transaction amount (USD)
  balance: number            // Running balance after transaction
  shipmentId?: string        // Optional linked shipment
  userId: string             // User who owns this entry
  createdBy: string          // Admin who created the entry
  notes?: string             // Optional notes
  metadata?: JSON            // Optional metadata
  createdAt: DateTime        // Record creation timestamp
  updatedAt: DateTime        // Record update timestamp
}
```

### 7. Financial Reports

Comprehensive reporting system with multiple report types:

#### A. Summary Report
- Total debits and credits across all users
- Net balance (receivable/payable)
- Shipment payment status breakdown
- User balance summary
- Date range filtering

#### B. User-wise Report
- Detailed financial history per user
- Total debits and credits
- Current balance
- Shipment statistics (paid vs due)
- Recent transactions
- Export capabilities

#### C. Shipment-wise Report
- Payment status for each shipment
- Amount charged vs paid
- Outstanding balance
- Payment mode information
- User assignment
- Date filtering

#### Export Options:
- JSON format for data processing
- CSV format for Excel compatibility
- Print-friendly views
- Date range filtering
- User filtering (admin only)

## API Endpoints

### Ledger Management

#### GET /api/ledger
Fetch ledger entries with filtering

**Query Parameters:**
- `userId` - Filter by user (admin only)
- `shipmentId` - Filter by shipment
- `type` - Filter by DEBIT/CREDIT
- `startDate` - Date range start
- `endDate` - Date range end
- `search` - Search in description/notes
- `page` - Page number
- `limit` - Items per page

**Response:**
```json
{
  "entries": [...],
  "pagination": { "page": 1, "limit": 50, "totalCount": 100, "totalPages": 2 },
  "summary": { "totalDebit": 1000, "totalCredit": 500, "currentBalance": 500 }
}
```

#### POST /api/ledger
Create a new ledger entry (admin only)

**Body:**
```json
{
  "userId": "user-id",
  "shipmentId": "shipment-id",
  "description": "Transaction description",
  "type": "DEBIT",
  "amount": 100.50,
  "notes": "Optional notes"
}
```

#### GET /api/ledger/[id]
Fetch a single ledger entry

#### PATCH /api/ledger/[id]
Update ledger entry (admin only, non-financial fields only)

**Body:**
```json
{
  "description": "Updated description",
  "notes": "Updated notes"
}
```

#### DELETE /api/ledger/[id]
Delete ledger entry with balance recalculation (admin only)

### Payment Recording

#### POST /api/ledger/payment
Record a payment received from user (admin only)

**Body:**
```json
{
  "userId": "user-id",
  "shipmentIds": ["shipment-1", "shipment-2"],
  "amount": 500.00,
  "notes": "Payment via bank transfer"
}
```

**Response:**
```json
{
  "entry": {...},
  "updatedShipments": [...],
  "remainingAmount": 0,
  "message": "Payment recorded and fully applied"
}
```

### Financial Reports

#### GET /api/reports/financial
Generate financial reports (admin only)

**Query Parameters:**
- `type` - Report type: summary | user-wise | shipment-wise
- `userId` - Filter by user
- `startDate` - Date range start
- `endDate` - Date range end

### Export

#### GET /api/ledger/export
Export ledger data

**Query Parameters:**
- `userId` - User ID (defaults to current user, admin can specify)
- `format` - Export format: csv | json
- `startDate` - Date range start
- `endDate` - Date range end

## User Interface

### For Regular Users

#### My Ledger (`/dashboard/finance/ledger`)
- View personal transaction history
- Filter by date, type, shipment
- Search transactions
- Export to CSV
- Print ledger
- View current balance
- See linked shipments

### For Admins

#### Finance Dashboard (`/dashboard/finance`)
- Overview of financial system
- Total debits and credits
- Net balance (receivable/payable)
- User balance summary
- Shipment payment status
- Quick actions menu

#### Record Payment (`/dashboard/finance/record-payment`)
- Select user
- View pending shipments
- Select shipments for payment
- Enter payment amount
- Add notes
- Automatic payment distribution

#### Financial Reports (`/dashboard/finance/reports`)
- Choose report type
- Apply date filters
- View detailed breakdowns
- Export reports
- Print reports

#### Create Shipment (Updated)
- Select payment mode (Cash/Due)
- Automatic ledger entry creation
- Real-time balance updates
- Payment status tracking

## Database Schema

### LedgerEntry Model
```prisma
model LedgerEntry {
  id              String           @id @default(cuid())
  userId          String
  shipmentId      String?
  transactionDate DateTime         @default(now())
  description     String
  type            LedgerEntryType  // DEBIT | CREDIT
  amount          Float
  balance         Float
  createdBy       String
  notes           String?
  metadata        Json?
  createdAt       DateTime         @default(now())
  updatedAt       DateTime         @updatedAt
  user            User             @relation(...)
  shipment        Shipment?        @relation(...)
  
  @@index([userId])
  @@index([shipmentId])
  @@index([transactionDate])
}
```

### Updated Shipment Model
Added fields:
- `paymentMode` - Cash or Due
- `ledgerEntries` - Relation to ledger entries

## Workflow Examples

### Example 1: Creating a Shipment with Due Payment

1. Admin creates shipment with payment mode "Due"
2. Price: $1,500
3. System automatically:
   - Creates debit entry for $1,500
   - Links entry to shipment
   - Updates user's balance (+$1,500)
   - Sets shipment status to "Due"

### Example 2: Recording a Payment

1. User pays $1,000 for two shipments
2. Admin selects user and shipments
3. Enters $1,000 amount
4. System:
   - Creates credit entry for $1,000
   - Distributes across shipments
   - Updates balances
   - Marks fully paid shipments as "Paid"
   - Leaves partial payments as "Due"

### Example 3: Cash Payment Shipment

1. Admin creates shipment with payment mode "Cash"
2. Price: $1,200
3. System automatically:
   - Creates debit entry for $1,200
   - Creates credit entry for $1,200
   - Net effect: zero balance change
   - Sets shipment status to "Paid"

## Best Practices

### For Admins

1. **Always verify payment mode** when creating shipments
2. **Add notes** to ledger entries for clarity
3. **Record payments promptly** to maintain accurate balances
4. **Review reports regularly** to track financial health
5. **Export data periodically** for backup and accounting

### For Users

1. **Check ledger regularly** to track dues
2. **Verify shipment costs** before acceptance
3. **Keep records** of payments made
4. **Report discrepancies** immediately to admin

### For Development

1. **Never modify amounts** in existing ledger entries (create new entries instead)
2. **Always recalculate balances** after deletions
3. **Maintain transaction dates** in chronological order
4. **Use transactions** for multi-step operations
5. **Validate shipment ownership** before operations

## Security Considerations

1. **Access Control**: Only admins can create/modify ledger entries
2. **User Isolation**: Users can only view their own ledger (unless admin)
3. **Audit Trail**: All entries track creator and timestamps
4. **Immutable Amounts**: Financial values cannot be edited (delete and recreate)
5. **Balance Integrity**: Running balances automatically recalculated

## Future Enhancements

Potential additions to the system:

1. **Payment Methods**: Track payment method (cash, card, bank transfer)
2. **Currency Support**: Multi-currency transactions
3. **Automated Reminders**: Email reminders for due payments
4. **Payment Plans**: Installment payment support
5. **Invoice Generation**: Automatic invoice creation
6. **Tax Calculations**: Automatic tax computation
7. **Receipt Generation**: Digital receipts for payments
8. **Advanced Analytics**: Graphs and charts for financial trends
9. **Bulk Operations**: Mass payment recording
10. **Integration**: Connect with accounting software (QuickBooks, Xero)

## Troubleshooting

### Common Issues

#### Balance Mismatch
- **Cause**: Manual database modifications
- **Solution**: Run balance recalculation script

#### Missing Transactions
- **Cause**: Failed API calls
- **Solution**: Check network logs and retry

#### Export Failing
- **Cause**: Large dataset
- **Solution**: Apply date filters to reduce size

#### Payment Not Applying
- **Cause**: Shipment already paid or invalid shipment ID
- **Solution**: Verify shipment status and IDs

## Support

For issues or questions about the Accounting & Finance system:

1. Check this documentation
2. Review API logs for errors
3. Verify database migrations are applied
4. Contact system administrator

---

**Version**: 1.0.0  
**Last Updated**: December 2025  
**Author**: JACXI Development Team
