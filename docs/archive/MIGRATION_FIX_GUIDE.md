# Failed Migration Resolution Guide

## Problem

The migration `20251118110101_add_advanced_features` has failed in the production database.

**Error:**
```
Error: P3009
migrate found failed migrations in the target database, new migrations will not be applied.
The `20251118110101_add_advanced_features` migration started at 2026-02-07 00:33:30.611903 UTC failed
```

## Analysis

The migration attempted to:
1. Create a `ContainerStatus` enum (EMPTY, PARTIAL, FULL, SHIPPED, ARCHIVED)
2. Drop and recreate the `Container.status` column
3. Add a unique constraint on `Shipment.vehicleVIN`
4. Create QualityCheck, Document, and Route tables
5. Add fields to Shipment table

**Current State:**
- The schema now has `ContainerLifecycleStatus` instead of `ContainerStatus`
- The QualityCheck, Document, and Route tables already exist
- The Shipment.vehicleVIN field already exists with unique constraint
- The migration is in a failed state, blocking new migrations

## Resolution Strategy

Since the schema has evolved beyond this migration and the features it adds already exist (in modified form), we need to mark this migration as resolved without applying it.

### Steps to Resolve

1. **Mark the migration as resolved** - Tell Prisma the migration is complete even though it failed
2. **Verify the schema** - Ensure current schema matches expectations
3. **Test migrations** - Confirm new migrations can now be applied

## Implementation

### Option 1: Mark as Resolved (Recommended)

Use this when the migration partially applied or the features already exist:

```bash
npx prisma migrate resolve --applied 20251118110101_add_advanced_features
```

This tells Prisma: "This migration has been applied successfully, don't try to run it again."

### Option 2: Mark as Rolled Back

Use this if you want to completely skip this migration:

```bash
npx prisma migrate resolve --rolled-back 20251118110101_add_advanced_features
```

This tells Prisma: "This migration was rolled back, ignore it."

## Verification

After resolving, verify the fix:

```bash
# Check migration status
npx prisma migrate status

# Should show all migrations as applied
# Should allow new migrations to be created
```

## Why This Happened

This type of issue typically occurs when:
1. Migration was interrupted mid-execution
2. Database schema was modified manually
3. Schema evolved through other migrations
4. There were duplicate values preventing unique constraints

## Prevention

To prevent this in the future:
1. Always test migrations in a development environment first
2. Use `npx prisma migrate deploy` for production (not `npx prisma migrate dev`)
3. Backup database before running migrations
4. Never modify the database schema manually when using Prisma migrations
5. Resolve migration conflicts in development before deploying

## Related Documentation

- [Prisma Migration Issues](https://pris.ly/d/migrate-resolve)
- [P3009 Error Details](https://www.prisma.io/docs/reference/api-reference/error-reference#p3009)
