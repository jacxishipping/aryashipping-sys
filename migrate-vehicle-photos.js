#!/usr/bin/env node
/**
 * Migration Script: Rename containerPhotos to vehiclePhotos
 * 
 * This script safely renames the containerPhotos column to vehiclePhotos
 * and adds the arrivalPhotos column if needed, preserving all existing data.
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const prisma = new PrismaClient({
    datasourceUrl: process.env.jacxi_DATABASE_URL
});

async function checkColumnExists(columnName) {
  try {
    const result = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'Shipment' 
      AND column_name = ${columnName}
    `;
    return result.length > 0;
  } catch (error) {
    console.error(`Error checking column ${columnName}:`, error);
    return false;
  }
}

async function runMigration() {
  console.log('🔍 Checking current database schema...\n');

  try {
    // Check what columns exist
    const hasContainerPhotos = await checkColumnExists('containerPhotos');
    const hasVehiclePhotos = await checkColumnExists('vehiclePhotos');
    const hasArrivalPhotos = await checkColumnExists('arrivalPhotos');

    console.log('Current state:');
    console.log(`  - containerPhotos: ${hasContainerPhotos ? '✅ EXISTS' : '❌ NOT FOUND'}`);
    console.log(`  - vehiclePhotos:   ${hasVehiclePhotos ? '✅ EXISTS' : '❌ NOT FOUND'}`);
    console.log(`  - arrivalPhotos:   ${hasArrivalPhotos ? '✅ EXISTS' : '❌ NOT FOUND'}`);
    console.log('');

    // Read and execute migration SQL
    console.log('📝 Applying migration...\n');
    const migrationPath = path.join(
      __dirname, 
      'prisma/migrations/20251206180000_rename_container_photos_to_vehicle_photos/migration.sql'
    );
    
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    // Split by DO blocks and execute separately (PostgreSQL doesn't allow multiple DO blocks in one statement)
    const statements = sql.split(/(?=DO \$\$)/g).filter(s => s.trim());
    
    for (const statement of statements) {
      if (statement.trim()) {
        await prisma.$executeRawUnsafe(statement);
      }
    }

    console.log('✅ Migration SQL executed successfully!\n');

    // Verify the changes
    console.log('🔍 Verifying changes...\n');
    const hasContainerPhotosAfter = await checkColumnExists('containerPhotos');
    const hasVehiclePhotosAfter = await checkColumnExists('vehiclePhotos');
    const hasArrivalPhotosAfter = await checkColumnExists('arrivalPhotos');

    console.log('After migration:');
    console.log(`  - containerPhotos: ${hasContainerPhotosAfter ? '⚠️  STILL EXISTS' : '✅ REMOVED'}`);
    console.log(`  - vehiclePhotos:   ${hasVehiclePhotosAfter ? '✅ EXISTS' : '❌ NOT FOUND'}`);
    console.log(`  - arrivalPhotos:   ${hasArrivalPhotosAfter ? '✅ EXISTS' : '❌ NOT FOUND'}`);
    console.log('');

    // Check if any data exists
    const shipmentCount = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM "Shipment"
    `;
    const count = Number(shipmentCount[0].count);
    
    if (count > 0) {
      const shipmentsWithPhotos = await prisma.$queryRaw`
        SELECT COUNT(*) as count 
        FROM "Shipment" 
        WHERE "vehiclePhotos" IS NOT NULL 
        AND array_length("vehiclePhotos", 1) > 0
      `;
      const photosCount = Number(shipmentsWithPhotos[0].count);
      
      console.log(`📊 Data Statistics:`);
      console.log(`  - Total shipments: ${count}`);
      console.log(`  - Shipments with photos: ${photosCount}`);
      console.log('');
    }

    console.log('✅ Migration completed successfully!');
    console.log('');
    console.log('Next steps:');
    console.log('  1. Restart your Next.js development server');
    console.log('  2. Test creating a new shipment with photos');
    console.log('  3. Verify existing shipments still show their photos');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    console.error('');
    console.error('Troubleshooting:');
    console.error('  1. Make sure your DATABASE_URL is set correctly');
    console.error('  2. Ensure the database is accessible');
    console.error('  3. Check that you have proper permissions');
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Check if DATABASE_URL is set
if (!process.env.DATABASE_URL) {
  console.error('❌ Error: DATABASE_URL environment variable is not set');
  console.error('');
  console.error('Please set it before running this script:');
  console.error('  export DATABASE_URL="your-database-url"');
  console.error('  node migrate-vehicle-photos.js');
  process.exit(1);
}

console.log('');
console.log('='.repeat(60));
console.log('  Vehicle Photos Migration Script');
console.log('='.repeat(60));
console.log('');
console.log('This will rename containerPhotos → vehiclePhotos');
console.log('All existing photo data will be preserved.');
console.log('');

runMigration();
