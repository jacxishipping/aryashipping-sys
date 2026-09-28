import client from './client';
import { PaginationParams } from '../types/api';
import { Notification, NotificationListResponse } from '../types/api';

export const notificationsApi = {
  async getNotifications(pagination?: PaginationParams): Promise<NotificationListResponse> {
    const response = await client.get<NotificationListResponse>('/api/notifications', {
      params: {
        page: pagination?.page,
        pageSize: pagination?.pageSize,
      },
    });
    return response.data;
  },

  async markAsRead(id: string): Promise<void> {
    await client.patch(`/api/notifications/${id}/read`);
  },

  async markAllAsRead(): Promise<void> {
    await client.post('/api/notifications/read-all');
  },

  async deleteNotification(id: string): Promise<void> {
    await client.delete(`/api/notifications/${id}`);
  },
};
