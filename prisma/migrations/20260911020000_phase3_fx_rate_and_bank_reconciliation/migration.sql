-- Phase 3: FX rate snapshots + bank reconciliation table

-- 1. ExchangeRate table
CREATE TABLE "ExchangeRate" (
    "id" TEXT NOT NULL,
    "base" TEXT NOT NULL DEFAULT 'USD',
    "currency" TEXT NOT NULL,
    "rate" DOUBLE PRECISION NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "effective" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ExchangeRate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ExchangeRate_currency_effective_key" ON "ExchangeRate"("currency", "effective");
CREATE INDEX "ExchangeRate_currency_idx" ON "ExchangeRate"("currency");
CREATE INDEX "ExchangeRate_effective_idx" ON "ExchangeRate"("effective");

-- 2. BankReconciliation table
CREATE TABLE "BankReconciliation" (
    "id" TEXT NOT NULL,
    "bankSource" TEXT NOT NULL,
    "sourceKey" TEXT NOT NULL,
    "ledgerEntryId" TEXT,
    "invoiceId" TEXT,
    "matchedAt" TIMESTAMP(3),
    "matchedBy" TEXT,
    "status" TEXT NOT NULL DEFAULT 'UNMATCHED',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "BankReconciliation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BankReconciliation_bankSource_sourceKey_key" ON "BankReconciliation"("bankSource", "sourceKey");
CREATE INDEX "BankReconciliation_ledgerEntryId_idx" ON "BankReconciliation"("ledgerEntryId");
CREATE INDEX "BankReconciliation_invoiceId_idx" ON "BankReconciliation"("invoiceId");
CREATE INDEX "BankReconciliation_status_idx" ON "BankReconciliation"("status");

ALTER TABLE "BankReconciliation" ADD CONSTRAINT "BankReconciliation_ledgerEntryId_fkey" FOREIGN KEY ("ledgerEntryId") REFERENCES "LedgerEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BankReconciliation" ADD CONSTRAINT "BankReconciliation_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "UserInvoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 3. Add FX snapshot fields to UserInvoice
ALTER TABLE "UserInvoice" ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'USD';
ALTER TABLE "UserInvoice" ADD COLUMN "fxRate" DOUBLE PRECISION;
ALTER TABLE "UserInvoice" ADD COLUMN "fxEffective" TIMESTAMP(3);

-- 4. Add InvoiceLineItem.chargeId link to ShipmentCharge
ALTER TABLE "InvoiceLineItem" ADD COLUMN "chargeId" TEXT;
CREATE INDEX "InvoiceLineItem_chargeId_idx" ON "InvoiceLineItem"("chargeId");
ALTER TABLE "InvoiceLineItem" ADD CONSTRAINT "InvoiceLineItem_chargeId_fkey" FOREIGN KEY ("chargeId") REFERENCES "ShipmentCharge"("id") ON DELETE SET NULL ON UPDATE CASCADE;
