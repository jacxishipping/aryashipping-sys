# Finicity Bank Sync Setup

This project now supports automatic bank transaction sync into the user ledger through Finicity.

## Required environment variables

Set these before using the Banking page auto-sync flow:

```env
FINICITY_PARTNER_ID=your_finicity_partner_id
FINICITY_PARTNER_SECRET=your_finicity_partner_secret
FINICITY_APP_KEY=your_finicity_app_key
FINICITY_ENCRYPTION_KEY=a-long-random-secret-used-to-encrypt-customer-ids
NEXT_PUBLIC_APP_URL=https://your-app-url
CRON_SECRET=your-cron-secret
```

For Prisma schema changes and migrations in this repo, these database env vars must also exist:

```env
jacxi_PRISMA_DATABASE_URL=postgresql://...
jacxi_POSTGRES_URL=postgresql://...
```

## Database step

After pulling the code, create and apply the Prisma migration:

```bash
npm run db:migrate -- --name add_plaid_bank_sync
npm run db:generate
```

## Runtime behavior

- Banking page manual sync endpoint: `/api/finicity/sync`
- Banking page connection bootstrap: `/api/finicity/connect-url`
- Banking page hosted-return page: `/dashboard/finance/banking/finicity-return`
- Scheduled background sync endpoint: `/api/cron/sync-bank-transactions`

The cron endpoint requires:

```http
Authorization: Bearer $CRON_SECRET
```

## Notes

- Finicity transactions are imported into the existing user ledger.
- Imported Finicity rows are marked with `importSource = FINICITY_TRANSACTIONS` in ledger metadata.
- The Banking page still supports CSV upload as a fallback.