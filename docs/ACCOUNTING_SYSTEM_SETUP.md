# Accounting & Finance System - Setup Guide

## Quick Start Guide

This guide will help you set up and start using the Accounting & Finance system.

## Prerequisites

- Node.js and npm installed
- PostgreSQL database configured
- Existing JACXI car-shipping application running

## Installation Steps

### 1. Apply Database Migration

The accounting system requires new database tables. Run the migration:

```bash
# Generate Prisma client with new schema
npx prisma generate

# Apply the migration
npx prisma migrate deploy

# Or use db push for development
npx prisma db push
```

The migration will create:
- `LedgerEntry` table
- `PaymentMode` enum (CASH, DUE)
- `LedgerEntryType` enum (DEBIT, CREDIT)
- Add `paymentMode` field to Shipment table

### 2. Verify Database Schema

Check that the new tables exist:

```sql
-- Check LedgerEntry table
SELECT * FROM "LedgerEntry" LIMIT 1;

-- Check Shipment table has paymentMode column
SELECT id, "trackingNumber", "paymentMode", "paymentStatus" FROM "Shipment" LIMIT 1;
```

### 3. Restart Application

```bash
npm run dev
```

## Accessing the Finance Module

### For Regular Users

Navigate to: `/dashboard/finance/ledger`

Features available:
- View personal ledger
- Filter transactions
- Export to CSV
- Print ledger

### For Admins

Navigate to: `/dashboard/finance`

Features available:
- Financial dashboard overview
- Record payments: `/dashboard/finance/record-payment`
- View reports: `/dashboard/finance/reports`
- View any user's ledger: `/dashboard/finance/ledger?userId=USER_ID`

## Testing the System

### Test 1: Create a Shipment with Due Payment

1. Go to `/dashboard/shipments/new`
2. Fill in shipment details
3. Enter a price (e.g., $1,500)
4. Select "Due Payment" mode
5. Submit the form

**Expected Result:**
- Shipment created successfully
- Ledger entry created automatically
- User's balance increased by $1,500

**Verify:**
```
GET /api/ledger?userId=USER_ID
```

### Test 2: Create a Shipment with Cash Payment

1. Go to `/dashboard/shipments/new`
2. Fill in shipment details
3. Enter a price (e.g., $1,200)
4. Select "Cash Payment" mode
5. Submit the form

**Expected Result:**
- Shipment created successfully
- Two ledger entries created (debit + credit)
- User's balance unchanged (net zero)
- Shipment marked as "Paid"

**Verify:**
```
GET /api/ledger?userId=USER_ID&shipmentId=SHIPMENT_ID
```

### Test 3: Record a Payment

1. Go to `/dashboard/finance/record-payment`
2. Select a user with due shipments
3. Select one or more shipments
4. Enter payment amount
5. Add notes (optional)
6. Submit

**Expected Result:**
- Credit ledger entry created
- Payment distributed across shipments
- Fully paid shipments marked as "Paid"
- User's balance decreased

**Verify:**
```
GET /api/ledger/payment
POST with appropriate payload
```

### Test 4: View Reports

1. Go to `/dashboard/finance/reports`
2. Select report type (Summary, User-wise, or Shipment-wise)
3. Apply date filters (optional)
4. View results

**Expected Result:**
- Report displays correctly
- All calculations accurate
- Export functions work

### Test 5: Export Ledger

1. Go to `/dashboard/finance/ledger`
2. Apply filters (optional)
3. Click "Export CSV"

**Expected Result:**
- CSV file downloads
- Contains all filtered transactions
- Properly formatted

## API Testing

Use these curl commands to test the API:

### Get Ledger Entries
```bash
curl -X GET "http://localhost:3000/api/ledger?page=1&limit=20" \
  -H "Cookie: your-session-cookie"
```

### Create Ledger Entry (Admin)
```bash
curl -X POST "http://localhost:3000/api/ledger" \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie" \
  -d '{
    "userId": "user-id",
    "description": "Test transaction",
    "type": "DEBIT",
    "amount": 100.50
  }'
```

### Record Payment (Admin)
```bash
curl -X POST "http://localhost:3000/api/ledger/payment" \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie" \
  -d '{
    "userId": "user-id",
    "shipmentIds": ["shipment-id-1"],
    "amount": 500.00,
    "notes": "Payment received"
  }'
```

### Generate Financial Report (Admin)
```bash
curl -X GET "http://localhost:3000/api/reports/financial?type=summary" \
  -H "Cookie: your-session-cookie"
```

## Common Issues & Solutions

### Issue 1: Database Connection Error

**Error:** `Environment variable not found: DATABASE_URL`

**Solution:**
```bash
# Create .env file if missing
echo 'DATABASE_URL="postgresql://user:password@localhost:5432/dbname"' > .env
```

### Issue 2: Migration Failed

**Error:** `Migration failed to apply`

**Solution:**
```bash
# Reset database (WARNING: This deletes all data)
npx prisma migrate reset

# Or manually apply migration SQL
psql -U username -d dbname -f prisma/migrations/[timestamp]_add_accounting_system/migration.sql
```

### Issue 3: Access Denied

**Error:** `403 Forbidden`

**Solution:**
- Ensure you're logged in as admin for admin routes
- Check session authentication
- Verify user role in database

