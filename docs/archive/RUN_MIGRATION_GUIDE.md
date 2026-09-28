# 🚀 Run Database Migration - Step by Step Guide

## Current Status

✅ **Schema is ready** - The new container system schema is in `/workspace/prisma/schema.prisma`  
✅ **Migration SQL is ready** - Migration file created in `/workspace/prisma/migrations/`  
⏸️ **Dependencies needed** - Need to install npm packages to run Prisma CLI  

---

## How to Run the Migration

### **Option 1: Local Development (Recommended)**

If you're running this locally on your machine:

```bash
# 1. Make sure you're in the project directory
cd /workspace

# 2. Install dependencies (if not already installed)
npm install

# 3. Make sure DATABASE_URL is set in .env file
# Example: DATABASE_URL="postgresql://user:password@localhost:5432/database"

# 4. Run the migration
npm run db:migrate

# OR use Prisma CLI directly
npx prisma migrate dev --name container_system_restructure
```

---

### **Option 2: If Dependencies Are Already Installed**

Just run:

```bash
npm run db:migrate
```

---

### **Option 3: Manual Migration (Production)**

If you need to run this in production or without npm:

```bash
# 1. Set your DATABASE_URL
export DATABASE_URL="postgresql://user:password@localhost:5432/database"

# 2. Run migration deploy (doesn't prompt)
npx prisma migrate deploy
```

---

## What the Migration Will Do

### **Creates New Tables:**
- ✅ `Container` - Enhanced with full shipping data
- ✅ `ContainerExpense` - Container-level expenses
- ✅ `ContainerInvoice` - Container invoicing
- ✅ `ContainerDocument` - Document management
- ✅ `ContainerTrackingEvent` - Real-time tracking
- ✅ `ContainerAuditLog` - Complete audit trail

### **Modifies Existing Tables:**
- ✅ `Shipment` - Simplified (removes shipping fields, adds container reference)
- ✅ Adds new enums: `ShipmentSimpleStatus`, `ContainerLifecycleStatus`

### **Staged Migration (Safe):**
The migration is designed to run in stages:
1. Creates new tables alongside old ones
2. Allows data migration
3. Then removes old structures

---

## ⚠️ Before Running Migration

### 1. **Backup Your Database**
```bash
# Using pg_dump (PostgreSQL)
pg_dump -h localhost -U your_user -d your_database > backup_$(date +%Y%m%d_%H%M%S).sql

# OR use the project's backup script
npm run db:backup
```

### 2. **Check Your Database Connection**
```bash
# Test connection
npx prisma db pull

# Should show your current schema
```

### 3. **Review the Migration**
The migration SQL is in:
```
/workspace/prisma/migrations/20251205200000_container_system_restructure/migration.sql
```

Review it to understand what changes will be made.

---

## Expected Output

When you run the migration successfully, you should see:

```
Environment variables loaded from .env
Prisma schema loaded from prisma/schema.prisma
Datasource "db": PostgreSQL database "your_database"

Applying migration `20251205200000_container_system_restructure`

The following migration(s) have been created and applied from new schema changes:

migrations/
  └─ 20251205200000_container_system_restructure/
    └─ migration.sql

Your database is now in sync with your schema.

✔ Generated Prisma Client (v6.18.0)
```

---

## Troubleshooting

### Issue: "DATABASE_URL not found"
**Solution:** Create a `.env` file with:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/database"
```

### Issue: "Prisma not found"
**Solution:** Install dependencies:
```bash
npm install
```

### Issue: "Migration already applied"
**Solution:** The migration has already run. Check with:
```bash
npx prisma migrate status
```

### Issue: "Connection refused"
**Solution:** Make sure your PostgreSQL database is running:
```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql

# Or start it
sudo systemctl start postgresql
```

---

## After Migration

### 1. **Generate Prisma Client**
```bash
npm run db:generate
# OR
npx prisma generate
```

### 2. **Verify Schema**
```bash
npx prisma studio
# Opens a browser to view your database
```

### 3. **Test the Application**
```bash
npm run dev
# Navigate to /dashboard/containers
```

---

## Data Migration (If Needed)

If you have existing shipments that need to be migrated:

### **Option A: Automatic (Run SQL)**
```sql
-- Update existing shipments to new status values
UPDATE "Shipment" 
SET status = CASE
  WHEN status IN ('PENDING', 'QUOTE_REQUESTED', 'PICKUP_SCHEDULED') 
    THEN 'ON_HAND'
  ELSE 'IN_TRANSIT'
END
WHERE status IS NOT NULL;

-- Set containerId to NULL for ON_HAND shipments
UPDATE "Shipment" 
SET "containerId" = NULL 
WHERE status = 'ON_HAND';
```

### **Option B: Manual (Use Prisma Studio)**
1. Open Prisma Studio: `npx prisma studio`
2. Navigate to Shipment table
3. Update status values manually
4. Assign containers as needed

---

## Rollback (If Needed)

If something goes wrong, you can rollback:

```bash
# 1. Restore from backup
psql -h localhost -U your_user -d your_database < backup_file.sql

# 2. OR use Prisma migrate resolve
npx prisma migrate resolve --rolled-back 20251205200000_container_system_restructure
```

---

## Quick Command Reference

```bash
# Install dependencies
npm install

# Run migration
npm run db:migrate

# Generate Prisma Client
npm run db:generate

# Open database browser
npm run db:studio

# Check migration status
npx prisma migrate status

# Create backup
npm run db:backup

# Reset database (⚠️ DANGER - deletes all data)
npm run db:reset
```

---

## Environment Setup

### Required Environment Variables

Create or update your `.env` file:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/database"

# NextAuth (if not already set)
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"

# Optional: Cron Job Secret
CRON_SECRET="your-cron-secret"
```

---

## Docker Setup (If Using Docker)

If you're using Docker:

```bash
# Start PostgreSQL container
docker-compose up -d postgres

# Run migration inside container
docker-compose exec app npm run db:migrate

# OR run from host
DATABASE_URL="postgresql://user:password@localhost:5432/database" npm run db:migrate
```

---

## Production Deployment

For production:

```bash
# 1. Backup production database
pg_dump $DATABASE_URL > production_backup.sql

# 2. Run migration deploy (no prompts)
npx prisma migrate deploy

# 3. Generate Prisma Client
npx prisma generate

# 4. Restart your application
pm2 restart your-app
# OR
systemctl restart your-service
```

---

## Summary

**What you need to do:**

1. ✅ Install dependencies: `npm install`
2. ✅ Set DATABASE_URL in `.env`
3. ✅ Backup database (optional but recommended)
4. ✅ Run migration: `npm run db:migrate`
5. ✅ Test application

**Time required:** 2-5 minutes (depending on database size)

**Risk level:** Low (migration is staged and reversible)

---

## Need Help?

If you encounter issues:

1. Check the migration SQL file to understand changes
2. Review error messages carefully
3. Ensure DATABASE_URL is correct
4. Make sure PostgreSQL is running
5. Try running with `--skip-generate` if client generation fails

---

**Status:** Ready to run ✅  
**Risk:** Low (staged migration)  
**Estimated time:** 2-5 minutes  
**Backup recommended:** Yes ✅

**Run when ready!** 🚀
