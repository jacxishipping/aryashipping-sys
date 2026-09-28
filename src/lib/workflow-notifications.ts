import { NotificationType, PrismaClient } from '@prisma/client';
import { createNotifications } from '@/lib/notifications';
import { hasPermission } from '@/lib/rbac';

type WorkflowNotificationEvent = {
  shipmentId: string;
  shipmentUserId: string;
  title: string;
  customerDescription: string;
  internalDescription?: string;
  link: string;
};

type WorkflowNotificationDeps = {
  prisma: PrismaClient;
  createNotificationsFn?: typeof createNotifications;
};

function canReceiveWorkflowNotifications(role: string) {
  return (
    hasPermission(role, 'customers:view') ||
    hasPermission(role, 'shipments:read_all') ||
    hasPermission(role, 'shipments:manage') ||
    hasPermission(role, 'dispatches:manage') ||
    hasPermission(role, 'containers:manage') ||
    hasPermission(role, 'transits:manage')
  );
}

export async function sendShipmentWorkflowNotifications(
  actorId: string,
  events: WorkflowNotificationEvent[],
  deps: WorkflowNotificationDeps,
) {
  if (events.length === 0) {
    return { count: 0 };
  }

  const createNotificationsFn = deps.createNotificationsFn || createNotifications;
  const internalUsers = await deps.prisma.user.findMany({
    where: {
      role: {
        not: 'user',
      },
      id: {
        not: actorId,
      },
    },
    select: {
      id: true,
      role: true,
    },
  });

  const internalRecipientIds = internalUsers
    .filter((user) => canReceiveWorkflowNotifications(user.role))
    .map((user) => user.id);

  const candidateRecipientIds = Array.from(
    new Set([
      ...events.map((event) => event.shipmentUserId).filter((userId) => userId !== actorId),
      ...internalRecipientIds,
    ])
  );

  const settings = candidateRecipientIds.length
    ? await deps.prisma.userSettings.findMany({
        where: {
          userId: {
            in: candidateRecipientIds,
          },
        },
        select: {
          userId: true,
          notifyShipmentPush: true,
        },
      })
    : [];

  const pushPreferenceByUserId = new Map(settings.map((setting) => [setting.userId, setting.notifyShipmentPush]));
  const notificationInputs = new Map<string, Parameters<typeof createNotifications>[0][number]>();

  for (const event of events) {
    const addNotification = (userId: string, description: string) => {
      const pushEnabled = pushPreferenceByUserId.get(userId);
      if (pushEnabled === false) {
        return;
      }

      const key = `${userId}::${event.title}::${description}::${event.link}`;
      notificationInputs.set(key, {
        userId,
        senderId: actorId,
        title: event.title,
        description,
        type: NotificationType.INFO,
        link: event.link,
      });
    };

    if (event.shipmentUserId !== actorId) {
      addNotification(event.shipmentUserId, event.customerDescription);
    }

    for (const recipientId of internalRecipientIds) {
      addNotification(recipientId, event.internalDescription || event.customerDescription);
    }
  }

  if (notificationInputs.size === 0) {
    return { count: 0 };
  }

  return createNotificationsFn(Array.from(notificationInputs.values()));
}