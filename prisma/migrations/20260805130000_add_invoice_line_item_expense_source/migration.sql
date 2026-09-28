ALTER TABLE "InvoiceLineItem"
ADD COLUMN IF NOT EXISTS "expenseSource" TEXT;

CREATE INDEX IF NOT EXISTS "InvoiceLineItem_expenseSource_idx"
ON "InvoiceLineItem"("expenseSource");