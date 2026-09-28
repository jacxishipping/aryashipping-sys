# Shipments Display Fix - API Column Issue

## Problem
Shipments were not displaying due to a Prisma error:
```
Invalid `prisma.shipment.findMany()` invocation:
The column `Shipment.vehiclePhotos` does not exist in the current database.
```

The error was occurring in `/api/search` route when trying to query shipments.

## Root Cause
The Prisma schema defines fields `vehiclePhotos` and `arrivalPhotos` on the Shipment model, but these columns don't exist in the actual database. The search API was using `include` without explicitly selecting fields, causing Prisma to try fetching ALL columns from the Shipment table, including the non-existent ones.

## Solution
Updated all affected API routes to use explicit `select` statements instead of relying on `include` to fetch all fields implicitly. This ensures only existing database columns are queried.

### Files Modified

#### 1. `/workspace/src/app/api/search/route.ts`
**Change**: Replaced `include` with explicit `select` for Shipment fields
- Now explicitly lists all fields to query from Shipment table
- Maintains `select` for related user and container data
- Avoids querying non-existent `vehiclePhotos` and `arrivalPhotos` columns

**Before:**
```typescript
prisma.shipment.findMany({
  where,
  include: {
    user: { select: {...} },
    container: { select: {...} }
  }
})
```

**After:**
```typescript
prisma.shipment.findMany({
  where,
  select: {
    id: true,
    vehicleType: true,
    vehicleMake: true,
    // ... all existing fields explicitly listed
    user: { select: {...} },
    container: { select: {...} }
  }
})
```

#### 2. `/workspace/src/app/api/shipments/[id]/route.ts`
**Change**: Applied same explicit `select` pattern to shipment detail endpoint
- Updated GET handler to use `select` instead of `include`
- Lists all existing Shipment fields explicitly
- Prevents querying non-existent photo columns

**Fields Included:**
- Vehicle info: type, make, model, year, VIN, color
- Metadata: lot number, auction name, keys, title info
- Physical: weight, dimensions, insurance value
- Status: status, containerId, payment info
- Relations: user, container (with tracking events), ledger entries

## Why This Approach

### Option 1: Run Migration (Not Chosen)
- Would add the missing columns to the database
- Requires database access and migration execution
- Risk of breaking existing data
- Takes time to propagate

### Option 2: Explicit Field Selection (Chosen) ✅
- **Immediate fix** - works with current database structure
- **No database changes** required
- **Safer** - explicitly controls what's queried
- **Better performance** - only fetches needed fields
- **Type-safe** - TypeScript ensures field names are correct

## Testing
After applying these changes:
1. ✅ `/api/search` route works without errors
2. ✅ `/api/shipments` route continues to work (was already safe)
3. ✅ `/api/shipments/[id]` route works without errors
4. ✅ Dashboard displays shipments correctly
5. ✅ Shipments list page displays data
6. ✅ Search functionality works

## Future Consideration
If photo storage is needed:
1. Create a proper migration to add `vehiclePhotos` and `arrivalPhotos` columns
2. Update the schema accordingly
3. Update APIs to include these fields in select statements
4. Implement photo upload/display UI

## Related Files
- Schema: `/workspace/prisma/schema.prisma` (defines vehiclePhotos/arrivalPhotos)
- Migration: `/workspace/prisma/migrations/20251205200000_container_system_restructure/migration.sql` (mentions renaming containerPhotos to vehiclePhotos)

## Conclusion
The shipments are now displaying correctly by ensuring API routes only query columns that actually exist in the database. This is a robust solution that doesn't require database migrations or schema changes.
