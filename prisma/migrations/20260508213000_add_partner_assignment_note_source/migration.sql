CREATE TYPE "PartnerShipmentAssignmentNoteSource" AS ENUM ('MANUAL', 'PORTAL_DEFAULT');

ALTER TABLE "PartnerShipmentAssignment"
ADD COLUMN "noteSource" "PartnerShipmentAssignmentNoteSource";

UPDATE "PartnerShipmentAssignment"
SET "noteSource" = 'MANUAL'::"PartnerShipmentAssignmentNoteSource"
WHERE "notes" IS NOT NULL;