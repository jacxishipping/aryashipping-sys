ALTER TABLE "Shipment"
ADD COLUMN IF NOT EXISTS "shippingCompanyId" TEXT;

CREATE INDEX IF NOT EXISTS "Shipment_shippingCompanyId_idx" ON "Shipment"("shippingCompanyId");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'Shipment_shippingCompanyId_fkey'
    ) THEN
        ALTER TABLE "Shipment"
        ADD CONSTRAINT "Shipment_shippingCompanyId_fkey"
        FOREIGN KEY ("shippingCompanyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END
$$;
