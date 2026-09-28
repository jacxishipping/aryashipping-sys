#!/bin/bash
# Quick Migration Commands for Container System Restructure
# Run these commands in order

echo "=========================================="
echo "Container System Migration - Quick Start"
echo "=========================================="
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Not in project root directory"
    echo "Please cd to /workspace first"
    exit 1
fi

echo "✓ In project directory"
echo ""

# Step 1: Check if dependencies are installed
echo "Step 1: Checking dependencies..."
if [ ! -d "node_modules" ]; then
    echo "⚠️  Dependencies not installed"
    echo "Running: npm install"
    npm install
else
    echo "✓ Dependencies already installed"
fi
echo ""

# Step 2: Check DATABASE_URL
echo "Step 2: Checking DATABASE_URL..."
if [ -z "$DATABASE_URL" ] && [ ! -f ".env" ]; then
    echo "⚠️  DATABASE_URL not found"
    echo "Please create .env file with:"
    echo 'DATABASE_URL="postgresql://user:password@localhost:5432/database"'
    echo ""
    echo "Exiting..."
    exit 1
else
    echo "✓ DATABASE_URL configured"
fi
echo ""

# Step 3: Create backup (optional)
echo "Step 3: Backup (optional, recommended for production)"
echo "Skip backup? (y/n)"
read -r skip_backup

if [ "$skip_backup" != "y" ]; then
    echo "Running backup..."
    npm run db:backup
    echo "✓ Backup created"
else
    echo "⚠️  Skipping backup"
fi
echo ""

# Step 4: Run migration
echo "Step 4: Running migration..."
echo "This will apply the container system restructure"
echo "Continue? (y/n)"
read -r continue_migration

if [ "$continue_migration" = "y" ]; then
    echo "Running: npm run db:migrate"
    npm run db:migrate
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "✅ Migration completed successfully!"
    else
        echo ""
        echo "❌ Migration failed"
        echo "Check error messages above"
        exit 1
    fi
else
    echo "Migration cancelled"
    exit 0
fi

echo ""
echo "=========================================="
echo "✅ Container System Migration Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Generate Prisma Client: npm run db:generate"
echo "2. Start development server: npm run dev"
echo "3. Navigate to: http://localhost:3000/dashboard/containers"
echo ""
echo "Happy shipping! 🚢"
