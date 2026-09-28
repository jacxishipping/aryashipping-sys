/**
 * Change the admin password (or any user's password by email).
 *
 * Usage:
 *   node scripts/change-password.js                    # prompts for email + password
 *   node scripts/change-password.js --email a@b.com    # prompts for password only
 *
 * The password is read via hidden prompt — it is never stored in shell
 * history or passed as a CLI argument.
 */
const fs = require('fs');
const path = require('path');
const readline = require('readline');

for (const line of fs.readFileSync(path.join(process.cwd(), '.env'), 'utf8').split(/\r?\n/)) {
  if (!line || line.startsWith('#')) continue;
  const idx = line.indexOf('=');
  if (idx === -1) continue;
  const key = line.slice(0, idx).trim();
  const value = line.slice(idx + 1).trim();
  if (key && value && process.env[key] === undefined) process.env[key] = value;
}

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const args = process.argv.slice(2);
const emailArgIdx = args.indexOf('--email');
const presetEmail = emailArgIdx !== -1 ? args[emailArgIdx + 1] : undefined;

function ask(rl, question, hidden) {
  return new Promise((resolve) => {
    if (!hidden) {
      rl.question(question, resolve);
      return;
    }
    // Hidden prompt: read a single line with echo disabled.
    const stdin = process.stdin;
    let answer = '';
    process.stdout.write(question);
    stdin.setRawMode && stdin.setRawMode(true);
    stdin.resume();
    const onData = (chunk, key) => {
      if (key && key.ctrl && key.name === 'c') {
        stdin.setRawMode && stdin.setRawMode(false);
        process.exit(1);
      }
      if (key && (key.name === 'return' || key.name === 'enter')) {
        stdin.setRawMode && stdin.setRawMode(false);
        stdin.removeListener('data', onData);
        stdin.pause();
        process.stdout.write('\n');
        resolve(answer);
        return;
      }
      if (key && key.name === 'backspace') {
        answer = answer.slice(0, -1);
        return;
      }
      answer += typeof chunk === 'string' ? chunk : '';
    };
    stdin.on('data', onData);
  });
}

async function main() {
  const prisma = new PrismaClient({
    datasourceUrl:
      process.env.jacxi_DATABASE_URL ||
      process.env.DATABASE_URL ||
      process.env.jacxi_PRISMA_DATABASE_URL ||
      process.env.jacxi_POSTGRES_URL,
  });

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  rl.output.write(''); // keep readline quiet for hidden prompts

  try {
    const email = (
      presetEmail ||
      (await ask(rl, 'Email of the account to update: ', false))
    )
      .trim()
      .toLowerCase();

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      console.error(`❌ No user found with email: ${email}`);
      process.exit(1);
    }

    const password = await ask(rl, 'New password (min 8 chars): ', true);
    if (!password || password.length < 8) {
      console.error('❌ Password must be at least 8 characters.');
      process.exit(1);
    }
    const confirm = await ask(rl, 'Confirm new password: ', true);
    if (password !== confirm) {
      console.error('❌ Passwords do not match.');
      process.exit(1);
    }

    const hashed = await bcrypt.hash(password, 12); // matches app convention (12 rounds)
    await prisma.user.update({ where: { email }, data: { passwordHash: hashed } });

    console.log(`✅ Password updated for ${email} (role: ${user.role}).`);
    console.log('ℹ️  You will need to log in again with the new password.');
  } finally {
    rl.close();
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('❌ Failed to change password:', error);
  process.exit(1);
});
