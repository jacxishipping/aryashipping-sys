ALTER TABLE "PartnerPortal"
ADD COLUMN "customDomain" TEXT;

CREATE UNIQUE INDEX "PartnerPortal_customDomain_key" ON "PartnerPortal"("customDomain");