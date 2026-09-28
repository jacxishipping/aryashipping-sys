-- Add missing columns to User table
-- Fixes: "The column `User.name` does not exist in the current database" (P2022)

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = current_schema() AND table_name = 'User'
        AND column_name = 'name'
    ) THEN
        ALTER TABLE "User" ADD COLUMN "name" TEXT;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = current_schema() AND table_name = 'User'
        AND column_name = 'emailVerified'
    ) THEN
        ALTER TABLE "User" ADD COLUMN "emailVerified" TIMESTAMP(3);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = current_schema() AND table_name = 'User'
        AND column_name = 'image'
    ) THEN
        ALTER TABLE "User" ADD COLUMN "image" TEXT;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = current_schema() AND table_name = 'User'
        AND column_name = 'passwordHash'
    ) THEN
        ALTER TABLE "User" ADD COLUMN "passwordHash" TEXT;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = current_schema() AND table_name = 'User'
        AND column_name = 'role'
    ) THEN
        ALTER TABLE "User" ADD COLUMN "role" TEXT NOT NULL DEFAULT 'user';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = current_schema() AND table_name = 'User'
        AND column_name = 'phone'
    ) THEN
        ALTER TABLE "User" ADD COLUMN "phone" TEXT;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = current_schema() AND table_name = 'User'
        AND column_name = 'address'
    ) THEN
        ALTER TABLE "User" ADD COLUMN "address" TEXT;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = current_schema() AND table_name = 'User'
        AND column_name = 'city'
    ) THEN
        ALTER TABLE "User" ADD COLUMN "city" TEXT;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = current_schema() AND table_name = 'User'
        AND column_name = 'country'
    ) THEN
        ALTER TABLE "User" ADD COLUMN "country" TEXT;
    END IF;
END $$;

-- ============================================
-- Create Notification table if missing
-- ============================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_type t
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE t.typname = 'NotificationType'
          AND n.nspname = current_schema()
    ) THEN
        CREATE TYPE "NotificationType" AS ENUM ('INFO', 'SUCCESS', 'WARNING', 'ERROR');
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL DEFAULT 'INFO',
    "read" BOOLEAN NOT NULL DEFAULT false,
    "link" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Notification_userId_idx" ON "Notification"("userId");
CREATE INDEX IF NOT EXISTS "Notification_read_idx" ON "Notification"("read");
CREATE INDEX IF NOT EXISTS "Notification_createdAt_idx" ON "Notification"("createdAt");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'Notification_userId_fkey'
    ) THEN
        ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey"
            FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- ============================================
-- Create UserInvoice and InvoiceLineItem tables if missing
-- ============================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_type t
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE t.typname = 'UserInvoiceStatus'
          AND n.nspname = current_schema()
    ) THEN
        CREATE TYPE "UserInvoiceStatus" AS ENUM ('DRAFT', 'PENDING', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_type t
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE t.typname = 'LineItemType'
          AND n.nspname = current_schema()
    ) THEN
        CREATE TYPE "LineItemType" AS ENUM (
            'VEHICLE_PRICE',
            'PURCHASE_PRICE',
            'INSURANCE',
            'SHIPPING_FEE',
            'CUSTOMS_FEE',
            'STORAGE_FEE',
            'HANDLING_FEE',
            'OTHER_FEE',
            'DISCOUNT'
        );
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS "UserInvoice" (
    "id" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "containerId" TEXT NOT NULL,
    "status" "UserInvoiceStatus" NOT NULL DEFAULT 'PENDING',
    "issueDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" TIMESTAMP(3),
    "paidDate" TIMESTAMP(3),
    "subtotal" DOUBLE PRECISION NOT NULL,
    "tax" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL,
    "paymentMethod" TEXT,
    "paymentReference" TEXT,
    "notes" TEXT,
    "internalNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserInvoice_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "UserInvoice_invoiceNumber_key" ON "UserInvoice"("invoiceNumber");
CREATE INDEX IF NOT EXISTS "UserInvoice_userId_idx" ON "UserInvoice"("userId");
CREATE INDEX IF NOT EXISTS "UserInvoice_containerId_idx" ON "UserInvoice"("containerId");
CREATE INDEX IF NOT EXISTS "UserInvoice_status_idx" ON "UserInvoice"("status");
CREATE INDEX IF NOT EXISTS "UserInvoice_invoiceNumber_idx" ON "UserInvoice"("invoiceNumber");
CREATE INDEX IF NOT EXISTS "UserInvoice_issueDate_idx" ON "UserInvoice"("issueDate");
CREATE INDEX IF NOT EXISTS "UserInvoice_dueDate_idx" ON "UserInvoice"("dueDate");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'UserInvoice_userId_fkey'
    ) THEN
        ALTER TABLE "UserInvoice" ADD CONSTRAINT "UserInvoice_userId_fkey"
            FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'UserInvoice_containerId_fkey'
    ) THEN
        ALTER TABLE "UserInvoice" ADD CONSTRAINT "UserInvoice_containerId_fkey"
            FOREIGN KEY ("containerId") REFERENCES "Container"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS "InvoiceLineItem" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "shipmentId" TEXT,
    "type" "LineItemType" NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvoiceLineItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "InvoiceLineItem_invoiceId_idx" ON "InvoiceLineItem"("invoiceId");
CREATE INDEX IF NOT EXISTS "InvoiceLineItem_shipmentId_idx" ON "InvoiceLineItem"("shipmentId");
CREATE INDEX IF NOT EXISTS "InvoiceLineItem_type_idx" ON "InvoiceLineItem"("type");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'InvoiceLineItem_invoiceId_fkey'
    ) THEN
        ALTER TABLE "InvoiceLineItem" ADD CONSTRAINT "InvoiceLineItem_invoiceId_fkey"
            FOREIGN KEY ("invoiceId") REFERENCES "UserInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'InvoiceLineItem_shipmentId_fkey'
    ) THEN
        ALTER TABLE "InvoiceLineItem" ADD CONSTRAINT "InvoiceLineItem_shipmentId_fkey"
            FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
