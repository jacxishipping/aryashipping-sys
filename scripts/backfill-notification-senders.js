const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

function extractContainerId(link) {
  const match = typeof link === 'string'
    ? link.match(/^\/dashboard\/containers\/([^/?#]+)/)
    : null;
  return match ? match[1] : null;
}

function extractStatus(description) {
  const match = typeof description === 'string'
    ? description.match(/ is now (.+?)\.?$/)
    : null;
  return match ? match[1].trim() : null;
}

function formatStatus(value) {
  return value
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

async function backfillContainerStatusNotifications() {
  const notifications = await prisma.notification.findMany({
    where: {
      senderId: null,
      title: 'Container status updated',
    },
    select: {
      id: true,
      description: true,
      link: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: 'asc',
    },
  });

  let updated = 0;
  let skipped = 0;

  for (const notification of notifications) {
    const containerId = extractContainerId(notification.link);
    const statusLabel = extractStatus(notification.description);

    if (!containerId || !statusLabel) {
      skipped += 1;
      continue;
    }

    const candidates = await prisma.containerAuditLog.findMany({
      where: {
        containerId,
        action: 'STATUS_CHANGE',
        timestamp: {
          gte: new Date(notification.createdAt.getTime() - 1000 * 60 * 60 * 12),
          lte: new Date(notification.createdAt.getTime() + 1000 * 60 * 60 * 12),
        },
      },
      select: {
        performedBy: true,
        newValue: true,
        timestamp: true,
      },
      orderBy: {
        timestamp: 'asc',
      },
    });

    const matchingCandidates = candidates.filter((candidate) => {
      if (!candidate.newValue) {
        return false;
      }

      return formatStatus(candidate.newValue) === statusLabel;
    });

    if (matchingCandidates.length === 0) {
      skipped += 1;
      continue;
    }

    matchingCandidates.sort((left, right) => {
      const leftDiff = Math.abs(notification.createdAt.getTime() - left.timestamp.getTime());
      const rightDiff = Math.abs(notification.createdAt.getTime() - right.timestamp.getTime());
      return leftDiff - rightDiff;
    });

    const bestCandidate = matchingCandidates[0];
    const bestDiff = Math.abs(notification.createdAt.getTime() - bestCandidate.timestamp.getTime());
    const equallyGoodCandidate = matchingCandidates[1]
      ? Math.abs(notification.createdAt.getTime() - matchingCandidates[1].timestamp.getTime()) === bestDiff
      : false;

    if (equallyGoodCandidate) {
      skipped += 1;
      continue;
    }

    await prisma.notification.update({
      where: { id: notification.id },
      data: { senderId: bestCandidate.performedBy },
    });

    updated += 1;
  }

  return { updated, skipped, total: notifications.length };
}

async function main() {
  const containerSummary = await backfillContainerStatusNotifications();

  const unsupportedScopes = [
    {
      scope: 'invoice-notifications',
      updated: 0,
      skipped: await prisma.notification.count({
        where: {
          senderId: null,
          OR: [
            { title: 'Invoice created' },
            { title: 'Invoice status updated' },
          ],
        },
      }),
      reason: 'No reliable historical actor data exists for older invoice notifications.',
    },
    {
      scope: 'shipment-notifications',
      updated: 0,
      skipped: await prisma.notification.count({
        where: {
          senderId: null,
          OR: [
            { title: 'Shipment status updated' },
            { title: 'Shipment assigned to container' },
          ],
        },
      }),
      reason: 'No reliable historical actor data exists for older shipment notifications.',
    },
  ];

  console.log(JSON.stringify([
    {
      scope: 'container-status-notifications',
      ...containerSummary,
    },
    ...unsupportedScopes,
  ], null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });