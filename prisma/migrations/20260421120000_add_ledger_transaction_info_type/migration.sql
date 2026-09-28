DO $$ BEGIN
    CREATE TYPE "TransactionInfoType" AS ENUM ('CAR_PAYMENT', 'SHIPPING_PAYMENT', 'STORAGE_PAYMENT');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "LedgerEntry"
ADD COLUMN IF NOT EXISTS "transactionInfoType" "TransactionInfoType";

UPDATE "LedgerEntry"
SET "transactionInfoType" = CASE
    WHEN "metadata"->>'transactionInfoType' = 'CAR_PAYMENT' THEN 'CAR_PAYMENT'::"TransactionInfoType"
    WHEN "metadata"->>'transactionInfoType' = 'SHIPPING_PAYMENT' THEN 'SHIPPING_PAYMENT'::"TransactionInfoType"
    WHEN "metadata"->>'transactionInfoType' = 'STORAGE_PAYMENT' THEN 'STORAGE_PAYMENT'::"TransactionInfoType"
    ELSE NULL
END
WHERE "transactionInfoType" IS NULL;

CREATE INDEX IF NOT EXISTS "LedgerEntry_transactionInfoType_idx"
ON "LedgerEntry"("transactionInfoType");
