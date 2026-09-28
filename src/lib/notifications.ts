import { NotificationType } from '@prisma/client';
import { prisma } from '@/lib/db';
import { publishNotificationRefresh } from '@/lib/notification-stream';

export type NotificationInput = {
  userId: string;
  senderId?: string | null;
  title: string;
  description: string;
  type?: NotificationType;
  link?: string | null;
};

export async function createNotification(input: NotificationInput) {
  const notification = await prisma.notification.create({
    data: {
      userId: input.userId,
      senderId: input.senderId ?? null,
      title: input.title,
      description: input.description,
      type: input.type ?? 'INFO',
      link: input.link ?? null,
    },
  });

  publishNotificationRefresh(input.userId);

  return notification;
}

export async function createNotifications(inputs: NotificationInput[]) {
  if (inputs.length === 0) {
    return { count: 0 };
  }

  const result = await prisma.notification.createMany({
    data: inputs.map((input) => ({
      userId: input.userId,
      senderId: input.senderId ?? null,
      title: input.title,
      description: input.description,
      type: input.type ?? 'INFO',
      link: input.link ?? null,
    })),
  });

  const uniqueUserIds = new Set(inputs.map((input) => input.userId));
  for (const userId of uniqueUserIds) {
    publishNotificationRefresh(userId);
  }

  return result;
}
