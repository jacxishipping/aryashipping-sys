ALTER TABLE "Shipment"
ADD COLUMN "companyGetpassCompletedAt" TIMESTAMP(3),
ADD COLUMN "companyGetpassDurationSeconds" INTEGER;

CREATE INDEX "Shipment_companyGetpassCompletedAt_idx"
ON "Shipment"("companyGetpassCompletedAt");