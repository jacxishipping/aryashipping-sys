-- CreateEnum
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_type t
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE t.typname = 'TransitStatus'
            AND n.nspname = current_schema()
    ) THEN
        CREATE TYPE "TransitStatus" AS ENUM ('PENDING', 'DISPATCHED', 'IN_TRANSIT', 'ARRIVED', 'DELIVERED', 'CANCELLED');
    END IF;
END $$;

-- AlterEnum: Add IN_TRANSIT_TO_DESTINATION to ShipmentSimpleStatus
ALTER TYPE "ShipmentSimpleStatus" ADD VALUE IF NOT EXISTS 'IN_TRANSIT_TO_DESTINATION';

-- AlterTable: Add transitId to Shipment
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = current_schema() AND table_name = 'Shipment' AND column_name = 'transitId'
    ) THEN
        ALTER TABLE "Shipment" ADD COLUMN "transitId" TEXT;
    END IF;
END $$;

-- CreateTable: Transit
CREATE TABLE IF NOT EXISTS "Transit" (
    "id" TEXT NOT NULL,
    "referenceNumber" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "origin" TEXT NOT NULL DEFAULT 'Dubai, UAE',
    "destination" TEXT NOT NULL DEFAULT 'Kabul, Afghanistan',
    "status" "TransitStatus" NOT NULL DEFAULT 'PENDING',
    "dispatchDate" TIMESTAMP(3),
    "estimatedDelivery" TIMESTAMP(3),
    "actualDelivery" TIMESTAMP(3),
    "cost" DOUBLE PRECISION,
    "notes" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transit_pkey" PRIMARY KEY ("id")
);

-- CreateTable: TransitEvent
CREATE TABLE IF NOT EXISTS "TransitEvent" (
    "id" TEXT NOT NULL,
    "transitId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "location" TEXT,
    "description" TEXT,
    "eventDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TransitEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable: TransitExpense
CREATE TABLE IF NOT EXISTS "TransitExpense" (
    "id" TEXT NOT NULL,
    "transitId" TEXT NOT NULL,
    "shipmentId" TEXT,
    "description" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "category" TEXT,
    "notes" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransitExpense_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Transit_referenceNumber_key" ON "Transit"("referenceNumber");
CREATE INDEX IF NOT EXISTS "Transit_companyId_idx" ON "Transit"("companyId");
CREATE INDEX IF NOT EXISTS "Transit_status_idx" ON "Transit"("status");
CREATE INDEX IF NOT EXISTS "TransitEvent_transitId_idx" ON "TransitEvent"("transitId");
CREATE INDEX IF NOT EXISTS "TransitEvent_eventDate_idx" ON "TransitEvent"("eventDate");
CREATE INDEX IF NOT EXISTS "TransitExpense_transitId_idx" ON "TransitExpense"("transitId");
CREATE INDEX IF NOT EXISTS "TransitExpense_shipmentId_idx" ON "TransitExpense"("shipmentId");
CREATE INDEX IF NOT EXISTS "Shipment_transitId_idx" ON "Shipment"("transitId");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Shipment_transitId_fkey') THEN
        ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_transitId_fkey" FOREIGN KEY ("transitId") REFERENCES "Transit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = current_schema() AND table_name = 'Company'
    ) AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Transit_companyId_fkey') THEN
        ALTER TABLE "Transit" ADD CONSTRAINT "Transit_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TransitEvent_transitId_fkey') THEN
        ALTER TABLE "TransitEvent" ADD CONSTRAINT "TransitEvent_transitId_fkey" FOREIGN KEY ("transitId") REFERENCES "Transit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TransitExpense_transitId_fkey') THEN
        ALTER TABLE "TransitExpense" ADD CONSTRAINT "TransitExpense_transitId_fkey" FOREIGN KEY ("transitId") REFERENCES "Transit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TransitExpense_shipmentId_fkey') THEN
        ALTER TABLE "TransitExpense" ADD CONSTRAINT "TransitExpense_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
