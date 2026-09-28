import { useAuthStore } from '../store/auth';

export const useAuth = () => {
  const {
    user,
    isAuthenticated,
    isLoading,
    error,
    login,
    loginWithCode,
    logout,
    loadSession,
    clearError,
  } = useAuthStore();

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'MANAGER';
  const isCustomer = user?.role === 'USER' || user?.role === 'CUSTOMER';

  return {
    user,
    isAuthenticated,
    isLoading,
    error,
    isAdmin,
    isCustomer,
    login,
    loginWithCode,
    logout,
    loadSession,
    clearError,
  };
};
