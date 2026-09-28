-- Reconcile migration history with the current Prisma schema.
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "DocumentCategory" ADD VALUE 'EXPORT_DOCUMENT';
ALTER TYPE "DocumentCategory" ADD VALUE 'PACKING_LIST';

-- AlterEnum
ALTER TYPE "InvoiceStatus" ADD VALUE 'PENDING';

-- DropForeignKey
ALTER TABLE "Container" DROP CONSTRAINT "Container_shipmentId_fkey";

-- DropForeignKey
ALTER TABLE "ContainerAuditLog" DROP CONSTRAINT "ContainerAuditLog_containerId_fkey";

-- DropForeignKey
ALTER TABLE "ContainerDocument" DROP CONSTRAINT "ContainerDocument_containerId_fkey";

-- DropForeignKey
ALTER TABLE "ContainerExpense" DROP CONSTRAINT "ContainerExpense_containerId_fkey";

-- DropForeignKey
ALTER TABLE "ContainerInvoice" DROP CONSTRAINT "ContainerInvoice_containerId_fkey";

-- DropForeignKey
ALTER TABLE "ContainerTrackingEvent" DROP CONSTRAINT "ContainerTrackingEvent_containerId_fkey";

-- DropForeignKey
ALTER TABLE "Invoice" DROP CONSTRAINT "Invoice_containerId_fkey";

-- DropForeignKey
ALTER TABLE "InvoiceItem" DROP CONSTRAINT "InvoiceItem_invoiceId_fkey";

-- DropForeignKey
ALTER TABLE "InvoiceItem" DROP CONSTRAINT "InvoiceItem_itemId_fkey";

-- DropForeignKey
ALTER TABLE "Item" DROP CONSTRAINT "Item_containerId_fkey";

-- DropForeignKey
ALTER TABLE "QualityCheck" DROP CONSTRAINT "QualityCheck_itemId_fkey";

-- DropForeignKey
ALTER TABLE "Shipment" DROP CONSTRAINT "Shipment_routeId_fkey";

-- DropForeignKey
ALTER TABLE "ShipmentEvent" DROP CONSTRAINT "ShipmentEvent_shipmentId_fkey";

-- DropForeignKey
ALTER TABLE "Transit" DROP CONSTRAINT "Transit_companyId_fkey";

-- DropForeignKey
ALTER TABLE "UserInvoice" DROP CONSTRAINT "UserInvoice_containerId_fkey";

-- DropIndex
DROP INDEX "Shipment_trackingNumber_key";

-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "isDispatch" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isShipping" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isTransit" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Container" DROP COLUMN "shipmentId",
ADD COLUMN     "actualArrival" TIMESTAMP(3),
ADD COLUMN     "autoTrackingEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "bookingNumber" TEXT,
ADD COLUMN     "currentLocation" TEXT,
ADD COLUMN     "departureDate" TIMESTAMP(3),
ADD COLUMN     "destinationPort" TEXT,
ADD COLUMN     "estimatedArrival" TIMESTAMP(3),
ADD COLUMN     "lastLocationUpdate" TIMESTAMP(3),
ADD COLUMN     "loadingDate" TIMESTAMP(3),
ADD COLUMN     "loadingPort" TEXT,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "progress" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "shippingLine" TEXT,
ADD COLUMN     "trackingNumber" TEXT,
ADD COLUMN     "transshipmentPorts" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "vesselName" TEXT,
ADD COLUMN     "voyageNumber" TEXT,
DROP COLUMN "status",
ADD COLUMN     "status" "ContainerLifecycleStatus" NOT NULL DEFAULT 'CREATED',
ALTER COLUMN "expenseAllocationMethod" SET NOT NULL;

-- AlterTable
ALTER TABLE "ContainerDamage" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Dispatch" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "DispatchExpense" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "QualityCheck" DROP COLUMN "itemId";

-- AlterTable
ALTER TABLE "Shipment" DROP COLUMN "actualDelivery",
DROP COLUMN "autoStatusUpdate",
DROP COLUMN "containerId_new",
DROP COLUMN "currentLocation",
DROP COLUMN "deliveryAlertStatus",
DROP COLUMN "destination",
DROP COLUMN "estimatedDelivery",
DROP COLUMN "lastStatusSync",
DROP COLUMN "origin",
DROP COLUMN "progress",
DROP COLUMN "routeId",
DROP COLUMN "specialInstructions",
DROP COLUMN "status_new",
DROP COLUMN "trackingNumber",
ADD COLUMN     "containerId" TEXT,
DROP COLUMN "status",
ADD COLUMN     "status" "ShipmentSimpleStatus" NOT NULL DEFAULT 'ON_HAND',
ALTER COLUMN "serviceType" SET NOT NULL;

