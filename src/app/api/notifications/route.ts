import { NextRequest, NextResponse } from 'next/server';
import { NotificationType } from '@prisma/client';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { createNotification, createNotifications } from '@/lib/notifications';
import { publishNotificationRefresh } from '@/lib/notification-stream';
import { hasPermission } from '@/lib/rbac';

const systemNotificationTitles = new Set([
  'Shipment status updated',
  'Shipment workflow updated',
  'Invoice status updated',
  'Invoice created',
  'Container status updated',
  'Shipment assigned to container',
]);

function getNotificationOrigin(title: string): 'system' | 'direct' {
  return systemNotificationTitles.has(title) ? 'system' : 'direct';
}

const sendNotificationSchema = z.object({
  recipientUserId: z.string().min(1).optional(),
  title: z.string().trim().min(1).max(120).optional(),
  message: z.string().trim().min(1).max(1000),
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const actorId = session.user?.id;
    if (!actorId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = sendNotificationSchema.parse(await req.json());
    const senderName = session.user.name || session.user.email || 'Jacxi user';
    const canManageCustomers = hasPermission(session.user.role, 'customers:view');

    if (canManageCustomers) {
      if (!payload.recipientUserId) {
        return NextResponse.json(
          { error: 'recipientUserId is required when messaging a customer' },
          { status: 400 },
        );
      }

      const recipient = await prisma.user.findUnique({
        where: { id: payload.recipientUserId },
        select: {
          id: true,
          role: true,
          name: true,
        },
      });

      if (!recipient || recipient.role !== 'user') {
        return NextResponse.json(
          { error: 'Recipient must be an existing customer account' },
          { status: 400 },
        );
      }

      const notification = await createNotification({
        userId: recipient.id,
        senderId: actorId,
        title: payload.title ?? `Message from ${senderName}`,
        description: payload.message,
        type: NotificationType.INFO,
        link: '/dashboard/profile',
      });

      return NextResponse.json({
        success: true,
        count: 1,
        notificationId: notification.id,
      });
    }

    const sender = await prisma.user.findUnique({
      where: { id: actorId },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    const internalRecipients = await prisma.user.findMany({
      where: {
        NOT: {
          role: 'user',
        },
      },
      select: {
        id: true,
        role: true,
      },
    });

    const customerFacingRecipients = internalRecipients.filter((recipient) =>
      hasPermission(recipient.role, 'customers:view'),
    );

    if (customerFacingRecipients.length === 0) {
      return NextResponse.json(
        { error: 'No customer support recipients are configured' },
        { status: 400 },
      );
    }

    const senderLabel = sender?.name || sender?.email || senderName;
    const title = payload.title ?? `Customer message from ${senderLabel}`;
    const link = `/dashboard/users/${actorId}`;

    const result = await createNotifications(
      customerFacingRecipients.map((recipient) => ({
        userId: recipient.id,
        senderId: actorId,
        title,
        description: payload.message,
        type: NotificationType.INFO,
        link,
      })),
    );

    return NextResponse.json({
      success: true,
      count: result.count,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 },
      );
    }

    console.error('Error sending notification:', error);
    return NextResponse.json(
      { error: 'Failed to send notification' },
      { status: 500 },
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const actorId = session.user?.id;
    if (!actorId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const pageSize = Math.min(Math.max(1, parseInt(searchParams.get('pageSize') || '20', 10)), 100);
    const skip = (page - 1) * pageSize;

    const where = {
      userId: actorId,
    };

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: pageSize,
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { ...where, read: false } }),
    ]);

    return NextResponse.json({
      data: notifications.map((notification) => ({
        ...notification,
        origin: getNotificationOrigin(notification.title),
      })),
      total,
      unreadCount,
      page,
      pageSize,
      hasMore: skip + pageSize < total,
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const actorId = session.user?.id;
    if (!actorId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { id, markAll } = body;

    if (markAll) {
      await prisma.notification.updateMany({
        where: {
          userId: actorId,
          read: false,
        },
        data: {
          read: true,
        },
      });
      publishNotificationRefresh(actorId);
      return NextResponse.json({ success: true });
    }

    if (id) {
      await prisma.notification.update({
        where: {
          id,
          userId: actorId,
        },
        data: {
          read: true,
        },
      });
      publishNotificationRefresh(actorId);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { error: 'Missing notification ID or markAll flag' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error updating notification:', error);
    return NextResponse.json(
      { error: 'Failed to update notification' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
    try {
      const session = await auth();
      if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const actorId = session.user?.id;
      if (!actorId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
  
      const { searchParams } = new URL(req.url);
      const id = searchParams.get('id');
  
      if (!id) {
        return NextResponse.json({ error: 'Missing ID' }, { status: 400 });
      }
  
      await prisma.notification.delete({
        where: {
          id,
          userId: actorId,
        },
      });

      publishNotificationRefresh(actorId);
  
      return NextResponse.json({ success: true });
    } catch (error) {
      return NextResponse.json(
        { error: 'Failed to delete notification' },
        { status: 500 }
      );
    }
  }

