ALTER TABLE "Notification"
ADD COLUMN IF NOT EXISTS "senderId" TEXT;

CREATE INDEX IF NOT EXISTS "Notification_senderId_idx"
ON "Notification"("senderId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'Notification_senderId_fkey'
  ) THEN
    ALTER TABLE "Notification"
    ADD CONSTRAINT "Notification_senderId_fkey"
    FOREIGN KEY ("senderId") REFERENCES "User"("id")
    ON DELETE SET NULL
    ON UPDATE CASCADE;
  END IF;
END $$;