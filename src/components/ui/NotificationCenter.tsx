'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, X, Check, Package, Ship, FileText, AlertCircle, RefreshCw } from 'lucide-react';
import { IconButton, Badge, Box, Typography, Divider } from '@mui/material';
import { Drawer, EmptyState, toast } from '@/components/design-system';

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
        // Revert on error? rarely needed for read status
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
      return {
        color: 'var(--info-dark)',
        backgroundColor: 'rgba(var(--info-rgb), 0.10)',
        borderColor: 'rgba(var(--info-rgb), 0.18)',
      };
    }

    return {
      color: 'var(--accent-gold)',
      backgroundColor: 'rgba(var(--accent-gold-rgb), 0.12)',
      borderColor: 'rgba(var(--accent-gold-rgb), 0.2)',
    };
  };

  return (
    <>
      <IconButton
        onClick={() => setOpen(true)}
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
        sx={{
          color: 'var(--text-secondary)',
          p: 1,
          minWidth: { xs: 44, sm: 0 },
          minHeight: { xs: 44, sm: 0 },
          '&:hover': {
            bgcolor: 'rgba(var(--border-rgb), 0.4)',
            color: 'var(--text-primary)',
          },
        }}
      >
        <Badge badgeContent={unreadCount} color="error">
          <Bell className="w-5 h-5" />
        </Badge>
      </IconButton>

      <Drawer
        anchor="right"
        size="sm"
        open={open}
        onClose={() => setOpen(false)}
        title="Notifications"
        description={`${unreadCount} unread`}
        badge={
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <IconButton onClick={fetchNotifications} size="small" title="Refresh">
              <RefreshCw className="w-4 h-4" />
            </IconButton>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs text-[var(--accent-gold)] hover:underline"
              >
                Mark all read
              </button>
            )}
          </Box>
        }
        contentSx={{ p: 0, gap: 0 }}
      >
          {loading ? (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                py: 8,
              }}
            >
              <RefreshCw className="w-6 h-6 text-[var(--text-secondary)] animate-spin" />
            </Box>
          ) : notifications.length === 0 ? (
            <EmptyState
              icon={<Bell className="w-10 h-10" />}
              title="No notifications yet"
              description="You're all caught up."
            />
          ) : (
            notifications.map((notification, index) => (
              <div key={notification.id}>
                <Box
                  sx={{
                    p: 3,
                    cursor: 'pointer',
                    bgcolor: notification.read ? 'transparent' : 'rgba(var(--accent-gold-rgb), 0.05)',
                    '&:hover': {
                      bgcolor: 'var(--background)',
                    },
                    transition: 'background-color 0.2s',
                  }}
                  onClick={() => {
                    markAsRead(notification.id);
                    if (notification.link) {
                      setOpen(false);
                      router.push(notification.link);
                    }
                  }}
                >
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <Box
                      sx={{
                        flexShrink: 0,
                        mt: 0.5,
                      }}
                    >
                      {getNotificationIcon(notification.type)}
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Box sx={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between', gap: 2 }}>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1, mb: 0.5 }}>
                            <Typography
                              sx={{
                                fontSize: '0.875rem',
                                fontWeight: notification.read ? 500 : 700,
                                color: 'var(--text-primary)',
                              }}
                            >
                              {notification.title}
                            </Typography>
                            <Box
                              component="span"
                              sx={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                borderRadius: 999,
                                px: 1,
                                py: 0.25,
                                fontSize: '0.6875rem',
                                fontWeight: 700,
                                letterSpacing: '0.04em',
                                textTransform: 'uppercase',
                                border: '1px solid',
                                ...getOriginStyles(notification),
                              }}
                            >
                              {getOriginLabel(notification)}
                            </Box>
                          </Box>
                        </Box>
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification(notification.id);
                          }}
                          sx={{ mt: -1 }}
                        >
                          <X className="w-4 h-4 opacity-50 hover:opacity-100" />
                        </IconButton>
                      </Box>
                      <Typography
                        sx={{
                          fontSize: '0.8125rem',
                          color: 'var(--text-secondary)',
                          mt: 0.5,
                        }}
                      >
                        {notification.description}
                      </Typography>
                      {getSenderLabel(notification) && (
                        <Typography
                          sx={{
                            fontSize: '0.75rem',
                            color: 'var(--text-secondary)',
                            mt: 1,
                          }}
                        >
                          {notification.origin === 'system' ? 'Triggered by ' : 'From '}
                          {getSenderLabel(notification)}
                        </Typography>
                      )}
                      <Typography
                        sx={{
                          fontSize: '0.75rem',
                          color: 'var(--text-secondary)',
                          mt: 0.5,
                        }}
                      >
                        {formatTimestamp(notification.createdAt)}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
                {index < notifications.length - 1 && <Divider sx={{ borderColor: 'var(--border)' }} />}
              </div>
            ))
          )}
      </Drawer>
    </>
  );
}
