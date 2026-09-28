export type UserRole = 'ADMIN' | 'MANAGER' | 'USER' | 'CUSTOMER';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  loginCode?: string;
  phone?: string;
  avatar?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginCodeCredentials {
  loginCode: string;
}

export interface AuthResponse {
  user: User;
  token?: string;
  expiresAt?: string;
}

export interface AuthSession {
  user: User;
  token?: string;
  expiresAt?: string;
}

export interface RefreshTokenResponse {
  token: string;
  expiresAt: string;
}
