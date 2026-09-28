import { NextRequest, NextResponse } from 'next/server';
import { ContainerLifecycleStatus } from '@prisma/client';
import { prisma } from '@/lib/db';
import { validateCronRequest } from '@/lib/cron-auth';
import { logger } from '@/lib/logger';
import { createNotifications } from '@/lib/notifications';
import { ArrivalAlertStatus, buildDeliveryAlertNotifications, type DeliveryAlertCandidate } from './notifications';

// This endpoint can be called by a cron job to check container arrival alerts
export async function GET(request: NextRequest) {
  return runDeliveryAlerts(request);
}

export async function POST(request: NextRequest) {
  return runDeliveryAlerts(request);
}

async function runDeliveryAlerts(request: NextRequest) {
  try {
    // Verify cron secret for security
    if (!validateCronRequest(request)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    // Get all containers that are in transit and have an ETA
    const containersToCheck = await prisma.container.findMany({
      where: {
        status: {
          in: [ContainerLifecycleStatus.IN_TRANSIT, ContainerLifecycleStatus.LOADED],
        },
        estimatedArrival: {
          not: null,
        },
      },
      select: {
        id: true,
        containerNumber: true,
        estimatedArrival: true,
        status: true,
        shipments: {
          select: {
            userId: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    const results = {
      total: containersToCheck.length,
      warnings: 0,
      overdue: 0,
      onTime: 0,
      details: [] as Array<{
        containerId: string;
        containerNumber: string;
        status: string;
        estimatedArrival: Date;
        alertStatus: string;
      }>,
    };

    const alertCandidates: DeliveryAlertCandidate[] = [];

    // Check each container
    for (const container of containersToCheck) {
      try {
        const eta = new Date(container.estimatedArrival!);
        let alertStatus: ArrivalAlertStatus;

        // Determine alert status
        if (now > eta) {
          alertStatus = ArrivalAlertStatus.OVERDUE;
          results.overdue++;
        } else if (eta <= threeDaysFromNow) {
          alertStatus = ArrivalAlertStatus.WARNING;
          results.warnings++;
        } else {
          alertStatus = ArrivalAlertStatus.ON_TIME;
          results.onTime++;
        }

        results.details.push({
          containerId: container.id,
          containerNumber: container.containerNumber,
          status: container.status,
          estimatedArrival: eta,
          alertStatus: alertStatus,
        });

        const userIds = Array.from(
          new Set(
            container.shipments
              .map((shipment) => shipment.userId ?? shipment.user?.id)
              .filter((userId): userId is string => Boolean(userId)),
          ),
        );

        alertCandidates.push({
          containerId: container.id,
          containerNumber: container.containerNumber,
          estimatedArrival: eta,
          alertStatus,
          userIds,
        });
      } catch (error) {
        logger.error(`Error checking container ${container.id}:`, error);
      }
    }

    const notificationInputs = buildDeliveryAlertNotifications(alertCandidates);
    if (notificationInputs.length > 0) {
      const userIdsToNotify = new Set(notificationInputs.map((input) => input.userId));
      const userSettings = await prisma.userSettings.findMany({
        where: {
          userId: {
            in: Array.from(userIdsToNotify),
          },
        },
        select: {
          userId: true,
          notifyShipmentPush: true,
        },
      });

      const disabledUserIds = new Set(
        userSettings
          .filter((setting) => setting.notifyShipmentPush === false)
          .map((setting) => setting.userId),
      );

      const filteredNotifications = notificationInputs.filter(
        (notification) => !disabledUserIds.has(notification.userId),
      );

      if (filteredNotifications.length > 0) {
        await createNotifications(filteredNotifications);
      }
    }

    return NextResponse.json({
      message: 'Container arrival alerts check completed',
      results,
    }, { status: 200 });
  } catch (error) {
    logger.error('Error checking delivery alerts:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
