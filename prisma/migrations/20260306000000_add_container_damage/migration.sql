-- Add DamageType enum
DO $$
BEGIN
        IF NOT EXISTS (
                SELECT 1
                FROM pg_type t
                JOIN pg_namespace n ON n.oid = t.typnamespace
                WHERE t.typname = 'DamageType'
                    AND n.nspname = current_schema()
        ) THEN
        CREATE TYPE "DamageType" AS ENUM ('WE_PAY', 'COMPANY_PAYS');
    END IF;
END $$;

-- Create ContainerDamage table
CREATE TABLE IF NOT EXISTS "ContainerDamage" (
    "id"          TEXT NOT NULL,
    "containerId" TEXT NOT NULL,
    "shipmentId"  TEXT NOT NULL,
    "damageType"  "DamageType" NOT NULL,
    "amount"      DOUBLE PRECISION NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContainerDamage_pkey" PRIMARY KEY ("id")
);

-- Add indexes
CREATE INDEX IF NOT EXISTS "ContainerDamage_containerId_idx" ON "ContainerDamage"("containerId");
CREATE INDEX IF NOT EXISTS "ContainerDamage_shipmentId_idx" ON "ContainerDamage"("shipmentId");
CREATE INDEX IF NOT EXISTS "ContainerDamage_damageType_idx" ON "ContainerDamage"("damageType");

-- Add foreign keys
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'ContainerDamage_containerId_fkey'
    ) THEN
        ALTER TABLE "ContainerDamage"
            ADD CONSTRAINT "ContainerDamage_containerId_fkey"
            FOREIGN KEY ("containerId") REFERENCES "Container"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'ContainerDamage_shipmentId_fkey'
    ) THEN
        ALTER TABLE "ContainerDamage"
            ADD CONSTRAINT "ContainerDamage_shipmentId_fkey"
            FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
