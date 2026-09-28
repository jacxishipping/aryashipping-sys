-- Phase 2: Invoice reminder tracking (lastReminderAt / lastReminderDaysAgo)

ALTER TABLE "UserInvoice" ADD COLUMN "lastReminderAt" TIMESTAMP(3);
ALTER TABLE "UserInvoice" ADD COLUMN "lastReminderDaysAgo" INTEGER;
