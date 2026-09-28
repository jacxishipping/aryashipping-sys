-- Link containers to companies for expense accounting
ALTER TABLE "Container" ADD COLUMN "companyId" TEXT;

CREATE INDEX "Container_companyId_idx" ON "Container"("companyId");

ALTER TABLE "Container"
ADD CONSTRAINT "Container_companyId_fkey"
FOREIGN KEY ("companyId") REFERENCES "Company"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
