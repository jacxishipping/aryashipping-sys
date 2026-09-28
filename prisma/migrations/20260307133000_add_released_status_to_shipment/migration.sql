-- Add RELEASED status to shipment enum
ALTER TYPE "ShipmentSimpleStatus" ADD VALUE IF NOT EXISTS 'RELEASED';
