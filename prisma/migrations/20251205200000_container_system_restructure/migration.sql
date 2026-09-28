-- Container System Restructure Migration
-- ⚠️ MAJOR BREAKING CHANGE - This completely restructures the system
-- Backup your data before running this migration!

-- ============================================
-- STEP 1: Create new enums
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'ShipmentSimpleStatus'
      AND n.nspname = current_schema()
  ) THEN
    CREATE TYPE "ShipmentSimpleStatus" AS ENUM ('ON_HAND', 'IN_TRANSIT');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'ContainerLifecycleStatus'
      AND n.nspname = current_schema()
  ) THEN
    CREATE TYPE "ContainerLifecycleStatus" AS ENUM (
      'CREATED',
      'WAITING_FOR_LOADING',
      'LOADED',
      'IN_TRANSIT',
      'ARRIVED_PORT',
      'CUSTOMS_CLEARANCE',
      'RELEASED',
      'CLOSED'
    );
  END IF;
END $$;

-- ============================================
-- STEP 2: Create new Container tables
-- ============================================

-- Enhanced Container table
CREATE TABLE IF NOT EXISTS "Container_New" (
    "id" TEXT NOT NULL,
    "containerNumber" TEXT NOT NULL,
    "trackingNumber" TEXT,
    "vesselName" TEXT,
    "voyageNumber" TEXT,
    "shippingLine" TEXT,
    "bookingNumber" TEXT,
    "loadingPort" TEXT,
    "destinationPort" TEXT,
    "transshipmentPorts" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "loadingDate" TIMESTAMP(3),
    "departureDate" TIMESTAMP(3),
    "estimatedArrival" TIMESTAMP(3),
    "actualArrival" TIMESTAMP(3),
    "status" "ContainerLifecycleStatus" NOT NULL DEFAULT 'CREATED',
    "currentLocation" TEXT,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "maxCapacity" INTEGER NOT NULL DEFAULT 4,
    "currentCount" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "lastLocationUpdate" TIMESTAMP(3),
    "autoTrackingEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Container_New_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Container_New_containerNumber_key" ON "Container_New"("containerNumber");
CREATE UNIQUE INDEX IF NOT EXISTS "Container_New_trackingNumber_key" ON "Container_New"("trackingNumber");
CREATE INDEX IF NOT EXISTS "Container_New_status_idx" ON "Container_New"("status");
CREATE INDEX IF NOT EXISTS "Container_New_shippingLine_idx" ON "Container_New"("shippingLine");
CREATE INDEX IF NOT EXISTS "Container_New_destinationPort_idx" ON "Container_New"("destinationPort");
CREATE INDEX IF NOT EXISTS "Container_New_estimatedArrival_idx" ON "Container_New"("estimatedArrival");
CREATE INDEX IF NOT EXISTS "Container_New_trackingNumber_idx" ON "Container_New"("trackingNumber");

-- Container Expenses
CREATE TABLE IF NOT EXISTS "ContainerExpense" (
    "id" TEXT NOT NULL,
    "containerId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "vendor" TEXT,
    "invoiceNumber" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContainerExpense_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ContainerExpense_containerId_idx" ON "ContainerExpense"("containerId");
CREATE INDEX IF NOT EXISTS "ContainerExpense_type_idx" ON "ContainerExpense"("type");

-- Container Invoices
CREATE TABLE IF NOT EXISTS "ContainerInvoice" (
    "id" TEXT NOT NULL,
    "containerId" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "vendor" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3),
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "fileUrl" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContainerInvoice_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ContainerInvoice_containerId_idx" ON "ContainerInvoice"("containerId");
CREATE INDEX IF NOT EXISTS "ContainerInvoice_status_idx" ON "ContainerInvoice"("status");

-- Container Documents
CREATE TABLE IF NOT EXISTS "ContainerDocument" (
    "id" TEXT NOT NULL,
    "containerId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "ContainerDocument_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ContainerDocument_containerId_idx" ON "ContainerDocument"("containerId");
CREATE INDEX IF NOT EXISTS "ContainerDocument_type_idx" ON "ContainerDocument"("type");

-- Container Tracking Events
CREATE TABLE IF NOT EXISTS "ContainerTrackingEvent" (
    "id" TEXT NOT NULL,
    "containerId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "location" TEXT,
    "vesselName" TEXT,
    "description" TEXT,
    "eventDate" TIMESTAMP(3) NOT NULL,
    "source" TEXT,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContainerTrackingEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ContainerTrackingEvent_containerId_idx" ON "ContainerTrackingEvent"("containerId");
CREATE INDEX IF NOT EXISTS "ContainerTrackingEvent_eventDate_idx" ON "ContainerTrackingEvent"("eventDate");

-- Container Audit Log
CREATE TABLE IF NOT EXISTS "ContainerAuditLog" (
    "id" TEXT NOT NULL,
    "containerId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "performedBy" TEXT NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT,
    "metadata" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContainerAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ContainerAuditLog_containerId_idx" ON "ContainerAuditLog"("containerId");
CREATE INDEX IF NOT EXISTS "ContainerAuditLog_timestamp_idx" ON "ContainerAuditLog"("timestamp");
CREATE INDEX IF NOT EXISTS "ContainerAuditLog_action_idx" ON "ContainerAuditLog"("action");

-- ============================================
-- STEP 3: Modify Shipment table
-- ============================================

-- Add new columns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'Shipment'
    AND column_name = 'status_new'
  ) THEN
    ALTER TABLE "Shipment" ADD COLUMN "status_new" "ShipmentSimpleStatus" DEFAULT 'ON_HAND';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'Shipment'
    AND column_name = 'containerId_new'
  ) THEN
    ALTER TABLE "Shipment" ADD COLUMN "containerId_new" TEXT;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'Shipment'
    AND column_name = 'internalNotes'
  ) THEN
    ALTER TABLE "Shipment" ADD COLUMN "internalNotes" TEXT;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'Shipment'
    AND column_name = 'containerPhotos'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'Shipment'
    AND column_name = 'vehiclePhotos'
  ) THEN
    ALTER TABLE "Shipment" RENAME COLUMN "containerPhotos" TO "vehiclePhotos";
  END IF;
END $$;

-- Remove old columns (after data migration)
-- Note: These are commented out for safety - uncomment after verifying data migration
-- ALTER TABLE "Shipment" DROP COLUMN "trackingNumber";
-- ALTER TABLE "Shipment" DROP COLUMN "origin";
-- ALTER TABLE "Shipment" DROP COLUMN "destination";
-- ALTER TABLE "Shipment" DROP COLUMN "currentLocation";
-- ALTER TABLE "Shipment" DROP COLUMN "estimatedDelivery";
-- ALTER TABLE "Shipment" DROP COLUMN "actualDelivery";
-- ALTER TABLE "Shipment" DROP COLUMN "progress";
-- ALTER TABLE "Shipment" DROP COLUMN "deliveryAlertStatus";
-- ALTER TABLE "Shipment" DROP COLUMN "autoStatusUpdate";
-- ALTER TABLE "Shipment" DROP COLUMN "lastStatusSync";
-- ALTER TABLE "Shipment" DROP COLUMN "routeId";

-- ============================================
-- STEP 4: Add Foreign Keys
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ContainerExpense_containerId_fkey'
  ) THEN
    ALTER TABLE "ContainerExpense" ADD CONSTRAINT "ContainerExpense_containerId_fkey" 
      FOREIGN KEY ("containerId") REFERENCES "Container_New"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ContainerInvoice_containerId_fkey'
  ) THEN
    ALTER TABLE "ContainerInvoice" ADD CONSTRAINT "ContainerInvoice_containerId_fkey" 
      FOREIGN KEY ("containerId") REFERENCES "Container_New"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ContainerDocument_containerId_fkey'
  ) THEN
    ALTER TABLE "ContainerDocument" ADD CONSTRAINT "ContainerDocument_containerId_fkey" 
      FOREIGN KEY ("containerId") REFERENCES "Container_New"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ContainerTrackingEvent_containerId_fkey'
  ) THEN
    ALTER TABLE "ContainerTrackingEvent" ADD CONSTRAINT "ContainerTrackingEvent_containerId_fkey" 
      FOREIGN KEY ("containerId") REFERENCES "Container_New"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ContainerAuditLog_containerId_fkey'
  ) THEN
    ALTER TABLE "ContainerAuditLog" ADD CONSTRAINT "ContainerAuditLog_containerId_fkey" 
      FOREIGN KEY ("containerId") REFERENCES "Container_New"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- ============================================
