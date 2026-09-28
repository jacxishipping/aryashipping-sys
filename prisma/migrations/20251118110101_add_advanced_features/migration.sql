/*
  Warnings:

  - The `status` column on the `Container` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[vehicleVIN]` on the table `Shipment` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DeliveryAlertStatus') THEN
        CREATE TYPE "DeliveryAlertStatus" AS ENUM ('ON_TIME', 'WARNING', 'OVERDUE', 'DELIVERED');
    END IF;
END $$;

-- CreateEnum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'QualityCheckType') THEN
        CREATE TYPE "QualityCheckType" AS ENUM ('INITIAL_INSPECTION', 'PRE_LOADING', 'POST_LOADING', 'DELIVERY_INSPECTION', 'DAMAGE_ASSESSMENT');
    END IF;
END $$;

-- CreateEnum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'QualityCheckStatus') THEN
        CREATE TYPE "QualityCheckStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'PASSED', 'FAILED', 'REQUIRES_ATTENTION');
    END IF;
END $$;

-- CreateEnum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DocumentCategory') THEN
        CREATE TYPE "DocumentCategory" AS ENUM ('INVOICE', 'BILL_OF_LADING', 'CUSTOMS', 'INSURANCE', 'TITLE', 'INSPECTION_REPORT', 'PHOTO', 'CONTRACT', 'OTHER');
    END IF;
END $$;

-- CreateEnum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'RouteStatus') THEN
        CREATE TYPE "RouteStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'OPTIMIZING', 'ARCHIVED');
    END IF;
END $$;

-- CreateEnum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ContainerStatus') THEN
        CREATE TYPE "ContainerStatus" AS ENUM ('EMPTY', 'PARTIAL', 'FULL', 'SHIPPED', 'ARCHIVED');
    END IF;
END $$;

-- AlterTable
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = current_schema()
            AND table_name = 'Container'
    ) THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = current_schema() AND table_name = 'Container' AND column_name = 'currentCount'
        ) THEN
            ALTER TABLE "Container" ADD COLUMN "currentCount" INTEGER NOT NULL DEFAULT 0;
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = current_schema() AND table_name = 'Container' AND column_name = 'maxCapacity'
        ) THEN
            ALTER TABLE "Container" ADD COLUMN "maxCapacity" INTEGER NOT NULL DEFAULT 4;
        END IF;

        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = current_schema() AND table_name = 'Container' AND column_name = 'status' AND udt_name <> 'ContainerStatus'
        ) THEN
            ALTER TABLE "Container" DROP COLUMN "status";
            ALTER TABLE "Container" ADD COLUMN "status" "ContainerStatus" NOT NULL DEFAULT 'EMPTY';
        END IF;
    END IF;
END $$;

-- AlterTable
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = current_schema()
            AND table_name = 'Shipment'
    ) THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'Shipment' AND column_name = 'autoStatusUpdate'
        ) THEN
            ALTER TABLE "Shipment" ADD COLUMN "autoStatusUpdate" BOOLEAN NOT NULL DEFAULT true;
        END IF;
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'Shipment' AND column_name = 'deliveryAlertStatus'
        ) THEN
            ALTER TABLE "Shipment" ADD COLUMN "deliveryAlertStatus" "DeliveryAlertStatus" NOT NULL DEFAULT 'ON_TIME';
        END IF;
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'Shipment' AND column_name = 'lastStatusSync'
        ) THEN
            ALTER TABLE "Shipment" ADD COLUMN "lastStatusSync" TIMESTAMP(3);
        END IF;
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'Shipment' AND column_name = 'routeId'
        ) THEN
            ALTER TABLE "Shipment" ADD COLUMN "routeId" TEXT;
        END IF;
    END IF;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "QualityCheck" (
    "id" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "itemId" TEXT,
    "checkType" "QualityCheckType" NOT NULL,
    "status" "QualityCheckStatus" NOT NULL DEFAULT 'PENDING',
    "inspector" TEXT,
    "notes" TEXT,
    "photos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "checkedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QualityCheck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Document" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "fileUrl" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "category" "DocumentCategory" NOT NULL,
    "shipmentId" TEXT,
    "userId" TEXT,
    "uploadedBy" TEXT NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Route" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "origin" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "waypoints" JSONB[] DEFAULT ARRAY[]::JSONB[],
    "distance" DOUBLE PRECISION,
    "estimatedTime" INTEGER,
    "cost" DOUBLE PRECISION,
    "status" "RouteStatus" NOT NULL DEFAULT 'ACTIVE',
    "preferences" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Route_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Shipment_vehicleVIN_key" ON "Shipment"("vehicleVIN");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Shipment_routeId_fkey') THEN
        ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "Route"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'QualityCheck_shipmentId_fkey') THEN
        ALTER TABLE "QualityCheck" ADD CONSTRAINT "QualityCheck_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'QualityCheck_itemId_fkey') THEN
        ALTER TABLE "QualityCheck" ADD CONSTRAINT "QualityCheck_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Document_shipmentId_fkey') THEN
        ALTER TABLE "Document" ADD CONSTRAINT "Document_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Document_userId_fkey') THEN
        ALTER TABLE "Document" ADD CONSTRAINT "Document_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
