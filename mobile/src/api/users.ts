import client from './client';
import { PaginationParams } from '../types/api';
import { AdminUserCreateInput, AdminUserDetail, AdminUserRecord, AdminUserSummary, AdminUserUpsertInput } from '../types/admin';

export interface UsersListResponse {
  users: AdminUserSummary[];
  total: number;
  page: number;
  pageSize: number;
  admins: number;
  regularUsers: number;
}

export const usersApi = {
  async getUsers(
    params?: { query?: string; roleType?: 'users' | 'customers' | 'all' },
    pagination?: PaginationParams,
  ): Promise<UsersListResponse> {
    const response = await client.get<UsersListResponse>('/api/users', {
      params: {
        roleType: 'users',
        ...params,
        ...pagination,
      },
    });

    return response.data;
  },

  async getUser(id: string): Promise<AdminUserDetail> {
    const response = await client.get<{ user: AdminUserDetail }>(`/api/users/${id}`);
    return response.data.user;
  },

  async createUser(input: AdminUserCreateInput): Promise<AdminUserRecord> {
    const response = await client.post<{ user: AdminUserRecord }>('/api/mobile-auth/register', input);
    return response.data.user;
  },

  async updateUser(id: string, input: AdminUserUpsertInput): Promise<AdminUserRecord> {
    const response = await client.patch<{ user: AdminUserRecord }>(`/api/users/${id}`, input);
    return response.data.user;
  },

  async setLoginCode(userId: string, customCode?: string): Promise<{ loginCode: string }> {
    const response = await client.post<{ loginCode: string }>('/api/users/login-code', {
      userId,
      customCode,
    });

    return { loginCode: response.data.loginCode };
  },

  async clearLoginCode(userId: string): Promise<void> {
    await client.delete('/api/users/login-code', {
      params: { userId },
    });
  },
};