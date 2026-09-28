import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { publishNotificationRefresh } from '@/lib/notification-stream';

const notificationSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  type: z.enum(['INFO', 'SUCCESS', 'WARNING', 'ERROR']).default('INFO'),
  link: z.string().optional(),
  userIds: z.array(z.string()).optional(),
  broadcast: z.boolean().default(false),
});

const CHUNK_SIZE = 500;

// POST: Admin create notifications (targeted or broadcast)
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const payload = notificationSchema.parse(await request.json());

    if (!payload.broadcast && (!payload.userIds || payload.userIds.length === 0)) {
      return NextResponse.json(
        { error: 'userIds is required when broadcast is false' },
        { status: 400 }
      );
    }

    const targetUserIds = payload.broadcast
      ? (await prisma.user.findMany({ select: { id: true } })).map((user) => user.id)
      : payload.userIds ?? [];

    if (targetUserIds.length === 0) {
      return NextResponse.json(
        { error: 'No users found for notification' },
        { status: 400 }
      );
    }

    const data = targetUserIds.map((userId) => ({
      userId,
      senderId: session.user.id,
      title: payload.title,
      description: payload.description,
      type: payload.type,
      link: payload.link ?? null,
    }));

    let createdCount = 0;
    for (let i = 0; i < data.length; i += CHUNK_SIZE) {
      const chunk = data.slice(i, i + CHUNK_SIZE);
      const result = await prisma.notification.createMany({ data: chunk });
      createdCount += result.count;
    }

    for (const userId of new Set(targetUserIds)) {
      publishNotificationRefresh(userId);
    }

    return NextResponse.json({
      success: true,
      count: createdCount,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error creating notifications:', error);
    return NextResponse.json(
      { error: 'Failed to create notifications' },
      { status: 500 }
    );
  }
}
