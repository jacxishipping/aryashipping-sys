import { create } from 'zustand';
import { User, AuthSession } from '../types/auth';
import { authApi } from '../api/auth';
import * as secureStorage from '../utils/secureStorage';

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  loginWithCode: (loginCode: string) => Promise<void>;
  logout: () => Promise<void>;
  loadSession: () => Promise<void>;
  setUser: (user: User) => void;
  clearError: () => void;
}

const SESSION_KEY = 'auth_session';

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  login: async (email: string, password: string) => {
    try {
      set({ error: null });
      const response = await authApi.login({ email, password });
      
      const session: AuthSession = {
        user: response.user,
        token: response.token,
        expiresAt: response.expiresAt,
      };
      
      await secureStorage.setItem(SESSION_KEY, JSON.stringify(session));
      
      set({
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch (error: any) {
      set({
        error: error.message || 'Login failed',
        isLoading: false,
      });
      throw error;
    }
  },

  loginWithCode: async (loginCode: string) => {
    try {
      set({ error: null });
      const response = await authApi.loginWithCode({ loginCode });
      
      const session: AuthSession = {
        user: response.user,
        token: response.token,
        expiresAt: response.expiresAt,
      };
      
      await secureStorage.setItem(SESSION_KEY, JSON.stringify(session));
      
      set({
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch (error: any) {
      set({
        error: error.message || 'Login failed',
        isLoading: false,
      });
      throw error;
    }
  },

  logout: async () => {
    try {
      await authApi.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      await secureStorage.deleteItem(SESSION_KEY);
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    }
  },

  loadSession: async () => {
    try {
      set({ isLoading: true });
      const sessionData = await secureStorage.getItem(SESSION_KEY);
      
      if (sessionData) {
        const session: AuthSession = JSON.parse(sessionData);
        
        try {
          const user = await authApi.getCurrentUser();
          set({
            user,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          await secureStorage.deleteItem(SESSION_KEY);
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      } else {
        set({ isLoading: false });
      }
    } catch (error) {
      console.error('Load session error:', error);
      set({ isLoading: false });
    }
  },

  setUser: (user: User) => {
    set({ user });
  },

  clearError: () => {
    set({ error: null });
  },
}));
