# Database Migration Guide

## Migration: Add Service Types and Purchase Fields
**Date:** 2026-01-31  
**Migration ID:** 20260131183000_add_service_types_and_purchase_fields

---

## Overview

This migration adds support for two distinct service types in the Jacxi Shipping platform:
1. **Purchase + Shipping** - Company buys vehicles for customers and ships them
2. **Shipping Only** - Customer already owns vehicle, company only provides shipping

It also enhances the financial tracking with better expense allocation methods.

---

## What Changed

### 1. New Enums

#### ServiceType
```sql
CREATE TYPE "ServiceType" AS ENUM (
  'PURCHASE_AND_SHIPPING',  -- Company buys car for customer + shipping
  'SHIPPING_ONLY'           -- Customer already owns car, just shipping service
);
```

#### ExpenseAllocationMethod
```sql
CREATE TYPE "ExpenseAllocationMethod" AS ENUM (
  'EQUAL',      -- Divide equally among all shipments
  'BY_VALUE',   -- Weighted by insurance value
  'BY_WEIGHT',  -- Weighted by vehicle weight
  'CUSTOM'      -- Custom allocation percentages
);
```

#### LineItemType (Updated)
```sql
ALTER TYPE "LineItemType" ADD VALUE 'PURCHASE_PRICE';
-- New value added to support vehicle purchase price line items
```

### 2. Shipment Table Changes

New columns added to the `Shipment` table:

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `serviceType` | ServiceType | No | SHIPPING_ONLY | Type of service provided |
| `purchasePrice` | Float | Yes | NULL | Vehicle purchase price (PURCHASE_AND_SHIPPING only) |
| `purchaseDate` | DateTime | Yes | NULL | Date vehicle was purchased |
| `purchaseLocation` | String | Yes | NULL | Auction/Dealer location |
| `dealerName` | String | Yes | NULL | Dealer or auction house name |
| `purchaseNotes` | String | Yes | NULL | Additional purchase details |

### 3. Container Table Changes

New column added to the `Container` table:

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `expenseAllocationMethod` | ExpenseAllocationMethod | No | EQUAL | How to allocate container expenses |

---

## Migration SQL

Location: `prisma/migrations/20260131183000_add_service_types_and_purchase_fields/migration.sql`

The migration uses PostgreSQL `DO` blocks to make it idempotent (can be run multiple times safely):
- Creates enums if they don't exist
- Adds columns if they don't exist
- Provides helpful NOTICE messages during execution

---

## How to Apply This Migration

### Option 1: Using Prisma Migrate (Recommended for Production)

```bash
# Review the migration
npx prisma migrate status

# Apply the migration
npx prisma migrate deploy

# Verify it was applied
npx prisma migrate status
```

### Option 2: Using Prisma Migrate Dev (Development)

```bash
# Apply migration in development
npx prisma migrate dev

# This will:
# - Apply the migration
# - Regenerate Prisma Client
# - Update your database
```

### Option 3: Manual Application

If you need to apply manually:

```bash
# Connect to your PostgreSQL database
psql -U your_user -d jacxi_shipping

# Run the migration file
\i prisma/migrations/20260131183000_add_service_types_and_purchase_fields/migration.sql

# Verify changes
\d "Shipment"
\d "Container"
\dT "ServiceType"
\dT "ExpenseAllocationMethod"
```

---

## Post-Migration Steps

### 1. Regenerate Prisma Client

```bash
npx prisma generate
```

### 2. Update Existing Data (Optional)

All existing shipments will default to `SHIPPING_ONLY` service type. If you need to update some to `PURCHASE_AND_SHIPPING`:

```sql
-- Update specific shipments that were purchase+shipping
UPDATE "Shipment" 
SET 
  "serviceType" = 'PURCHASE_AND_SHIPPING',
  "purchasePrice" = 15000.00,  -- Set actual purchase price
  "dealerName" = 'Copart Dallas',
  "purchaseLocation" = 'Dallas, TX'
WHERE id IN ('shipment-id-1', 'shipment-id-2');
```

### 3. Verify Application Code

Ensure your application code is updated to handle:
- Service type selection in shipment creation
- Conditional purchase fields display
- Service-type-aware invoice generation
- Expense allocation method selection

