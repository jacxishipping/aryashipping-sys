-- CreateEnum
CREATE TYPE "ShipmentChargeStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'INVOICED', 'DISPUTED', 'VOID');

-- CreateEnum
CREATE TYPE "ShipmentChargeCategory" AS ENUM ('PURCHASE', 'SHIPPING', 'INSURANCE', 'CUSTOMS', 'STORAGE', 'HANDLING', 'ADJUSTMENT', 'DAMAGE', 'CREDIT', 'OTHER');

-- CreateEnum
CREATE TYPE "ShipmentBillingMilestone" AS ENUM ('INTAKE', 'PURCHASE', 'ORIGIN_HANDOFF', 'OCEAN_FREIGHT', 'DESTINATION_PORT', 'RELEASE', 'DELIVERY', 'FINAL_SETTLEMENT', 'MANUAL');

-- CreateEnum
CREATE TYPE "ShipmentChargeSourceType" AS ENUM ('MANUAL', 'LEDGER_ENTRY', 'CONTAINER_ALLOCATION', 'SHIPMENT', 'DAMAGE', 'PAYMENT_ADJUSTMENT', 'SYSTEM');

-- CreateTable
CREATE TABLE "ShipmentCharge" (
    "id" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "invoiceId" TEXT,
    "chargeCode" TEXT NOT NULL,
    "category" "ShipmentChargeCategory" NOT NULL,
    "billingMilestone" "ShipmentBillingMilestone" NOT NULL,
    "sourceType" "ShipmentChargeSourceType" NOT NULL,
    "sourceId" TEXT,
    "description" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "unitAmount" DOUBLE PRECISION NOT NULL,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" "ShipmentChargeStatus" NOT NULL DEFAULT 'DRAFT',
    "billableAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "invoicedAt" TIMESTAMP(3),
    "voidedAt" TIMESTAMP(3),
    "notes" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShipmentCharge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShipmentChargeAuditLog" (
    "id" TEXT NOT NULL,
    "chargeId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "performedBy" TEXT NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT,
    "metadata" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShipmentChargeAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ShipmentCharge_shipmentId_idx" ON "ShipmentCharge"("shipmentId");

-- CreateIndex
CREATE INDEX "ShipmentCharge_userId_idx" ON "ShipmentCharge"("userId");

-- CreateIndex
CREATE INDEX "ShipmentCharge_invoiceId_idx" ON "ShipmentCharge"("invoiceId");

-- CreateIndex
CREATE INDEX "ShipmentCharge_status_idx" ON "ShipmentCharge"("status");

-- CreateIndex
CREATE INDEX "ShipmentCharge_category_idx" ON "ShipmentCharge"("category");

-- CreateIndex
CREATE INDEX "ShipmentCharge_billingMilestone_idx" ON "ShipmentCharge"("billingMilestone");

-- CreateIndex
CREATE INDEX "ShipmentCharge_sourceType_sourceId_idx" ON "ShipmentCharge"("sourceType", "sourceId");

-- CreateIndex
CREATE INDEX "ShipmentCharge_billableAt_idx" ON "ShipmentCharge"("billableAt");

-- CreateIndex
CREATE INDEX "ShipmentCharge_createdAt_idx" ON "ShipmentCharge"("createdAt");

-- CreateIndex
CREATE INDEX "ShipmentChargeAuditLog_chargeId_idx" ON "ShipmentChargeAuditLog"("chargeId");

-- CreateIndex
CREATE INDEX "ShipmentChargeAuditLog_timestamp_idx" ON "ShipmentChargeAuditLog"("timestamp");

-- CreateIndex
CREATE INDEX "ShipmentChargeAuditLog_action_idx" ON "ShipmentChargeAuditLog"("action");

-- AddForeignKey
ALTER TABLE "ShipmentCharge" ADD CONSTRAINT "ShipmentCharge_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShipmentCharge" ADD CONSTRAINT "ShipmentCharge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShipmentCharge" ADD CONSTRAINT "ShipmentCharge_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "UserInvoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShipmentChargeAuditLog" ADD CONSTRAINT "ShipmentChargeAuditLog_chargeId_fkey" FOREIGN KEY ("chargeId") REFERENCES "ShipmentCharge"("id") ON DELETE CASCADE ON UPDATE CASCADE;
