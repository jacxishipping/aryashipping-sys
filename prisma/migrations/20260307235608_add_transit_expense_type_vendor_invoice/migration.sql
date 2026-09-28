-- Add type, vendor, invoiceNumber fields to TransitExpense
-- to match the ContainerExpense schema for consistent expense management

ALTER TABLE "TransitExpense" ADD COLUMN IF NOT EXISTS "type" TEXT NOT NULL DEFAULT 'OTHER';
ALTER TABLE "TransitExpense" ADD COLUMN IF NOT EXISTS "vendor" TEXT;
ALTER TABLE "TransitExpense" ADD COLUMN IF NOT EXISTS "invoiceNumber" TEXT;

-- Add index for the new type field
CREATE INDEX IF NOT EXISTS "TransitExpense_type_idx" ON "TransitExpense"("type");
