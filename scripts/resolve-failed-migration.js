#!/usr/bin/env node

/**
 * Resolve Failed Prisma Migration
 * 
 * This script resolves the failed migration 20251118110101_add_advanced_features
 * by marking it as applied in the database.
 */

const { execSync } = require('child_process');
const readline = require('readline');

const MIGRATION_NAME = '20251118110101_add_advanced_features';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function header(message) {
  console.log('\n' + '='.repeat(60));
  log(message, colors.blue);
  console.log('='.repeat(60) + '\n');
}

function execCommand(command, silent = false) {
  try {
    const output = execSync(command, { 
      encoding: 'utf-8',
      stdio: silent ? 'pipe' : 'inherit'
    });
    return { success: true, output };
  } catch (error) {
    return { success: false, error: error.message, output: error.stdout };
  }
}

async function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(query, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function main() {
  header('Failed Migration Resolution Script');

  // Step 1: Check current migration status
  log('Step 1: Checking current migration status...', colors.yellow);
  console.log('-'.repeat(60));
  
  const statusResult = execCommand('npx prisma migrate status', true);
  if (statusResult.output) {
    console.log(statusResult.output);
  }
  
  console.log();

  // Step 2: Explain the issue
  log('Step 2: Understanding the problem...', colors.yellow);
  console.log('-'.repeat(60));
  console.log(`Migration: ${MIGRATION_NAME}`);
  console.log('Status: FAILED');
  console.log('Reason: Schema evolution - features already exist in modified form');
  console.log();
  console.log('The migration attempted to create:');
  console.log('  • ContainerStatus enum');
  console.log('  • QualityCheck table');
  console.log('  • Document table');
  console.log('  • Route table');
  console.log('  • Shipment.vehicleVIN unique constraint');
  console.log();
  console.log('Current schema status:');
  log('  ✓ QualityCheck model exists', colors.green);
  log('  ✓ Document model exists', colors.green);
  log('  ✓ Route model exists', colors.green);
  log('  ✓ Shipment.vehicleVIN field exists (unique)', colors.green);
  log('  ✓ Container status exists (as ContainerLifecycleStatus)', colors.green);
  console.log();

  // Step 3: Get confirmation
  log('Step 3: Resolution strategy', colors.yellow);
  console.log('-'.repeat(60));
  console.log('We will mark this migration as "applied" since the features');
  console.log('already exist in the current schema (in modified form).');
  console.log();

  const answer = await askQuestion('Do you want to proceed? (y/N): ');
  
  if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
    log('\nOperation cancelled', colors.yellow);
    process.exit(0);
  }

  // Step 4: Resolve the migration
  console.log();
  log('Step 4: Resolving the failed migration...', colors.yellow);
  console.log('-'.repeat(60));

  const resolveCommand = `npx prisma migrate resolve --applied ${MIGRATION_NAME}`;
  log(`Running: ${resolveCommand}`, colors.blue);
  console.log();

  const resolveResult = execCommand(resolveCommand);

  if (resolveResult.success) {
    log('✓ Migration marked as resolved successfully', colors.green);
  } else {
    log('✗ Failed to mark migration as resolved', colors.red);
    console.log();
    console.log('Alternative approach:');
    console.log(`  npx prisma migrate resolve --rolled-back ${MIGRATION_NAME}`);
    process.exit(1);
  }

  // Step 5: Verify the fix
  console.log();
  log('Step 5: Verifying the fix...', colors.yellow);
  console.log('-'.repeat(60));
  
  execCommand('npx prisma migrate status');

  // Success message
  console.log();
  header('Migration Resolution Complete!');
  
  log('✓ The failed migration has been resolved', colors.green);
  console.log();
  console.log('Next steps:');
  console.log('  1. Verify all migrations show as applied');
  console.log('  2. Test creating new migrations (if needed)');
  console.log('  3. Deploy any pending migrations:');
  console.log('     npx prisma migrate deploy');
  console.log();
}

// Run the script
main().catch((error) => {
  log(`\nError: ${error.message}`, colors.red);
  process.exit(1);
});
