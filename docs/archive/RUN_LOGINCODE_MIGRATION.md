# Run Migration to Fix loginCode Error

## Problem
The `User.loginCode` column doesn't exist in your database, causing authentication errors.

## Solution
Run the migration to add the column. Follow these steps **in your production environment** (where the database is accessible):

### Option 1: Using Docker (Recommended for Production)

If you're deploying with Docker, the migration will run automatically on container start. Just make sure you have the correct environment variables set:

```bash
docker run -d \
  -e jacxi_DATABASE_URL="postgres://user:password@host:5432/database?sslmode=require" \
  -e jacxi_POSTGRES_URL="postgres://user:password@host:5432/database?sslmode=require" \
  -e jacxi_PRISMA_DATABASE_URL="prisma+postgres://accelerate.prisma-data.net/?api_key=YOUR_API_KEY_HERE" \
  -e NEXTAUTH_SECRET="your-secret-here" \
  -e NEXTAUTH_URL="https://your-domain.com" \
  -p 3000:3000 \
  your-image-name
```

The Dockerfile already includes `npx prisma migrate deploy` in the startup command, so migrations will run automatically.

### Option 2: Using Docker Compose (Easiest)

1. Use the provided `docker-compose.yml` file
2. Create a `.env` file in the project root with your environment variables (see below)
3. Run: `docker-compose up -d`

**Create `.env` file:**
```env
jacxi_DATABASE_URL=postgres://user:password@host:5432/database?sslmode=require
jacxi_POSTGRES_URL=postgres://user:password@host:5432/database?sslmode=require
jacxi_PRISMA_DATABASE_URL=prisma+postgres://accelerate.prisma-data.net/?api_key=YOUR_API_KEY_HERE
NEXTAUTH_SECRET=your-secret-here-change-in-production
NEXTAUTH_URL=http://localhost:3000
```

**Note:** Replace the placeholder values above with your actual database credentials.

Then run:
```bash
docker-compose up -d
```

### Option 3: Manual Migration (Local Development or Direct Server Access)

If you have direct access to a server where the database is reachable:

1. **Set environment variables:**
```bash
export jacxi_DATABASE_URL="postgres://user:password@host:5432/database?sslmode=require"
export jacxi_POSTGRES_URL="postgres://user:password@host:5432/database?sslmode=require"
```

2. **Install dependencies:**
```bash
npm install
```

3. **Run migration:**
```bash
npx prisma migrate deploy
```

4. **Verify the migration:**
```bash
npx prisma migrate status
```

### Option 4: Vercel Deployment

If deploying to Vercel:

1. **Set environment variables in Vercel dashboard:**
   - Go to your project settings
   - Navigate to Environment Variables
   - Add:
     - `jacxi_DATABASE_URL`
     - `jacxi_POSTGRES_URL`
     - `jacxi_PRISMA_DATABASE_URL`
     - `NEXTAUTH_SECRET`
     - `NEXTAUTH_URL`

2. **Add a post-build script** (Vercel will run this automatically):
   
   The `package.json` already includes `prisma generate` in the build script. You can run migrations manually after deployment using:
   
   ```bash
   vercel env pull .env.local
   npx prisma migrate deploy
   ```

## What the Migration Does

The migration file (`20260131223000_add_login_codes/migration.sql`) will:

1. Add a new `loginCode` column to the `User` table (TEXT type, nullable)
2. Create a unique index on the `loginCode` column

## SQL being executed:
```sql
-- AlterTable
ALTER TABLE "User" ADD COLUMN "loginCode" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_loginCode_key" ON "User"("loginCode");
```

## Verification

After running the migration, verify it worked:

```bash
npx prisma migrate status
```

You should see:
```
Database schema is up to date!
```

## Troubleshooting

### "Can't reach database server"
- Ensure the database is accessible from where you're running the command
- Check firewall rules
- Verify the database URL is correct

### "Migration already applied"
- This is fine! It means the migration was already run
- No action needed

### "Environment variable not found"
- Make sure you've set all required environment variables
- Use the exact names: `jacxi_DATABASE_URL` and `jacxi_POSTGRES_URL`
- Don't use quotes around values in shell exports

## Security Note

⚠️ **Important:** The database credentials are included in this guide for convenience. In production:
- Never commit `.env` files to git (already in `.gitignore`)
- Use environment variables from your hosting platform
- Rotate credentials regularly
- Use secrets management for sensitive values
