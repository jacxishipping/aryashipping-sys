# Resolving Failed Prisma Migration P3009

## Quick Fix

Run one of these commands to resolve the failed migration:

```bash
# Using npm script (recommended)
npm run db:migrate:resolve

# Or using the shell script
./scripts/resolve-failed-migration.sh

# Or manually
npx prisma migrate resolve --applied 20251118110101_add_advanced_features
```

## What Happened?

The migration `20251118110101_add_advanced_features` failed during execution, leaving your database in a state where Prisma won't apply new migrations.

**Error Message:**
```
Error: P3009
migrate found failed migrations in the target database, new migrations will not be applied.
The `20251118110101_add_advanced_features` migration started at 2026-02-07 00:33:30.611903 UTC failed
```

## Why It Failed

This migration attempted to:
1. Create a `ContainerStatus` enum
2. Drop and recreate the `Container.status` column
3. Add unique constraint on `Shipment.vehicleVIN`
4. Create QualityCheck, Document, and Route tables

**The Problem:**
- The schema evolved after this migration was created
- Features already exist in modified form:
  - `ContainerLifecycleStatus` exists instead of `ContainerStatus`
  - QualityCheck, Document, Route tables already exist
  - Shipment.vehicleVIN field already has unique constraint

## Solution

Since the features from this migration already exist in the current schema (in evolved form), we mark the migration as "resolved" to unblock future migrations.

### Automated Resolution

**Method 1: NPM Script (Easiest)**
```bash
npm run db:migrate:resolve
```

**Method 2: Shell Script**
```bash
./scripts/resolve-failed-migration.sh
```

**Method 3: Node.js Script**
```bash
node scripts/resolve-failed-migration.js
```

All three methods will:
1. Check current migration status
2. Explain the issue
3. Ask for confirmation
4. Mark the migration as resolved
5. Verify the fix

### Manual Resolution

If you prefer to do it manually:

```bash
# Mark the migration as applied (features exist in modified form)
npx prisma migrate resolve --applied 20251118110101_add_advanced_features

# Verify the fix
npx prisma migrate status
```

## After Resolution

Once resolved, you should see:

```bash
$ npx prisma migrate status

Prisma schema loaded from prisma/schema.prisma

Database schema is up to date!
```

This means:
- ✅ All migrations are marked as applied
- ✅ New migrations can be created and applied
- ✅ Database is in a consistent state

## Testing the Fix

```bash
# 1. Check migration status
npm run db:migrate:status

# 2. Try generating Prisma client (should work)
npm run db:generate

# 3. Try deploying migrations (should work)
npm run db:migrate:deploy
```

## Prevention

To avoid this in the future:

1. **Always test migrations in development first**
   ```bash
   # Development
   npm run db:migrate
   
   # Production
   npm run db:migrate:deploy
   ```

2. **Never modify database schema manually**
   - Use Prisma migrations only
   - Don't run raw SQL that changes structure

3. **Backup before migrations**
   ```bash
   npm run db:backup
   ```

4. **Monitor migration status**
   ```bash
   npm run db:migrate:status
   ```

## Rollback Option

If you prefer to skip this migration entirely:

```bash
npx prisma migrate resolve --rolled-back 20251118110101_add_advanced_features
```

Use this if:
- You want to completely ignore this migration
- You'll recreate the features with new migrations

## Troubleshooting

### Error: "Cannot connect to database"
**Solution:** Check your `.env` file has correct `jacxi_DATABASE_URL`

### Error: "Migration already marked as applied"
**Solution:** The migration is already resolved! Check status with:
```bash
npm run db:migrate:status
```

### Error: "Permission denied"
**Solution:** Make scripts executable:
```bash
chmod +x scripts/resolve-failed-migration.sh
chmod +x scripts/resolve-failed-migration.js
```

## Related Documentation

- [Prisma Migrate Resolve](https://www.prisma.io/docs/reference/api-reference/command-reference#migrate-resolve)
- [Error P3009](https://www.prisma.io/docs/reference/api-reference/error-reference#p3009)
- [Migration Troubleshooting](https://pris.ly/d/migrate-resolve)

## Support Files

- `MIGRATION_FIX_GUIDE.md` - Detailed technical explanation
- `scripts/resolve-failed-migration.sh` - Bash script
- `scripts/resolve-failed-migration.js` - Node.js script

## Summary

This is a safe operation that tells Prisma to mark the failed migration as complete, since its features already exist in the current schema in evolved form. After resolution, your database will be in a consistent state and able to apply future migrations.
