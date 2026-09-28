type NotificationStreamEvent = {
  type: 'refresh';
  timestamp: string;
};

type NotificationListener = (event: NotificationStreamEvent) => void;

const notificationListeners = new Map<string, Set<NotificationListener>>();

export function subscribeToNotificationStream(
  userId: string,
  listener: NotificationListener,
) {
  const listeners = notificationListeners.get(userId) ?? new Set<NotificationListener>();
  listeners.add(listener);
  notificationListeners.set(userId, listeners);

  return () => {
    const currentListeners = notificationListeners.get(userId);
    if (!currentListeners) {
      return;
    }

    currentListeners.delete(listener);
    if (currentListeners.size === 0) {
      notificationListeners.delete(userId);
    }
  };
}

export function publishNotificationRefresh(userId: string) {
  const listeners = notificationListeners.get(userId);
  if (!listeners || listeners.size === 0) {
    return;
  }

  const event: NotificationStreamEvent = {
    type: 'refresh',
    timestamp: new Date().toISOString(),
  };

  for (const listener of listeners) {
    listener(event);
  }
}