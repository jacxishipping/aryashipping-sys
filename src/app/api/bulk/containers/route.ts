import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { NotificationType } from '@prisma/client';
import { createNotifications } from '@/lib/notifications';

const allowedStatuses = [
  'CREATED',
  'WAITING_FOR_LOADING',
  'LOADED',
  'IN_TRANSIT',
  'ARRIVED_PORT',
  'CUSTOMS_CLEARANCE',
  'RELEASED',
  'CLOSED',
];

// POST: Bulk operations on containers
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    if (session.user?.role !== 'admin') {
      return NextResponse.json(
        { message: 'Forbidden: Only admins can perform bulk operations' },
        { status: 403 }
      );
    }

    const { action, containerIds, data } = await request.json();

    if (!action || !containerIds || !Array.isArray(containerIds)) {
      return NextResponse.json(
        { message: 'Action and containerIds array are required' },
        { status: 400 }
      );
    }

    switch (action) {
      case 'updateStatus': {
        const status = data?.status;
        if (!status || !allowedStatuses.includes(status)) {
          return NextResponse.json(
            { message: 'Invalid status for updateStatus action' },
            { status: 400 }
          );
        }

        const result = await prisma.container.updateMany({
          where: { id: { in: containerIds } },
          data: { status },
        });

        try {
          const containers = await prisma.container.findMany({
            where: { id: { in: containerIds } },
            select: {
              id: true,
              containerNumber: true,
              shipments: {
                select: {
                  userId: true,
                },
              },
            },
          });

          const formattedStatus = status
            .replace(/_/g, ' ')
            .toLowerCase()
            .replace(/\b\w/g, (char: string) => char.toUpperCase());

          const notificationInputs = containers.flatMap((container) => {
            const uniqueUserIds = Array.from(
              new Set(container.shipments.map((shipment) => shipment.userId))
            );

            return uniqueUserIds.map((userId) => ({
              userId,
              senderId: session.user.id,
              title: 'Container status updated',
              description: `Container ${container.containerNumber} is now ${formattedStatus}.`,
              type: NotificationType.INFO,
              link: `/dashboard/containers/${container.id}`,
            }));
          });

          await createNotifications(notificationInputs);
        } catch (notificationError) {
          console.error('Failed to create bulk container notifications:', notificationError);
        }

        return NextResponse.json({
          message: 'Bulk status update completed successfully',
          count: result.count,
        });
      }

      case 'delete': {
        const containers = await prisma.container.findMany({
          where: { id: { in: containerIds } },
          select: {
            id: true,
            containerNumber: true,
            currentCount: true,
            _count: { select: { shipments: true } },
          },
        });

        const deletable = containers.filter(
          (container) => container.currentCount === 0 && container._count.shipments === 0
        );
        const skipped = containers
          .filter((container) => !deletable.includes(container))
          .map((container) => ({
            id: container.id,
            containerNumber: container.containerNumber,
            reason: 'Container has shipments assigned',
          }));

        if (deletable.length > 0) {
          await prisma.container.deleteMany({
            where: { id: { in: deletable.map((container) => container.id) } },
          });
        }

        return NextResponse.json({
          message: 'Bulk delete completed successfully',
          deletedCount: deletable.length,
          skipped,
        });
      }

      case 'export': {
        const containers = await prisma.container.findMany({
          where: { id: { in: containerIds } },
          include: {
            _count: {
              select: {
                shipments: true,
                expenses: true,
                invoices: true,
                documents: true,
              },
            },
          },
        });

        return NextResponse.json({
          message: 'Containers exported successfully',
          data: containers,
          count: containers.length,
        });
      }

      default:
        return NextResponse.json(
          { message: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error performing bulk operation:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
