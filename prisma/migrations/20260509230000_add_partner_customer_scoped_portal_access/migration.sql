ALTER TABLE "PartnerPortalMembership"
ADD COLUMN "partnerCustomerId" TEXT;

CREATE INDEX "PartnerPortalMembership_partnerCustomerId_idx" ON "PartnerPortalMembership"("partnerCustomerId");

ALTER TABLE "PartnerPortalMembership"
ADD CONSTRAINT "PartnerPortalMembership_partnerCustomerId_fkey"
FOREIGN KEY ("partnerCustomerId") REFERENCES "PartnerCustomer"("id") ON DELETE SET NULL ON UPDATE CASCADE;