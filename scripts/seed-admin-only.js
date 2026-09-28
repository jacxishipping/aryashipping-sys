const fs = require('fs');

for (const line of fs.readFileSync('.env', 'utf8').split(/\r?\n/)) {
  if (!line || line.startsWith('#')) continue;
  const idx = line.indexOf('=');
  if (idx === -1) continue;
  const key = line.slice(0, idx).trim();
  const value = line.slice(idx + 1).trim();
  process.env[key] = value;
}

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

/**
 * ⚠️ SAFETY NOTE — READ BEFORE EDITING
 *
 * An earlier version of this script ran:
 *   await prisma.user.deleteMany({ where: { role: { not: 'admin' } } })
 * Because Shipment.user has onDelete: Cascade in prisma/schema.prisma,
 * deleting a customer user cascade-deleted ALL of their shipments.
 * That run wiped 200+ production shipments (incident 2026-09-18).
 *
 * This script must NEVER delete users. If you need to remove users,
 * write an explicit, reviewed migration script — do not re-add
 * deleteMany here.
 */
async function main() {
  const prisma = new PrismaClient({
    datasourceUrl:
      process.env.jacxi_DATABASE_URL ||
      process.env.DATABASE_URL ||
      process.env.jacxi_POSTGRES_URL ||
      process.env.jacxi_PRISMA_DATABASE_URL,
  });

  try {
    // Diagnostic output so it's obvious which DB is being targeted.
    const totalUsers = await prisma.user.count();
    const totalShipments = await prisma.shipment.count();
    console.log(`Target DB — users: ${totalUsers}, shipments: ${totalShipments}`);

    const adminEmail = 'admin@jacxi.com';
    const hashed = await bcrypt.hash('admin123', 12);

    const admin = await prisma.user.upsert({
      where: { email: adminEmail },
      update: {
        name: 'JACXI Admin',
        role: 'admin',
        passwordHash: hashed,
      },
      create: {
        name: 'JACXI Admin',
        email: adminEmail,
        passwordHash: hashed,
        role: 'admin',
        phone: '+1 (555) 123-4567',
        address: '123 Shipping Street',
        city: 'Los Angeles',
        country: 'USA',
      },
    });

    console.log('Admin seeded:', admin.email, admin.role);
    console.log('Total users in DB:', await prisma.user.count());
    console.log('OK — no user or shipment data was deleted.');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('Admin-only seed failed:', error);
  process.exit(1);
});
