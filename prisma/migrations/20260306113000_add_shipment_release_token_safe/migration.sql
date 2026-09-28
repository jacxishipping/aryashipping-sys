-- Add release token columns to Shipment without data loss
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = current_schema() AND table_name = 'Shipment'
          AND column_name = 'releaseToken'
    ) THEN
        ALTER TABLE "Shipment"
        ADD COLUMN "releaseToken" TEXT;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = current_schema() AND table_name = 'Shipment'
          AND column_name = 'releaseTokenCreatedAt'
    ) THEN
        ALTER TABLE "Shipment"
        ADD COLUMN "releaseTokenCreatedAt" TIMESTAMP(3);
    END IF;
END $$;

-- Ensure token uniqueness for generated values
CREATE UNIQUE INDEX IF NOT EXISTS "Shipment_releaseToken_key" ON "Shipment"("releaseToken");