-- AlterTable
ALTER TABLE "Transit" ALTER COLUMN "companyId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "TransitEvent" ADD COLUMN     "companyId" TEXT NOT NULL,
ADD COLUMN     "destination" TEXT NOT NULL,
ADD COLUMN     "origin" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "TransitExpense" ADD COLUMN     "transitEventId" TEXT;

-- AlterTable
ALTER TABLE "UserInvoice" ADD COLUMN     "shipmentId" TEXT,
ALTER COLUMN "containerId" DROP NOT NULL;

-- DropTable
DROP TABLE "Container_New";

-- DropTable
DROP TABLE "Invoice";

-- DropTable
DROP TABLE "InvoiceItem";

-- DropTable
DROP TABLE "Item";

-- DropTable
DROP TABLE "ShipmentEvent";

-- DropEnum
DROP TYPE "ContainerStatus";

-- DropEnum
DROP TYPE "ItemStatus";

-- DropEnum
DROP TYPE "ShipmentStatus";

-- CreateIndex
CREATE UNIQUE INDEX "Container_trackingNumber_key" ON "Container"("trackingNumber");

-- CreateIndex
CREATE INDEX "Container_status_idx" ON "Container"("status");

-- CreateIndex
CREATE INDEX "Container_shippingLine_idx" ON "Container"("shippingLine");

-- CreateIndex
CREATE INDEX "Container_destinationPort_idx" ON "Container"("destinationPort");

-- CreateIndex
CREATE INDEX "Container_estimatedArrival_idx" ON "Container"("estimatedArrival");

-- CreateIndex
CREATE INDEX "Container_trackingNumber_idx" ON "Container"("trackingNumber");

-- CreateIndex
CREATE INDEX "Container_createdAt_idx" ON "Container"("createdAt");

-- CreateIndex
CREATE INDEX "Shipment_userId_idx" ON "Shipment"("userId");

-- CreateIndex
CREATE INDEX "Shipment_containerId_idx" ON "Shipment"("containerId");

-- CreateIndex
CREATE INDEX "Shipment_status_idx" ON "Shipment"("status");

-- CreateIndex
CREATE INDEX "Shipment_vehicleVIN_idx" ON "Shipment"("vehicleVIN");

-- CreateIndex
CREATE INDEX "Shipment_createdAt_idx" ON "Shipment"("createdAt");

-- CreateIndex
CREATE INDEX "TransitEvent_companyId_idx" ON "TransitEvent"("companyId");

-- CreateIndex
CREATE INDEX "TransitExpense_transitEventId_idx" ON "TransitExpense"("transitEventId");

-- CreateIndex
CREATE INDEX "UserInvoice_shipmentId_idx" ON "UserInvoice"("shipmentId");

-- CreateIndex
CREATE INDEX "UserInvoice_createdAt_idx" ON "UserInvoice"("createdAt");

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_containerId_fkey" FOREIGN KEY ("containerId") REFERENCES "Container"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContainerExpense" ADD CONSTRAINT "ContainerExpense_containerId_fkey" FOREIGN KEY ("containerId") REFERENCES "Container"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContainerInvoice" ADD CONSTRAINT "ContainerInvoice_containerId_fkey" FOREIGN KEY ("containerId") REFERENCES "Container"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContainerDocument" ADD CONSTRAINT "ContainerDocument_containerId_fkey" FOREIGN KEY ("containerId") REFERENCES "Container"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContainerTrackingEvent" ADD CONSTRAINT "ContainerTrackingEvent_containerId_fkey" FOREIGN KEY ("containerId") REFERENCES "Container"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContainerAuditLog" ADD CONSTRAINT "ContainerAuditLog_containerId_fkey" FOREIGN KEY ("containerId") REFERENCES "Container"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserInvoice" ADD CONSTRAINT "UserInvoice_containerId_fkey" FOREIGN KEY ("containerId") REFERENCES "Container"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserInvoice" ADD CONSTRAINT "UserInvoice_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transit" ADD CONSTRAINT "Transit_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransitEvent" ADD CONSTRAINT "TransitEvent_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransitExpense" ADD CONSTRAINT "TransitExpense_transitEventId_fkey" FOREIGN KEY ("transitEventId") REFERENCES "TransitEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