-- STEP 5: Data Migration Instructions
-- ============================================

-- TODO: Manual data migration required
-- 1. Migrate existing Container data to Container_New
-- 2. For each Shipment with status IN_TRANSIT or similar:
--    - Create or find Container_New record
--    - Set Shipment.containerId_new to Container_New.id
--    - Set Shipment.status_new to 'IN_TRANSIT'
-- 3. For each Shipment with status ON_HAND or PENDING:
--    - Set Shipment.status_new to 'ON_HAND'
--    - Set Shipment.containerId_new to NULL

-- Example migration (customize based on your data):
-- UPDATE "Shipment" SET "status_new" = 'ON_HAND' WHERE "status" IN ('PENDING', 'QUOTE_REQUESTED');
-- UPDATE "Shipment" SET "status_new" = 'IN_TRANSIT' WHERE "status" IN ('IN_TRANSIT', 'LOADED_ON_VESSEL', 'IN_TRANSIT_OCEAN', 'AT_PORT');

-- ============================================
-- STEP 6: Finalize (Run after data migration)
-- ============================================

-- After verifying data migration, uncomment these:

-- Drop old Container table
-- DROP TABLE "Container" CASCADE;

-- Rename new Container table
-- ALTER TABLE "Container_New" RENAME TO "Container";

-- Drop old Shipment columns
-- (See STEP 3 for list of columns to drop)

-- Rename new Shipment columns
-- ALTER TABLE "Shipment" DROP COLUMN "status";
-- ALTER TABLE "Shipment" RENAME COLUMN "status_new" TO "status";
-- ALTER TABLE "Shipment" DROP COLUMN "containerId";
-- ALTER TABLE "Shipment" RENAME COLUMN "containerId_new" TO "containerId";

-- Add Shipment foreign key
-- ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_containerId_fkey" 
--   FOREIGN KEY ("containerId") REFERENCES "Container"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Drop old ShipmentEvent table (no longer needed)
-- DROP TABLE "ShipmentEvent" CASCADE;

-- Drop old Item table (no longer needed)
-- DROP TABLE "InvoiceItem" CASCADE;
-- DROP TABLE "Item" CASCADE;
-- DROP TABLE "Invoice" CASCADE;

-- ============================================
-- NOTES
-- ============================================

-- This migration is designed to be run in stages:
-- 1. Run STEPS 1-4 to create new structure alongside old
-- 2. Write and run custom data migration script (STEP 5)
-- 3. Verify data integrity
-- 4. Run STEP 6 to finalize and clean up

-- IMPORTANT: Test this migration in a development environment first!
-- Always have a backup before running in production!
