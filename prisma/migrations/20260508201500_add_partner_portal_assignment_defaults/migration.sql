-- AlterTable
ALTER TABLE "PartnerPortal"
ADD COLUMN     "defaultShipmentNotes" TEXT,
ADD COLUMN     "requireCustomerLinkForReady" BOOLEAN NOT NULL DEFAULT true;