---

## Rollback (If Needed)

To rollback this migration, you would need to:

```sql
-- Remove columns from Shipment
ALTER TABLE "Shipment" DROP COLUMN IF EXISTS "serviceType";
ALTER TABLE "Shipment" DROP COLUMN IF EXISTS "purchasePrice";
ALTER TABLE "Shipment" DROP COLUMN IF EXISTS "purchaseDate";
ALTER TABLE "Shipment" DROP COLUMN IF EXISTS "purchaseLocation";
ALTER TABLE "Shipment" DROP COLUMN IF EXISTS "dealerName";
ALTER TABLE "Shipment" DROP COLUMN IF EXISTS "purchaseNotes";

-- Remove column from Container
ALTER TABLE "Container" DROP COLUMN IF EXISTS "expenseAllocationMethod";

-- Note: Cannot easily remove enum values in PostgreSQL
-- Would need to drop and recreate dependent objects
```

**⚠️ Warning:** Rollback will result in data loss for purchase-related information!

---

## Testing Checklist

After applying the migration:

- [ ] Verify all enum types exist
  ```sql
  SELECT typname FROM pg_type WHERE typname IN ('ServiceType', 'ExpenseAllocationMethod');
  ```

- [ ] Verify Shipment columns exist
  ```sql
  SELECT column_name, data_type, is_nullable, column_default 
  FROM information_schema.columns 
  WHERE table_name = 'Shipment' 
  AND column_name IN ('serviceType', 'purchasePrice', 'purchaseDate', 'purchaseLocation', 'dealerName', 'purchaseNotes')
  ORDER BY column_name;
  ```

- [ ] Verify Container column exists
  ```sql
  SELECT column_name, data_type, column_default 
  FROM information_schema.columns 
  WHERE table_name = 'Container' 
  AND column_name = 'expenseAllocationMethod';
  ```

- [ ] Verify LineItemType enum has PURCHASE_PRICE
  ```sql
  SELECT enumlabel FROM pg_enum 
  WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'LineItemType')
  ORDER BY enumlabel;
  ```

- [ ] Test creating a SHIPPING_ONLY shipment
- [ ] Test creating a PURCHASE_AND_SHIPPING shipment
- [ ] Test invoice generation for both service types
- [ ] Test expense allocation with different methods

---

## Impact Assessment

### Breaking Changes
- **None** - All changes are additive with sensible defaults

### Backward Compatibility
- ✅ Existing shipments default to `SHIPPING_ONLY`
- ✅ Existing containers default to `EQUAL` expense allocation
- ✅ All new fields are nullable or have defaults
- ✅ No data loss for existing records

### Performance Impact
- **Minimal** - New columns are indexed where appropriate
- **No degradation** expected for existing queries
- New queries on service type will benefit from indexes

---

## Related Documentation

- `SERVICE_TYPE_IMPLEMENTATION_GUIDE.md` - Complete implementation details
- `FINANCIAL_CONTAINER_LOGIC.md` - Financial logic documentation
- `DUAL_SERVICE_TYPE_SUMMARY.md` - Business logic summary

---

## Migration History

| Migration | Date | Description |
|-----------|------|-------------|
| 20251118110101 | 2025-11-18 | Add advanced features |
| 20251205172907 | 2025-12-05 | Add accounting system |
| 20251205180000 | 2025-12-05 | Add audit logs |
| 20251205200000 | 2025-12-05 | Container system restructure |
| 20251206180000 | 2025-12-06 | Rename container photos to vehicle photos |
| 20251206221030 | 2025-12-06 | Add payment mode to shipment |
| **20260131183000** | **2026-01-31** | **Add service types and purchase fields** ← Current |

---

## Support

If you encounter issues with this migration:

1. Check the migration logs for error messages
2. Verify your PostgreSQL version is 12+
3. Ensure you have sufficient permissions (CREATE TYPE, ALTER TABLE)
4. Review the migration SQL file for any PostgreSQL compatibility issues
5. Contact the development team with specific error messages

---

**Migration Status:** ✅ Ready to Apply  
**Database Compatibility:** PostgreSQL 12+  
**Prisma Version:** 6.18.0+
