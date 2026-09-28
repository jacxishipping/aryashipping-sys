import { prisma } from '../src/lib/db';

async function main() {
  console.log('Creating OfficeExpense table and enums if not exists...');
  
  const statements = [
    `DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'OfficeExpenseCategory') THEN
        CREATE TYPE "OfficeExpenseCategory" AS ENUM (
          'RENT', 'UTILITIES', 'SALARIES_PAYROLL', 'OFFICE_SUPPLIES',
          'EQUIPMENT_HARDWARE', 'SOFTWARE_SUBSCRIPTIONS', 'MAINTENANCE_REPAIRS',
          'TRAVEL_TRANSPORT', 'MARKETING_ADVERTISING', 'LEGAL_PROFESSIONAL',
          'COMMUNICATION_INTERNET', 'TAXES_GOVERNMENT_FEES', 'BANK_FEES',
          'MEALS_ENTERTAINMENT', 'OTHER'
        );
      END IF;
    END $$;`,

    `DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ExpensePaymentStatus') THEN
        CREATE TYPE "ExpensePaymentStatus" AS ENUM ('PAID', 'PENDING', 'CANCELLED');
      END IF;
    END $$;`,

    `CREATE TABLE IF NOT EXISTS "OfficeExpense" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "title" TEXT NOT NULL,
      "category" "OfficeExpenseCategory" NOT NULL DEFAULT 'OTHER',
      "amount" DOUBLE PRECISION NOT NULL,
      "currency" TEXT NOT NULL DEFAULT 'USD',
      "expenseDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "paymentMethod" TEXT NOT NULL DEFAULT 'CASH',
      "vendor" TEXT,
      "referenceNumber" TEXT,
      "receiptUrl" TEXT,
      "receiptName" TEXT,
      "notes" TEXT,
      "status" "ExpensePaymentStatus" NOT NULL DEFAULT 'PAID',
      "recordedById" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "OfficeExpense_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
    );`,

    `CREATE INDEX IF NOT EXISTS "OfficeExpense_category_idx" ON "OfficeExpense"("category");`,
    `CREATE INDEX IF NOT EXISTS "OfficeExpense_expenseDate_idx" ON "OfficeExpense"("expenseDate");`,
    `CREATE INDEX IF NOT EXISTS "OfficeExpense_status_idx" ON "OfficeExpense"("status");`,
    `CREATE INDEX IF NOT EXISTS "OfficeExpense_recordedById_idx" ON "OfficeExpense"("recordedById");`,
    `CREATE INDEX IF NOT EXISTS "OfficeExpense_createdAt_idx" ON "OfficeExpense"("createdAt");`,
  ];

  for (const sql of statements) {
    await prisma.$executeRawUnsafe(sql);
  }

  console.log('✅ OfficeExpense table successfully verified and ready in DB!');
}

main()
  .catch((e) => {
    console.error('Error creating OfficeExpense table:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
