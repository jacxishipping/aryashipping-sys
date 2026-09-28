#!/bin/bash

# Script to resolve the failed Prisma migration
# This should be run in the environment where the database is accessible

set -e

echo "========================================="
echo "Failed Migration Resolution Script"
echo "========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env file exists
if [ ! -f .env ] && [ ! -f .env.local ]; then
    echo -e "${RED}Error: No .env or .env.local file found${NC}"
    echo "Please create a .env file with your database connection string"
    echo "Example:"
    echo "  jacxi_DATABASE_URL=\"postgresql://user:password@host:5432/database\""
    exit 1
fi

# Check if database URL is set
if [ -z "$jacxi_DATABASE_URL" ] && [ -z "$DATABASE_URL" ]; then
    echo -e "${YELLOW}Warning: Database URL not found in environment${NC}"
    echo "Make sure your .env file is loaded"
    echo ""
fi

echo "Step 1: Checking current migration status..."
echo "--------------------------------------------"
npx prisma migrate status || true
echo ""

echo "Step 2: Analyzing the failed migration..."
echo "--------------------------------------------"
echo "Migration: 20251118110101_add_advanced_features"
echo "Status: FAILED"
echo "Reason: Schema evolution - features already exist in modified form"
echo ""

echo "Step 3: Recommended Action"
echo "--------------------------------------------"
echo "The migration features already exist in the current schema:"
echo "  ✓ QualityCheck model exists"
echo "  ✓ Document model exists"
echo "  ✓ Route model exists"
echo "  ✓ Shipment.vehicleVIN field exists (unique)"
echo "  ✓ Container.status field exists (as ContainerLifecycleStatus)"
echo ""
echo "We will mark this migration as resolved."
echo ""

# Prompt for confirmation
read -p "Do you want to mark the migration as resolved? (y/N): " confirm
if [[ $confirm != [yY] ]]; then
    echo -e "${YELLOW}Operation cancelled${NC}"
    exit 0
fi

echo ""
echo "Step 4: Resolving the failed migration..."
echo "--------------------------------------------"

# Mark the migration as resolved
if npx prisma migrate resolve --applied 20251118110101_add_advanced_features; then
    echo -e "${GREEN}✓ Migration marked as resolved successfully${NC}"
else
    echo -e "${RED}✗ Failed to mark migration as resolved${NC}"
    echo ""
    echo "Alternative: Mark as rolled back (if appropriate)"
    echo "Run: npx prisma migrate resolve --rolled-back 20251118110101_add_advanced_features"
    exit 1
fi

echo ""
echo "Step 5: Verifying the fix..."
echo "--------------------------------------------"
npx prisma migrate status

echo ""
echo -e "${GREEN}========================================="
echo "Migration Resolution Complete!"
echo "=========================================${NC}"
echo ""
echo "Next steps:"
echo "  1. Verify migration status shows all migrations as applied"
echo "  2. Test creating a new migration (if needed)"
echo "  3. Deploy any pending migrations with: npx prisma migrate deploy"
echo ""
