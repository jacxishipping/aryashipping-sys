-- CreateTable
CREATE TABLE "PartnerPortalPaymentRecord" (
    "id" TEXT NOT NULL,
    "portalId" TEXT NOT NULL,
    "partnerCustomerId" TEXT NOT NULL,
    "shipmentId" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paymentMethod" TEXT NOT NULL,
    "reference" TEXT,
    "notes" TEXT,
    "metadata" JSONB,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartnerPortalPaymentRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerPortalLedgerEntry" (
    "id" TEXT NOT NULL,
    "portalId" TEXT NOT NULL,
    "partnerCustomerId" TEXT NOT NULL,
    "shipmentId" TEXT,
    "paymentRecordId" TEXT,
    "transactionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT NOT NULL,
    "type" "LedgerEntryType" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "balance" DOUBLE PRECISION NOT NULL,
    "paymentMethod" TEXT,
    "reference" TEXT,
    "notes" TEXT,
    "metadata" JSONB,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartnerPortalLedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PartnerPortalPaymentRecord_portalId_idx" ON "PartnerPortalPaymentRecord"("portalId");

-- CreateIndex
CREATE INDEX "PartnerPortalPaymentRecord_partnerCustomerId_idx" ON "PartnerPortalPaymentRecord"("partnerCustomerId");

-- CreateIndex
CREATE INDEX "PartnerPortalPaymentRecord_shipmentId_idx" ON "PartnerPortalPaymentRecord"("shipmentId");

-- CreateIndex
CREATE INDEX "PartnerPortalPaymentRecord_paymentDate_idx" ON "PartnerPortalPaymentRecord"("paymentDate");

-- CreateIndex
CREATE INDEX "PartnerPortalLedgerEntry_portalId_idx" ON "PartnerPortalLedgerEntry"("portalId");

-- CreateIndex
CREATE INDEX "PartnerPortalLedgerEntry_partnerCustomerId_idx" ON "PartnerPortalLedgerEntry"("partnerCustomerId");

-- CreateIndex
CREATE INDEX "PartnerPortalLedgerEntry_shipmentId_idx" ON "PartnerPortalLedgerEntry"("shipmentId");

-- CreateIndex
CREATE INDEX "PartnerPortalLedgerEntry_paymentRecordId_idx" ON "PartnerPortalLedgerEntry"("paymentRecordId");

-- CreateIndex
CREATE INDEX "PartnerPortalLedgerEntry_transactionDate_idx" ON "PartnerPortalLedgerEntry"("transactionDate");

-- CreateIndex
CREATE INDEX "PartnerPortalLedgerEntry_type_idx" ON "PartnerPortalLedgerEntry"("type");

-- AddForeignKey
ALTER TABLE "PartnerPortalPaymentRecord" ADD CONSTRAINT "PartnerPortalPaymentRecord_portalId_fkey" FOREIGN KEY ("portalId") REFERENCES "PartnerPortal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerPortalPaymentRecord" ADD CONSTRAINT "PartnerPortalPaymentRecord_partnerCustomerId_fkey" FOREIGN KEY ("partnerCustomerId") REFERENCES "PartnerCustomer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerPortalPaymentRecord" ADD CONSTRAINT "PartnerPortalPaymentRecord_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerPortalLedgerEntry" ADD CONSTRAINT "PartnerPortalLedgerEntry_portalId_fkey" FOREIGN KEY ("portalId") REFERENCES "PartnerPortal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerPortalLedgerEntry" ADD CONSTRAINT "PartnerPortalLedgerEntry_partnerCustomerId_fkey" FOREIGN KEY ("partnerCustomerId") REFERENCES "PartnerCustomer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerPortalLedgerEntry" ADD CONSTRAINT "PartnerPortalLedgerEntry_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerPortalLedgerEntry" ADD CONSTRAINT "PartnerPortalLedgerEntry_paymentRecordId_fkey" FOREIGN KEY ("paymentRecordId") REFERENCES "PartnerPortalPaymentRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;