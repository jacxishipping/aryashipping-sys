-- AlterTable
ALTER TABLE "PartnerPortal"
ADD COLUMN     "notifyOnShipmentAssigned" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "autoAssignToSingleCustomer" BOOLEAN NOT NULL DEFAULT false;