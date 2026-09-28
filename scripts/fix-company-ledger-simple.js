#!/usr/bin/env node

/**
 * Simple migration script to fix company ledger entries for expenses
 * Flips DEBIT → CREDIT for all expense-related entries
 * Uses batch updates without transactions
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasourceUrl: process.env.jacxi_PRISMA_DATABASE_URL,
  log: ['error'],
});

async function isExpenseEntry(entry) {
  // Check if entry is expense-related based on metadata or reference
  const metadata = entry.metadata && typeof entry.metadata === 'object' ? entry.metadata : {};
  const reference = entry.reference || '';

  const expenseIndicators = [
    metadata.isExpenseRecovery,
    metadata.isTransitExpense,
    metadata.isDispatchExpense,
    metadata.isContainerExpense,
    metadata.isDamage,
    reference.includes('shipment-expense:'),
    reference.includes('transit-expense:'),
    reference.includes('dispatch-expense:'),
    reference.includes('container-expense:'),
    reference.includes('container-damage:'),
    entry.category?.includes('Expense'),
    entry.category?.includes('Damage'),
    entry.description?.includes('expense'),
    entry.description?.includes('Damage'),
  ];

  return expenseIndicators.some((indicator) => indicator === true);
}

async function main() {
  console.log('🔧 Starting company ledger expense entry fix...\n');

  try {
    // Get all company ledger entries
    const allEntries = await prisma.companyLedgerEntry.findMany({
      orderBy: [{ companyId: 'asc' }, { transactionDate: 'asc' }],
    });

    console.log(`📊 Total company ledger entries: ${allEntries.length}\n`);

    // Group by company
    const entriesByCompany = new Map();
    for (const entry of allEntries) {
      if (!entriesByCompany.has(entry.companyId)) {
        entriesByCompany.set(entry.companyId, []);
      }
      entriesByCompany.get(entry.companyId).push(entry);
    }

    console.log(`🏢 Companies to process: ${entriesByCompany.size}\n`);

    let totalFlipped = 0;

    // Process each company
    for (const [companyId, entries] of entriesByCompany) {
      console.log(`\n🔄 Processing company: ${companyId}`);

      const entriesToFlip = [];

      // Identify which entries need to be flipped
      for (const entry of entries) {
        const isExpense = await isExpenseEntry(entry);
        if (isExpense && entry.type === 'DEBIT') {
          entriesToFlip.push(entry);
        }
      }

      console.log(`   - Total entries: ${entries.length}`);
      console.log(`   - Expense entries to flip: ${entriesToFlip.length}`);

      if (entriesToFlip.length === 0) {
        console.log(`   ✓ No entries to flip`);
        continue;
      }

      // Flip the entries using batch update
      console.log(`   ⏳ Flipping ${entriesToFlip.length} entries...`);

      const flipResult = await prisma.companyLedgerEntry.updateMany({
        where: {
          id: { in: entriesToFlip.map((e) => e.id) },
          type: 'DEBIT',
        },
        data: {
          type: 'CREDIT',
        },
      });

      console.log(`   ✅ Flipped ${flipResult.count} entries`);

      // Now recalculate balances for this company
      console.log(`   ⏳ Recalculating ${entries.length} balance entries...`);

      const allCompanyEntries = await prisma.companyLedgerEntry.findMany({
        where: { companyId },
        orderBy: [{ transactionDate: 'asc' }, { createdAt: 'asc' }],
      });

      let runningBalance = 0;
      let updateCount = 0;

      for (const entry of allCompanyEntries) {
        // Apply delta based on type
        runningBalance =
          entry.type === 'DEBIT' ? runningBalance + entry.amount : runningBalance - entry.amount;

        if (entry.balance !== runningBalance) {
          await prisma.companyLedgerEntry.update({
            where: { id: entry.id },
            data: { balance: runningBalance },
          });
          updateCount++;
        }
      }

      console.log(`   ✅ Recalculated ${updateCount} balance entries`);

      totalFlipped += flipResult.count;
    }

    console.log(`\n✅ Migration complete!`);
    console.log(`📈 Total entries flipped: ${totalFlipped}\n`);

    console.log('✨ Company ledger entries are now correctly:');
    console.log('   - CREDIT: Company services/expenses (they provide the service)');
    console.log('   - DEBIT: Payments to companies (you pay them)\n');
  } catch (error) {
    console.error('❌ Error during migration:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
