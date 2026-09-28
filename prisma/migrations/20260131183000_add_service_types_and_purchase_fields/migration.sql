-- Migration: Add Service Types and Purchase Fields
-- This migration adds support for two service types (Purchase+Shipping and Shipping-Only)
-- and adds purchase-related fields for tracking vehicle purchases

-- Step 1: Create ServiceType enum
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_type t
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE t.typname = 'ServiceType'
          AND n.nspname = current_schema()
    ) THEN
        CREATE TYPE "ServiceType" AS ENUM ('PURCHASE_AND_SHIPPING', 'SHIPPING_ONLY');
        RAISE NOTICE 'Created ServiceType enum';
    ELSE
        RAISE NOTICE 'ServiceType enum already exists';
    END IF;
END $$;

-- Step 2: Create ExpenseAllocationMethod enum
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_type t
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE t.typname = 'ExpenseAllocationMethod'
          AND n.nspname = current_schema()
    ) THEN
        CREATE TYPE "ExpenseAllocationMethod" AS ENUM ('EQUAL', 'BY_VALUE', 'BY_WEIGHT', 'CUSTOM');
        RAISE NOTICE 'Created ExpenseAllocationMethod enum';
    ELSE
        RAISE NOTICE 'ExpenseAllocationMethod enum already exists';
    END IF;
END $$;

-- Step 3: Add serviceType to Shipment table with default SHIPPING_ONLY
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = current_schema() AND table_name = 'Shipment' 
        AND column_name = 'serviceType'
    ) THEN
        ALTER TABLE "Shipment" ADD COLUMN "serviceType" "ServiceType" DEFAULT 'SHIPPING_ONLY';
        RAISE NOTICE 'Added serviceType column to Shipment table';
    ELSE
        RAISE NOTICE 'serviceType column already exists';
    END IF;
END $$;

-- Step 4: Add purchase-related fields to Shipment table
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = current_schema() AND table_name = 'Shipment' 
        AND column_name = 'purchasePrice'
    ) THEN
        ALTER TABLE "Shipment" ADD COLUMN "purchasePrice" DOUBLE PRECISION;
        RAISE NOTICE 'Added purchasePrice column to Shipment table';
    ELSE
        RAISE NOTICE 'purchasePrice column already exists';
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = current_schema() AND table_name = 'Shipment' 
        AND column_name = 'purchaseDate'
    ) THEN
        ALTER TABLE "Shipment" ADD COLUMN "purchaseDate" TIMESTAMP(3);
        RAISE NOTICE 'Added purchaseDate column to Shipment table';
    ELSE
        RAISE NOTICE 'purchaseDate column already exists';
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = current_schema() AND table_name = 'Shipment' 
        AND column_name = 'purchaseLocation'
    ) THEN
        ALTER TABLE "Shipment" ADD COLUMN "purchaseLocation" TEXT;
        RAISE NOTICE 'Added purchaseLocation column to Shipment table';
    ELSE
        RAISE NOTICE 'purchaseLocation column already exists';
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = current_schema() AND table_name = 'Shipment' 
        AND column_name = 'dealerName'
    ) THEN
        ALTER TABLE "Shipment" ADD COLUMN "dealerName" TEXT;
        RAISE NOTICE 'Added dealerName column to Shipment table';
    ELSE
        RAISE NOTICE 'dealerName column already exists';
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = current_schema() AND table_name = 'Shipment' 
        AND column_name = 'purchaseNotes'
    ) THEN
        ALTER TABLE "Shipment" ADD COLUMN "purchaseNotes" TEXT;
        RAISE NOTICE 'Added purchaseNotes column to Shipment table';
    ELSE
        RAISE NOTICE 'purchaseNotes column already exists';
    END IF;
END $$;

-- Step 5: Add expenseAllocationMethod to Container table with default EQUAL
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = current_schema() AND table_name = 'Container' 
        AND column_name = 'expenseAllocationMethod'
    ) THEN
        ALTER TABLE "Container" ADD COLUMN "expenseAllocationMethod" "ExpenseAllocationMethod" DEFAULT 'EQUAL';
        RAISE NOTICE 'Added expenseAllocationMethod column to Container table';
    ELSE
        RAISE NOTICE 'expenseAllocationMethod column already exists';
    END IF;
END $$;

-- Step 6: Add PURCHASE_PRICE to LineItemType enum
DO $$
BEGIN
        IF EXISTS (
                SELECT 1
                FROM pg_type t
                JOIN pg_namespace n ON n.oid = t.typnamespace
                WHERE t.typname = 'LineItemType'
                    AND n.nspname = current_schema()
        ) THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_enum 
            WHERE enumlabel = 'PURCHASE_PRICE' 
            AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'LineItemType')
        ) THEN
            ALTER TYPE "LineItemType" ADD VALUE 'PURCHASE_PRICE' AFTER 'VEHICLE_PRICE';
            RAISE NOTICE 'Added PURCHASE_PRICE to LineItemType enum';
        ELSE
            RAISE NOTICE 'PURCHASE_PRICE already exists in LineItemType enum';
        END IF;
    ELSE
        RAISE NOTICE 'Skipped PURCHASE_PRICE enum update because LineItemType does not exist yet';
    END IF;
END $$;

-- Migration complete
-- All schema changes for dual service type support have been applied
