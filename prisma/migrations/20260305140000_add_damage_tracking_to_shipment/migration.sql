-- Add damage tracking fields to shipment
ALTER TABLE "Shipment" ADD COLUMN "damageCost" DOUBLE PRECISION;
ALTER TABLE "Shipment" ADD COLUMN "damageCredit" DOUBLE PRECISION;

-- Add comment to clarify the purpose
COMMENT ON COLUMN "Shipment"."damageCost" IS 'Cost of damage charged to company (company ledger debit)';
COMMENT ON COLUMN "Shipment"."damageCredit" IS 'Credit given to customer for damage assumed by company (user ledger credit)';
