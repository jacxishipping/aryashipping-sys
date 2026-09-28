-- CreateEnum
CREATE TYPE "CollectionStatus" AS ENUM ('CURRENT', 'FOLLOW_UP', 'PROMISED_TO_PAY', 'IN_COLLECTIONS', 'ESCALATED', 'ON_HOLD');

-- AlterTable
ALTER TABLE "User"
ADD COLUMN "collectionStatus" "CollectionStatus" NOT NULL DEFAULT 'CURRENT',
ADD COLUMN "promiseToPayDate" TIMESTAMP(3),
ADD COLUMN "collectionFollowUpDate" TIMESTAMP(3),
ADD COLUMN "collectionNotes" TEXT;