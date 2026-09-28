# 🚨 Failed Migration - Quick Fix

## TL;DR - Fix in 30 seconds

```bash
npm run db:migrate:resolve
```

That's it! ✅

---

## What This Does

Marks the failed migration `20251118110101_add_advanced_features` as resolved, allowing new migrations to proceed.

---

## Why It's Safe

The migration's features already exist in your schema:
- ✅ QualityCheck table ✓
- ✅ Document table ✓  
- ✅ Route table ✓
- ✅ Container status field ✓
- ✅ Shipment VIN unique constraint ✓

Marking it as resolved is just telling Prisma "yes, these features are applied" (even though they evolved slightly differently).

---

## Alternative Commands

```bash
# Bash script
./scripts/resolve-failed-migration.sh

# Node script  
node scripts/resolve-failed-migration.js

# Manual
npx prisma migrate resolve --applied 20251118110101_add_advanced_features
```

---

## Verify After Fix

```bash
npm run db:migrate:status
# Should show: "Database schema is up to date!"
```

---

## Need More Info?

- **Quick Guide**: `RESOLVE_MIGRATION.md`
- **Technical Details**: `MIGRATION_FIX_GUIDE.md`

---

## Troubleshooting

**Can't connect to database?**
→ Check `.env` has `jacxi_DATABASE_URL`

**Permission denied?**
→ Run: `chmod +x scripts/resolve-failed-migration.sh`

**Still stuck?**
→ Read `RESOLVE_MIGRATION.md` for detailed help

---

## What NOT To Do

❌ Don't manually edit the database
❌ Don't delete migration files
❌ Don't run `db:reset` in production

✅ Just run the resolve script!
