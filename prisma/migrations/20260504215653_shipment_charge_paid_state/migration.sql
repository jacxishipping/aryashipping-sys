-- AlterEnum
ALTER TYPE "ShipmentChargeStatus" ADD VALUE 'PAID';

-- AlterTable
ALTER TABLE "ShipmentCharge" ADD COLUMN     "paidAt" TIMESTAMP(3);