### Issue 4: Balance Mismatch

**Error:** Ledger balance doesn't match expected value

**Solution:**
Run balance recalculation for affected user:
```sql
-- Get all entries for user in chronological order
SELECT * FROM "LedgerEntry" WHERE "userId" = 'USER_ID' ORDER BY "transactionDate" ASC;

-- Manually recalculate and update balances
-- (Write a script to do this programmatically)
```

### Issue 5: Export Not Working

**Error:** CSV export fails or is empty

**Solution:**
- Check browser console for errors
- Verify date range filters aren't too restrictive
- Ensure user has ledger entries
- Check API response in Network tab

## Database Queries for Debugging

### Check User Balance
```sql
SELECT 
  u.id,
  u.name,
  u.email,
  le.balance as "currentBalance"
FROM "User" u
LEFT JOIN LATERAL (
  SELECT balance 
  FROM "LedgerEntry" 
  WHERE "userId" = u.id 
  ORDER BY "transactionDate" DESC 
  LIMIT 1
) le ON true;
```

### Check Shipment Payment Status
```sql
SELECT 
  s.id,
  s."trackingNumber",
  s."paymentMode",
  s."paymentStatus",
  s.price,
  COALESCE(SUM(CASE WHEN le.type = 'DEBIT' THEN le.amount ELSE 0 END), 0) as "totalDebit",
  COALESCE(SUM(CASE WHEN le.type = 'CREDIT' THEN le.amount ELSE 0 END), 0) as "totalCredit"
FROM "Shipment" s
LEFT JOIN "LedgerEntry" le ON le."shipmentId" = s.id
GROUP BY s.id;
```

### Find Unbalanced Ledgers
```sql
-- This query finds users whose ledger entries don't have proper running balances
WITH EntryBalances AS (
  SELECT 
    "userId",
    id,
    type,
    amount,
    balance,
    LAG(balance) OVER (PARTITION BY "userId" ORDER BY "transactionDate") as prev_balance
  FROM "LedgerEntry"
)
SELECT * FROM EntryBalances
WHERE (
  (type = 'DEBIT' AND balance != COALESCE(prev_balance, 0) + amount) OR
  (type = 'CREDIT' AND balance != COALESCE(prev_balance, 0) - amount)
);
```

## Performance Optimization

### Add Indexes (Already included in migration)

```sql
CREATE INDEX IF NOT EXISTS "LedgerEntry_userId_idx" ON "LedgerEntry"("userId");
CREATE INDEX IF NOT EXISTS "LedgerEntry_shipmentId_idx" ON "LedgerEntry"("shipmentId");
CREATE INDEX IF NOT EXISTS "LedgerEntry_transactionDate_idx" ON "LedgerEntry"("transactionDate");
```

### Optimize Large Queries

For users with many transactions:
- Use pagination (already implemented)
- Apply date filters
- Limit result sets
- Consider archiving old transactions

## Security Checklist

- [ ] Only admins can create/edit/delete ledger entries
- [ ] Users can only view their own ledger
- [ ] All API routes require authentication
- [ ] Session validation on every request
- [ ] Input validation on all forms
- [ ] SQL injection prevention (using Prisma ORM)
- [ ] XSS prevention (React auto-escaping)
- [ ] CSRF protection (Next.js built-in)

## Monitoring & Logging

### Important Metrics to Track

1. **Transaction Volume**: Number of ledger entries per day
2. **Balance Trends**: Total receivables and payables
3. **Payment Velocity**: Time between shipment and payment
4. **Error Rates**: Failed API calls
5. **Export Usage**: Frequency of CSV/PDF exports

### Enable Logging

Add to your logging system:

```typescript
// Log all financial transactions
console.log({
  action: 'ledger_entry_created',
  userId: entry.userId,
  amount: entry.amount,
  type: entry.type,
  timestamp: new Date()
});
```

## Backup & Recovery

### Backup Ledger Data

```bash
# Export all ledger entries
pg_dump -U username -d dbname -t LedgerEntry > ledger_backup.sql

# Or use the application's export feature
curl -X GET "http://localhost:3000/api/ledger/export?format=json" > ledger_backup.json
```

### Restore from Backup

```bash
# Restore from SQL dump
psql -U username -d dbname < ledger_backup.sql
```

## Next Steps

After successful setup:

1. **Train Admin Users**: Educate admins on payment recording
2. **Notify Users**: Inform users about ledger access
3. **Set Up Regular Backups**: Automate ledger data backups
4. **Monitor System**: Track financial metrics
5. **Review Reports**: Regularly check financial reports
6. **Document Processes**: Create internal procedures
7. **Plan Enhancements**: Consider future features

## Support & Documentation

- Full Documentation: `ACCOUNTING_SYSTEM_DOCUMENTATION.md`
- API Reference: See documentation file
- Database Schema: `prisma/schema.prisma`
- Migration Files: `prisma/migrations/`

## Useful Links

- Ledger View: `/dashboard/finance/ledger`
- Record Payment: `/dashboard/finance/record-payment`
- Reports: `/dashboard/finance/reports`
- Dashboard: `/dashboard/finance`
- Create Shipment: `/dashboard/shipments/new`

---

For questions or issues, contact the development team.

**Version**: 1.0.0  
**Last Updated**: December 2025
