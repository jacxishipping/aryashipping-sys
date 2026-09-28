CREATE TABLE "ShipmentAuditLog" (
  "id" TEXT NOT NULL,
  "shipmentId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "performedBy" TEXT NOT NULL,
  "oldValue" TEXT,
  "newValue" TEXT,
  "metadata" JSONB,
  "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ShipmentAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InvoiceAuditLog" (
  "id" TEXT NOT NULL,
  "invoiceId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "performedBy" TEXT NOT NULL,
  "oldValue" TEXT,
  "newValue" TEXT,
  "metadata" JSONB,
  "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "InvoiceAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ShipmentAuditLog_shipmentId_idx" ON "ShipmentAuditLog"("shipmentId");
CREATE INDEX "ShipmentAuditLog_timestamp_idx" ON "ShipmentAuditLog"("timestamp");
CREATE INDEX "ShipmentAuditLog_action_idx" ON "ShipmentAuditLog"("action");

CREATE INDEX "InvoiceAuditLog_invoiceId_idx" ON "InvoiceAuditLog"("invoiceId");
CREATE INDEX "InvoiceAuditLog_timestamp_idx" ON "InvoiceAuditLog"("timestamp");
CREATE INDEX "InvoiceAuditLog_action_idx" ON "InvoiceAuditLog"("action");

ALTER TABLE "ShipmentAuditLog"
ADD CONSTRAINT "ShipmentAuditLog_shipmentId_fkey"
FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "InvoiceAuditLog"
ADD CONSTRAINT "InvoiceAuditLog_invoiceId_fkey"
FOREIGN KEY ("invoiceId") REFERENCES "UserInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;