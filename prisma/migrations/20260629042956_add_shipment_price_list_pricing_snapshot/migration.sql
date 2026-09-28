ALTER TABLE "Shipment"
ADD COLUMN IF NOT EXISTS "priceListPricingSnapshot" JSONB;
