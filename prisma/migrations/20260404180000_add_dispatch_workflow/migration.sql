-- Add dispatch workflow support before container shipping.

CREATE TYPE "DispatchStatus" AS ENUM ('PENDING', 'DISPATCHED', 'ARRIVED_AT_PORT', 'COMPLETED', 'CANCELLED');

ALTER TYPE "CompanyType" ADD VALUE IF NOT EXISTS 'DISPATCH';
ALTER TYPE "ShipmentSimpleStatus" ADD VALUE IF NOT EXISTS 'DISPATCHING';

ALTER TABLE "Shipment"
ADD COLUMN "dispatchId" TEXT;

CREATE TABLE "Dispatch" (
  "id" TEXT NOT NULL,
  "referenceNumber" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "origin" TEXT NOT NULL,
  "destination" TEXT NOT NULL,
  "status" "DispatchStatus" NOT NULL DEFAULT 'PENDING',
  "dispatchDate" TIMESTAMP(3),
  "estimatedArrival" TIMESTAMP(3),
  "actualArrival" TIMESTAMP(3),
  "cost" DOUBLE PRECISION,
  "notes" TEXT,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Dispatch_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DispatchEvent" (
  "id" TEXT NOT NULL,
  "dispatchId" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "location" TEXT,
  "description" TEXT,
  "eventDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DispatchEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DispatchExpense" (
  "id" TEXT NOT NULL,
  "dispatchId" TEXT NOT NULL,
  "shipmentId" TEXT,
  "type" TEXT NOT NULL DEFAULT 'OTHER',
  "description" TEXT NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "vendor" TEXT,
  "invoiceNumber" TEXT,
  "category" TEXT,
  "notes" TEXT,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DispatchExpense_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Dispatch_referenceNumber_key" ON "Dispatch"("referenceNumber");
CREATE INDEX "Shipment_dispatchId_idx" ON "Shipment"("dispatchId");
CREATE INDEX "Dispatch_companyId_idx" ON "Dispatch"("companyId");
CREATE INDEX "Dispatch_status_idx" ON "Dispatch"("status");
CREATE INDEX "DispatchEvent_dispatchId_idx" ON "DispatchEvent"("dispatchId");
CREATE INDEX "DispatchEvent_eventDate_idx" ON "DispatchEvent"("eventDate");
CREATE INDEX "DispatchExpense_dispatchId_idx" ON "DispatchExpense"("dispatchId");
CREATE INDEX "DispatchExpense_shipmentId_idx" ON "DispatchExpense"("shipmentId");
CREATE INDEX "DispatchExpense_type_idx" ON "DispatchExpense"("type");

ALTER TABLE "Shipment"
ADD CONSTRAINT "Shipment_dispatchId_fkey"
FOREIGN KEY ("dispatchId") REFERENCES "Dispatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Dispatch"
ADD CONSTRAINT "Dispatch_companyId_fkey"
FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "DispatchEvent"
ADD CONSTRAINT "DispatchEvent_dispatchId_fkey"
FOREIGN KEY ("dispatchId") REFERENCES "Dispatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DispatchExpense"
ADD CONSTRAINT "DispatchExpense_dispatchId_fkey"
FOREIGN KEY ("dispatchId") REFERENCES "Dispatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DispatchExpense"
ADD CONSTRAINT "DispatchExpense_shipmentId_fkey"
FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE SET NULL ON UPDATE CASCADE;