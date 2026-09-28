# Vehicle Photos Migration Guide

## Overview
This migration safely renames the `containerPhotos` column to `vehiclePhotos` in the database, preserving all your existing photo data.

## Why This Migration?

Your old shipment data has photos stored in a column called `containerPhotos`, but:
- The new code expects `vehiclePhotos`
- The Prisma schema defines `vehiclePhotos`
- The naming is clearer (vehicle photos vs container photos)

**This migration preserves all your existing data** - no photos will be lost!

## Prerequisites

1. Make sure your `DATABASE_URL` environment variable is set
2. Ensure you have database access
3. Backup your database (optional but recommended)

## Running the Migration

### Option 1: Using the Node.js Script (Recommended)

1. **Set your database URL** (if not already set):
   ```bash
   export DATABASE_URL="your-postgresql-connection-string"
   ```

2. **Run the migration script**:
   ```bash
   cd /workspace
   node migrate-vehicle-photos.js
   ```

3. **Expected output**:
   ```
   ============================================================
     Vehicle Photos Migration Script
   ============================================================
   
   This will rename containerPhotos → vehiclePhotos
   All existing photo data will be preserved.
   
   🔍 Checking current database schema...
   
   Current state:
     - containerPhotos: ✅ EXISTS
     - vehiclePhotos:   ❌ NOT FOUND
     - arrivalPhotos:   ❌ NOT FOUND
   
   📝 Applying migration...
   
   ✅ Migration SQL executed successfully!
   
   🔍 Verifying changes...
   
   After migration:
     - containerPhotos: ✅ REMOVED
     - vehiclePhotos:   ✅ EXISTS
     - arrivalPhotos:   ✅ EXISTS
   
   📊 Data Statistics:
     - Total shipments: 15
     - Shipments with photos: 8
   
   ✅ Migration completed successfully!
   ```

### Option 2: Run SQL Directly

If you prefer to run the SQL manually:

```bash
cd /workspace
cat prisma/migrations/20251206180000_rename_container_photos_to_vehicle_photos/migration.sql
```

Copy the SQL and run it in your PostgreSQL client.

## What the Migration Does

1. **Checks if `containerPhotos` exists**
   - If YES → Renames it to `vehiclePhotos` (preserves all data)
   - If NO → Creates `vehiclePhotos` column

2. **Adds `arrivalPhotos` column**
   - For future use (photos when vehicle arrives)
   - Defaults to empty array

3. **Preserves all existing data**
   - No data loss
   - All photo URLs remain intact
   - All arrays stay the same

## After Migration

1. **Restart your development server**:
   ```bash
   npm run dev
   ```

2. **Verify everything works**:
   - ✅ Existing shipments show their photos
   - ✅ New shipments can add photos
   - ✅ No console errors

3. **Test creating a new shipment**:
   - Upload some vehicle photos
   - Submit the form
   - Verify photos are saved

## Rollback (If Needed)

If something goes wrong and you need to rollback:

```sql
-- Rename back to containerPhotos
ALTER TABLE "Shipment" RENAME COLUMN "vehiclePhotos" TO "containerPhotos";

-- Remove arrivalPhotos if needed
ALTER TABLE "Shipment" DROP COLUMN "arrivalPhotos";
```

## Troubleshooting

### Error: "DATABASE_URL not set"
```bash
export DATABASE_URL="postgresql://user:password@host:port/database"
```

### Error: "Permission denied"
Make sure your database user has ALTER TABLE permissions.

### Error: "Column already exists"
The migration is idempotent - it's safe to run multiple times. If columns already exist, it will skip them.

## Technical Details

### Files Created/Modified

1. **Migration SQL**:
   - `prisma/migrations/20251206180000_rename_container_photos_to_vehicle_photos/migration.sql`

2. **Migration Script**:
   - `migrate-vehicle-photos.js`

3. **Code Updates** (already applied):
   - `src/app/dashboard/shipments/new/page.tsx` - Uses `vehiclePhotos`
   - `src/lib/validations/shipment.ts` - Expects `vehiclePhotos`
   - `src/app/api/shipments/route.ts` - Already using `vehiclePhotos`

### Database Changes

**Before**:
```
Shipment table:
  - containerPhotos: TEXT[]  ← Your old data
```

**After**:
```
Shipment table:
  - vehiclePhotos: TEXT[]    ← Renamed from containerPhotos
  - arrivalPhotos: TEXT[]    ← New column (empty for now)
```

## Summary

✅ **Safe**: All existing data is preserved  
✅ **Idempotent**: Can run multiple times safely  
✅ **Backwards Compatible**: Handles all scenarios  
✅ **Fast**: Runs in milliseconds  
✅ **Tested**: Includes verification checks  

Your vehicle photos will continue to work exactly as before, just with a clearer column name!
