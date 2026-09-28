-- Phase 1: Payment↔Invoice FK + reconciliation model + invoice status/amount fields

-- 1. Add new columns to Payment
ALTER TABLE "Payment" ADD COLUMN "invoiceId" TEXT;
ALTER TABLE "Payment" ADD COLUMN "idempotencyKey" TEXT;
ALTER TABLE "Payment" ADD COLUMN "refundedAt" TIMESTAMP(3);
ALTER TABLE "Payment" ADD COLUMN "refundReason" TEXT;
ALTER TABLE "Payment" ADD COLUMN "refundOfPaymentId" TEXT;

-- 2. Create unique index for idempotency key (partial — only non-null rows)
CREATE UNIQUE INDEX "Payment_idempotencyKey_key" ON "Payment"("idempotencyKey") WHERE "idempotencyKey" IS NOT NULL;

-- 3. Create composite indexes for Payment
CREATE INDEX "Payment_userId_idx" ON "Payment"("userId");
CREATE INDEX "Payment_shipmentId_idx" ON "Payment"("shipmentId");
CREATE INDEX "Payment_invoiceId_idx" ON "Payment"("invoiceId");
CREATE INDEX "Payment_status_idx" ON "Payment"("status");

-- 4. Add foreign key from Payment.invoiceId to UserInvoice.id
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "UserInvoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 5. Add new columns to UserInvoice
ALTER TABLE "UserInvoice" ADD COLUMN "amountPaid" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "UserInvoice" ADD COLUMN "amountRemaining" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "UserInvoice" ADD COLUMN "voidedAt" TIMESTAMP(3);
ALTER TABLE "UserInvoice" ADD COLUMN "voidedReason" TEXT;
ALTER TABLE "UserInvoice" ADD COLUMN "reversedInvoiceId" TEXT;

-- 6. Create composite AR-aging index on UserInvoice
CREATE INDEX "UserInvoice_userId_status_dueDate_idx" ON "UserInvoice"("userId", "status", "dueDate");

-- 7. Create PaymentAllocation table (per-invoice payment tracking)
CREATE TABLE "PaymentAllocation" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PaymentAllocation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PaymentAllocation_paymentId_idx" ON "PaymentAllocation"("paymentId");
CREATE INDEX "PaymentAllocation_invoiceId_idx" ON "PaymentAllocation"("invoiceId");
CREATE UNIQUE INDEX "PaymentAllocation_paymentId_invoiceId_key" ON "PaymentAllocation"("paymentId", "invoiceId");

-- 8. Add foreign keys on PaymentAllocation
ALTER TABLE "PaymentAllocation" ADD CONSTRAINT "PaymentAllocation_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PaymentAllocation" ADD CONSTRAINT "PaymentAllocation_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "UserInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 9. Backfill UserInvoice.amountRemaining for existing rows
UPDATE "UserInvoice" SET "amountRemaining" = "total" - "amountPaid" WHERE "amountRemaining" = 0;
