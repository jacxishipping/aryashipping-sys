import client, { apiClient } from './client';
import { AuthResponse, LoginCodeCredentials, LoginCredentials, User } from '../types/auth';

const MOBILE_AUTH_PATH = '/api/mobile-auth';

export const authApi = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await client.post<AuthResponse>(`${MOBILE_AUTH_PATH}/signin`, credentials);
    
    if (response.data.token) {
      await apiClient.setToken(response.data.token);
    }
    
    return response.data;
  },

  async loginWithCode(credentials: LoginCodeCredentials): Promise<AuthResponse> {
    const response = await client.post<AuthResponse>(`${MOBILE_AUTH_PATH}/signin-code`, credentials);
    
    if (response.data.token) {
      await apiClient.setToken(response.data.token);
    }
    
    return response.data;
  },

  async logout(): Promise<void> {
    try {
      await client.post(`${MOBILE_AUTH_PATH}/signout`);
    } finally {
      await apiClient.removeToken();
    }
  },

  async getCurrentUser(): Promise<User> {
    const response = await client.get<User>(`${MOBILE_AUTH_PATH}/me`);
    return response.data;
  },

  async refreshToken(): Promise<{ token: string }> {
    const response = await client.post<{ token: string }>('/api/auth/refresh');
    
    if (response.data.token) {
      await apiClient.setToken(response.data.token);
    }
    
    return response.data;
  },

  async forgotPassword(email: string): Promise<{ message: string }> {
    const response = await client.post<{ message: string }>('/api/auth/forgot-password', { email });
    return response.data;
  },

  async resetPassword(token: string, password: string): Promise<{ message: string }> {
    const response = await client.post<{ message: string }>('/api/auth/reset-password', {
      token,
      password,
    });
    return response.data;
  },
};
