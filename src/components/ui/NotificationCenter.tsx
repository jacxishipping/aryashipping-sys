'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, X, Check, AlertCircle, RefreshCw } from 'lucide-react';
import { Drawer, EmptyState, IconButton, toast } from '@/components/design-system';

interface Notification {
  id: string;
  title: string;
  description: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';
  origin: 'system' | 'direct';
  createdAt: string;
  read: boolean;
  link?: string;
  sender?: {
    id: string;
    name: string | null;
    email: string;
    role: string;
  } | null;
}

interface NotificationsResponse {
  data: Notification[];
  unreadCount: number;
}

export function NotificationCenter() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/notifications');
      if (response.ok) {
        const data = await response.json() as NotificationsResponse;
        if (Array.isArray(data.data)) {
          setNotifications(data.data);
          setUnreadCount(typeof data.unreadCount === 'number'
            ? data.unreadCount
            : data.data.filter((notification) => !notification.read).length);
        } else {
          console.error('Invalid notification data:', data);
        }
      }
    } catch (error) {
      console.error('Failed to fetch notifications', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();

    const stream = new EventSource('/api/notifications/stream');
    const refreshFromStream = () => {
      fetchNotifications();
    };

    stream.addEventListener('notification', refreshFromStream);
    stream.addEventListener('connected', refreshFromStream);
    stream.onerror = () => {
      fetchNotifications();
    };

    // Keep a slower polling fallback for environments where SSE is interrupted.
    const interval = setInterval(fetchNotifications, 60000);

    return () => {
      clearInterval(interval);
      stream.removeEventListener('notification', refreshFromStream);
      stream.removeEventListener('connected', refreshFromStream);
      stream.close();
    };
  }, [fetchNotifications]);

  const markAsRead = async (id: string) => {
    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));

    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
    } catch (error) {
        // Revert on error rarely needed for read status
    }
  };

  const markAllAsRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);

    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAll: true }),
      });
      toast.success('All notifications marked as read');
    } catch (error) {
      toast.error('Failed to mark all as read');
    }
  };

  const deleteNotification = async (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    if (notifications.find(n => n.id === id && !n.read)) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
    }

    try {
        await fetch(`/api/notifications?id=${id}`, {
            method: 'DELETE',
        });
    } catch (error) {
        toast.error('Failed to delete notification');
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'SUCCESS':
        return <Check className="w-4 h-4 text-green-500" />;
      case 'WARNING':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      case 'ERROR':
        return <AlertCircle className="w-4 h-4 text-[var(--error)]" />;
      default:
        return <Bell className="w-4 h-4 text-[var(--accent-gold)]" />;
    }
  };

  const formatTimestamp = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const getSenderLabel = (notification: Notification) => {
    if (!notification.sender) {
      return null;
    }

    return notification.sender.name || notification.sender.email;
  };

  const getOriginLabel = (notification: Notification) =>
    notification.origin === 'system' ? 'System update' : 'Direct message';

  const getOriginStyles = (notification: Notification) => {
    if (notification.origin === 'system') {
      return 'text-[var(--info-dark)] bg-[rgba(var(--info-rgb),0.10)] border-[rgba(var(--info-rgb),0.18)]';
    }

    return 'text-[var(--accent-gold)] bg-[rgba(var(--accent-gold-rgb),0.12)] border-[rgba(var(--accent-gold-rgb),0.2)]';
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
        className="relative p-2 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[rgba(var(--border-rgb),0.4)] transition-colors min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--error)] px-1 text-[0.65rem] font-bold text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      <Drawer
        anchor="right"
        size="sm"
        open={open}
        onClose={() => setOpen(false)}
        title="Notifications"
        description={`${unreadCount} unread`}
        badge={
          <div className="flex gap-2 items-center">
            <IconButton
              icon={<RefreshCw className="w-4 h-4" />}
              ariaLabel="Refresh"
              size="sm"
              variant="ghost"
              onClick={fetchNotifications}
            />
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs text-[var(--accent-gold)] hover:underline font-medium"
              >
                Mark all read
              </button>
            )}
          </div>
        }
        contentSx={{ p: 0, gap: 0 }}
      >
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-6 h-6 text-[var(--text-secondary)] animate-spin" />
          </div>
        ) : notifications.length === 0 ? (
          <EmptyState
            icon={<Bell className="w-10 h-10" />}
            title="No notifications yet"
            description="You're all caught up."
          />
        ) : (
          notifications.map((notification, index) => (
            <div key={notification.id}>
              <div
                className={`p-4 cursor-pointer transition-colors hover:bg-[var(--background)] ${
                  notification.read ? 'bg-transparent' : 'bg-[rgba(var(--accent-gold-rgb),0.05)]'
                }`}
                onClick={() => {
                  markAsRead(notification.id);
                  if (notification.link) {
                    setOpen(false);
                    router.push(notification.link);
                  }
                }}
              >
                <div className="flex gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5 mb-1">
                          <span
                            className={`text-sm ${
                              notification.read ? 'font-normal text-[var(--text-primary)]' : 'font-bold text-[var(--text-primary)]'
                            }`}
                          >
                            {notification.title}
                          </span>
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[0.65rem] font-bold tracking-wider uppercase border ${getOriginStyles(
                              notification
                            )}`}
                          >
                            {getOriginLabel(notification)}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotification(notification.id);
                        }}
                        className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded transition-colors"
                        aria-label="Delete notification"
                      >
                        <X className="w-4 h-4 opacity-50 hover:opacity-100" />
                      </button>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] mt-1">
                      {notification.description}
                    </p>
                    {getSenderLabel(notification) && (
                      <p className="text-[0.7rem] text-[var(--text-secondary)] mt-1">
                        {notification.origin === 'system' ? 'Triggered by ' : 'From '}
                        {getSenderLabel(notification)}
                      </p>
                    )}
                    <p className="text-[0.7rem] text-[var(--text-secondary)] mt-1">
                      {formatTimestamp(notification.createdAt)}
                    </p>
                  </div>
                </div>
              </div>
              {index < notifications.length - 1 && <div className="border-t border-[var(--border)]" />}
            </div>
          ))
        )}
      </Drawer>
    </>
  );
}
