-- Rename containerPhotos to vehiclePhotos and add arrivalPhotos if needed
-- This migration safely handles existing data

-- Step 1: Check and rename containerPhotos to vehiclePhotos if it exists
DO $$ 
BEGIN
    -- If containerPhotos exists, rename it to vehiclePhotos
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = current_schema() AND table_name = 'Shipment' 
        AND column_name = 'containerPhotos'
    ) THEN
        ALTER TABLE "Shipment" RENAME COLUMN "containerPhotos" TO "vehiclePhotos";
        RAISE NOTICE 'Renamed containerPhotos to vehiclePhotos';
    ELSE
        -- If vehiclePhotos doesn't exist either, create it
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = current_schema() AND table_name = 'Shipment' 
            AND column_name = 'vehiclePhotos'
        ) THEN
            ALTER TABLE "Shipment" ADD COLUMN "vehiclePhotos" TEXT[] DEFAULT ARRAY[]::TEXT[];
            RAISE NOTICE 'Created vehiclePhotos column';
        ELSE
            RAISE NOTICE 'vehiclePhotos column already exists';
        END IF;
    END IF;
END $$;

-- Step 2: Add arrivalPhotos column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = current_schema() AND table_name = 'Shipment' 
        AND column_name = 'arrivalPhotos'
    ) THEN
        ALTER TABLE "Shipment" ADD COLUMN "arrivalPhotos" TEXT[] DEFAULT ARRAY[]::TEXT[];
        RAISE NOTICE 'Created arrivalPhotos column';
    ELSE
        RAISE NOTICE 'arrivalPhotos column already exists';
    END IF;
END $$;
