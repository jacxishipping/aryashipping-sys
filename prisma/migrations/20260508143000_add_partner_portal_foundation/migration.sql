-- CreateEnum
CREATE TYPE "PartnerPortalMembershipRole" AS ENUM ('ADMIN', 'STAFF');

-- CreateTable
CREATE TABLE "PartnerPortal" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartnerPortal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerPortalMembership" (
    "id" TEXT NOT NULL,
    "portalId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "PartnerPortalMembershipRole" NOT NULL DEFAULT 'STAFF',
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartnerPortalMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerCustomer" (
    "id" TEXT NOT NULL,
    "portalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "city" TEXT,
    "country" TEXT,
    "notes" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartnerCustomer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerShipmentAssignment" (
    "id" TEXT NOT NULL,
    "portalId" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "partnerCustomerId" TEXT,
    "assignedBy" TEXT NOT NULL,
    "linkedBy" TEXT,
    "notes" TEXT,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "linkedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartnerShipmentAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PartnerPortal_code_key" ON "PartnerPortal"("code");

-- CreateIndex
CREATE INDEX "PartnerPortal_name_idx" ON "PartnerPortal"("name");

-- CreateIndex
CREATE INDEX "PartnerPortal_isActive_idx" ON "PartnerPortal"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerPortalMembership_portalId_userId_key" ON "PartnerPortalMembership"("portalId", "userId");

-- CreateIndex
CREATE INDEX "PartnerPortalMembership_userId_idx" ON "PartnerPortalMembership"("userId");

-- CreateIndex
CREATE INDEX "PartnerPortalMembership_role_idx" ON "PartnerPortalMembership"("role");

-- CreateIndex
CREATE INDEX "PartnerCustomer_portalId_idx" ON "PartnerCustomer"("portalId");

-- CreateIndex
CREATE INDEX "PartnerCustomer_name_idx" ON "PartnerCustomer"("name");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerShipmentAssignment_shipmentId_key" ON "PartnerShipmentAssignment"("shipmentId");

-- CreateIndex
CREATE INDEX "PartnerShipmentAssignment_portalId_idx" ON "PartnerShipmentAssignment"("portalId");

-- CreateIndex
CREATE INDEX "PartnerShipmentAssignment_partnerCustomerId_idx" ON "PartnerShipmentAssignment"("partnerCustomerId");

-- CreateIndex
CREATE INDEX "PartnerShipmentAssignment_assignedAt_idx" ON "PartnerShipmentAssignment"("assignedAt");

-- AddForeignKey
ALTER TABLE "PartnerPortalMembership" ADD CONSTRAINT "PartnerPortalMembership_portalId_fkey" FOREIGN KEY ("portalId") REFERENCES "PartnerPortal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerPortalMembership" ADD CONSTRAINT "PartnerPortalMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerCustomer" ADD CONSTRAINT "PartnerCustomer_portalId_fkey" FOREIGN KEY ("portalId") REFERENCES "PartnerPortal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerShipmentAssignment" ADD CONSTRAINT "PartnerShipmentAssignment_portalId_fkey" FOREIGN KEY ("portalId") REFERENCES "PartnerPortal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerShipmentAssignment" ADD CONSTRAINT "PartnerShipmentAssignment_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerShipmentAssignment" ADD CONSTRAINT "PartnerShipmentAssignment_partnerCustomerId_fkey" FOREIGN KEY ("partnerCustomerId") REFERENCES "PartnerCustomer"("id") ON DELETE SET NULL ON UPDATE CASCADE;