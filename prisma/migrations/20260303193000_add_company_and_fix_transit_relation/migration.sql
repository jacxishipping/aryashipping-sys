-- Add missing enum variant (additive)
ALTER TYPE "ShipmentSimpleStatus" ADD VALUE IF NOT EXISTS 'DELIVERED';

-- CreateTable: Company (if missing)
CREATE TABLE IF NOT EXISTS "Company" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "country" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable: CompanyLedgerEntry (if missing)
CREATE TABLE IF NOT EXISTS "CompanyLedgerEntry" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "transactionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT NOT NULL,
    "type" "LedgerEntryType" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "balance" DOUBLE PRECISION NOT NULL,
    "category" TEXT,
    "reference" TEXT,
    "notes" TEXT,
    "metadata" JSONB,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyLedgerEntry_pkey" PRIMARY KEY ("id")
);

-- Create indexes/constraints idempotently
CREATE UNIQUE INDEX IF NOT EXISTS "Company_code_key" ON "Company"("code");
CREATE INDEX IF NOT EXISTS "Company_name_idx" ON "Company"("name");
CREATE INDEX IF NOT EXISTS "Company_isActive_idx" ON "Company"("isActive");
CREATE INDEX IF NOT EXISTS "CompanyLedgerEntry_companyId_idx" ON "CompanyLedgerEntry"("companyId");
CREATE INDEX IF NOT EXISTS "CompanyLedgerEntry_transactionDate_idx" ON "CompanyLedgerEntry"("transactionDate");
CREATE INDEX IF NOT EXISTS "CompanyLedgerEntry_type_idx" ON "CompanyLedgerEntry"("type");
CREATE INDEX IF NOT EXISTS "Shipment_serviceType_idx" ON "Shipment"("serviceType");
CREATE INDEX IF NOT EXISTS "User_loginCode_idx" ON "User"("loginCode");

-- Backfill Transit.companyId to a safe default company for any orphan values
DO $$
DECLARE
    fallback_company_id TEXT := 'cmp_default_transit';
BEGIN
    INSERT INTO "Company" ("id", "name", "code", "isActive", "createdAt", "updatedAt")
    VALUES (fallback_company_id, 'Default Transit Company', 'DEFAULT_TRANSIT', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT ("id") DO NOTHING;

    UPDATE "Transit" t
    SET "companyId" = fallback_company_id
    WHERE NOT EXISTS (
        SELECT 1
        FROM "Company" c
        WHERE c."id" = t."companyId"
    );
END
$$;

-- Add missing foreign keys only if absent
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'CompanyLedgerEntry_companyId_fkey'
    ) THEN
        ALTER TABLE "CompanyLedgerEntry"
        ADD CONSTRAINT "CompanyLedgerEntry_companyId_fkey"
        FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'Transit_companyId_fkey'
    ) THEN
        ALTER TABLE "Transit"
        ADD CONSTRAINT "Transit_companyId_fkey"
        FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON UPDATE CASCADE;
    END IF;
END
$$;
