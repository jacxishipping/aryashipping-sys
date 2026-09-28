-- Create enums safely
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_type t
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE t.typname = 'PaymentMode' AND n.nspname = current_schema()
    ) THEN
        CREATE TYPE "PaymentMode" AS ENUM ('CASH', 'DUE');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_type t
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE t.typname = 'LedgerEntryType' AND n.nspname = current_schema()
    ) THEN
        CREATE TYPE "LedgerEntryType" AS ENUM ('DEBIT', 'CREDIT');
    END IF;
END $$;

-- Add paymentMode column to Shipment if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = current_schema() AND table_name = 'Shipment'
        AND column_name = 'paymentMode'
    ) THEN
        ALTER TABLE "Shipment" ADD COLUMN "paymentMode" "PaymentMode";
    END IF;
END $$;

-- Create LedgerEntry table if missing
CREATE TABLE IF NOT EXISTS "LedgerEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "shipmentId" TEXT,
    "transactionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT NOT NULL,
    "type" "LedgerEntryType" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "balance" DOUBLE PRECISION NOT NULL,
    "createdBy" TEXT NOT NULL,
    "notes" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LedgerEntry_pkey" PRIMARY KEY ("id")
);

-- Create indexes if missing
CREATE INDEX IF NOT EXISTS "LedgerEntry_userId_idx" ON "LedgerEntry"("userId");
CREATE INDEX IF NOT EXISTS "LedgerEntry_shipmentId_idx" ON "LedgerEntry"("shipmentId");
CREATE INDEX IF NOT EXISTS "LedgerEntry_transactionDate_idx" ON "LedgerEntry"("transactionDate");

-- Add foreign keys if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'LedgerEntry_userId_fkey'
    ) THEN
        ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'LedgerEntry_shipmentId_fkey'
    ) THEN
        ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_shipmentId_fkey"
        FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
