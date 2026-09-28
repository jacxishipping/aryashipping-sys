CREATE TABLE IF NOT EXISTS "CompanyPriceList" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "destinationLabel" TEXT NOT NULL,
    "sourceFileName" TEXT NOT NULL,
    "importMode" TEXT NOT NULL,
    "config" JSONB NOT NULL DEFAULT '{}',
    "importedStateRateCount" INTEGER NOT NULL DEFAULT 0,
    "importedAuctionRateCount" INTEGER NOT NULL DEFAULT 0,
    "warnings" JSONB NOT NULL DEFAULT '[]',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "effectiveFrom" TIMESTAMP(3),
    "importedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyPriceList_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "CompanyPriceList_companyId_idx" ON "CompanyPriceList"("companyId");
CREATE INDEX IF NOT EXISTS "CompanyPriceList_isActive_idx" ON "CompanyPriceList"("isActive");
CREATE INDEX IF NOT EXISTS "CompanyPriceList_createdAt_idx" ON "CompanyPriceList"("createdAt");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'CompanyPriceList_companyId_fkey'
    ) THEN
        ALTER TABLE "CompanyPriceList"
        ADD CONSTRAINT "CompanyPriceList_companyId_fkey"
        FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
