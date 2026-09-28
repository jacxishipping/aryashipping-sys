-- Create enum safely
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_type t
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE t.typname = 'AuditAction' AND n.nspname = current_schema()
    ) THEN
        CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE');
    END IF;
END $$;

-- Create table if missing
CREATE TABLE IF NOT EXISTS "AuditLog" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" "AuditAction" NOT NULL,
    "performedBy" TEXT NOT NULL,
    "performedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changes" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- Create indexes if missing
CREATE INDEX IF NOT EXISTS "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");
CREATE INDEX IF NOT EXISTS "AuditLog_performedBy_idx" ON "AuditLog"("performedBy");
CREATE INDEX IF NOT EXISTS "AuditLog_performedAt_idx" ON "AuditLog"("performedAt");

-- Add foreign key if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'AuditLog_entityId_fkey'
    ) THEN
        ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_entityId_fkey"
        FOREIGN KEY ("entityId") REFERENCES "LedgerEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
