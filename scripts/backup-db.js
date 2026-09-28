async function backupDatabase() {
  const [{ PrismaClient }, fs, path] = await Promise.all([
    import('@prisma/client'),
    import('node:fs/promises'),
    import('node:path'),
  ]);

  const prisma = new PrismaClient({
    datasourceUrl:
      process.env.jacxi_DATABASE_URL ||
      process.env.DATABASE_URL ||
      process.env.jacxi_PRISMA_DATABASE_URL ||
      process.env.jacxi_POSTGRES_URL,
  });

  console.log('💾 Starting database backup...');

  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(process.cwd(), 'backups');

    await fs.mkdir(backupDir, { recursive: true });

    const backupFile = path.join(backupDir, `jacxi-backup-${timestamp}.json`);

    // Backup all data
    const backupData = {
      timestamp: new Date().toISOString(),
      version: '1.1.0',
      data: {
        // Core business data
        users: await prisma.user.findMany({
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            phone: true,
            address: true,
            city: true,
            country: true,
            createdAt: true,
            updatedAt: true,
          },
        }),
        shipments: await prisma.shipment.findMany(),
        containers: await prisma.container.findMany(),
        dispatches: await prisma.dispatch.findMany(),
        transits: await prisma.transit.findMany(),
        companies: await prisma.company.findMany(),
        quotes: await prisma.quote.findMany(),

        // Financial data
        userInvoices: await prisma.userInvoice.findMany(),
        invoiceLineItems: await prisma.invoiceLineItem.findMany(),
        shipmentCharges: await prisma.shipmentCharge.findMany(),
        ledgerEntries: await prisma.ledgerEntry.findMany(),
        companyLedgerEntries: await prisma.companyLedgerEntry.findMany(),

        // Supporting data
        testimonials: await prisma.testimonial.findMany(),
        blogPosts: await prisma.blogPost.findMany(),
        contacts: await prisma.contact.findMany(),
        newsletters: await prisma.newsletter.findMany(),
      },
    };

    // Write backup to file
    await fs.writeFile(backupFile, JSON.stringify(backupData, null, 2));
    console.log(`✅ Backup created: ${backupFile}`);

    // Get backup statistics
    const stats = Object.fromEntries(
      Object.entries(backupData.data).map(([key, value]) => [key, value.length]),
    );

    console.log('📊 Backup statistics:');
    Object.entries(stats).forEach(([key, value]) => {
      console.log(`  - ${key}: ${value}`);
    });

    // Sanity check — warn if shipment count looks wrong
    if (stats.shipments < 100) {
      console.warn(
        `⚠️  WARNING: only ${stats.shipments} shipments in this backup.` +
          ` If you previously had 200+, verify you are backing up the correct database.`,
      );
    }

    // Clean up old backups (keep last 14)
    const files = (await fs.readdir(backupDir))
      .filter(file => file.startsWith('jacxi-backup-') && file.endsWith('.json'))
      .sort()
      .reverse();

    if (files.length > 14) {
      const filesToDelete = files.slice(14);
      await Promise.all(
        filesToDelete.map(async (file) => {
          await fs.unlink(path.join(backupDir, file));
          console.log(`🗑️  Deleted old backup: ${file}`);
        }),
      );
    }

    console.log('🎉 Database backup completed successfully!');

  } catch (error) {
    console.error('❌ Backup failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

backupDatabase()
  .catch((error) => {
    console.error('❌ Backup error:', error);
    process.exit(1);
  });
