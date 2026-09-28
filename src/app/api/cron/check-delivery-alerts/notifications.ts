import { NotificationType } from '@prisma/client';
import type { NotificationInput } from '@/lib/notifications';

export enum ArrivalAlertStatus {
  ON_TIME = 'ON_TIME',
  WARNING = 'WARNING',
  OVERDUE = 'OVERDUE',
  ARRIVED = 'ARRIVED',
}

export type DeliveryAlertCandidate = {
  containerId: string;
  containerNumber: string;
  estimatedArrival: Date;
  alertStatus: ArrivalAlertStatus;
  userIds: string[];
};

export function buildDeliveryAlertNotifications(
  candidates: DeliveryAlertCandidate[],
): NotificationInput[] {
  const seen = new Set<string>();
  const notifications: NotificationInput[] = [];

  for (const candidate of candidates) {
    if (
      candidate.alertStatus === ArrivalAlertStatus.ON_TIME ||
      candidate.alertStatus === ArrivalAlertStatus.ARRIVED
    ) {
      continue;
    }

    const uniqueUserIds = Array.from(new Set(candidate.userIds.filter(Boolean)));

    for (const userId of uniqueUserIds) {
      const dedupeKey = `${candidate.containerId}:${userId}`;
      if (seen.has(dedupeKey)) {
        continue;
      }
      seen.add(dedupeKey);

      const isOverdue = candidate.alertStatus === ArrivalAlertStatus.OVERDUE;
      notifications.push({
        userId,
        title: `ETA alert for container ${candidate.containerNumber}`,
        description: `Container ${candidate.containerNumber} is ${isOverdue ? 'past' : 'approaching'} its ETA (${new Date(candidate.estimatedArrival).toLocaleDateString()}).`,
        type: NotificationType.WARNING,
        link: `/dashboard/containers/${candidate.containerId}`,
      });
    }
  }

  return notifications;
}
