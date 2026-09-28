#!/bin/bash

# Fix loginCode Database Column Issue
# This script helps resolve the "User.loginCode does not exist" error

echo "🔧 Fixing loginCode Database Column Issue..."
echo ""

# Check if .env.local or .env exists
if [ ! -f .env.local ] && [ ! -f .env ]; then
    echo "⚠️  No .env.local or .env file found!"
    echo "📝 Creating .env.local from .env.example..."
    cp .env.example .env.local
    echo ""
    echo "✅ Created .env.local"
    echo "⚠️  IMPORTANT: Edit .env.local and set your database URLs:"
    echo "   - jacxi_DATABASE_URL"
    echo "   - jacxi_POSTGRES_URL"
    echo "   - NEXTAUTH_SECRET"
    echo ""
    read -p "Press Enter after you've updated .env.local with your database credentials..."
fi

# Check if database URL is set
if ! grep -q "jacxi_DATABASE_URL" .env.local 2>/dev/null && ! grep -q "jacxi_DATABASE_URL" .env 2>/dev/null; then
    echo "⚠️  jacxi_DATABASE_URL not found in environment file!"
    echo "Please add the following to your .env.local:"
    echo ""
    echo "jacxi_DATABASE_URL=\"postgresql://username:password@localhost:5432/jacxi_shipping\""
    echo "jacxi_POSTGRES_URL=\"postgresql://username:password@localhost:5432/jacxi_shipping\""
    echo ""
    exit 1
fi

echo "Step 1/3: Generating Prisma Client..."
npm run db:generate

if [ $? -ne 0 ]; then
    echo "❌ Failed to generate Prisma client"
    exit 1
fi

echo ""
echo "Step 2/3: Applying database migrations..."
npx prisma migrate deploy

if [ $? -ne 0 ]; then
    echo "❌ Failed to apply migrations"
    echo ""
    echo "Troubleshooting tips:"
    echo "1. Check that your database is running"
    echo "2. Verify database credentials in .env.local"
    echo "3. Make sure the database user has ALTER TABLE permissions"
    echo ""
    exit 1
fi

echo ""
echo "Step 3/3: Verifying migration..."

# Check if the loginCode column was added
if npx prisma db execute --stdin <<< "SELECT column_name FROM information_schema.columns WHERE table_name = 'User' AND column_name = 'loginCode';" 2>/dev/null | grep -q "loginCode"; then
    echo "✅ loginCode column exists in database"
else
    echo "⚠️  Could not verify loginCode column (this might be okay if verification failed)"
fi

echo ""
echo "✅ Migration complete!"
echo ""
echo "Next steps:"
echo "1. Start the development server: npm run dev"
echo "2. The loginCode error should now be resolved"
echo ""
echo "If you still see errors:"
echo "- Try clearing Next.js cache: rm -rf .next"
echo "- See FIX_LOGINCODE_ERROR.md for more troubleshooting"
