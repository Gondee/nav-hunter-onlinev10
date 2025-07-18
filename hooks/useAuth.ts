'use client';

import { useAuthContext } from '@/components/auth/AuthProvider';

/**
 * Custom hook to access authentication state and functions
 * Must be used within an AuthProvider
 */
export function useAuth() {
  const { isAuthenticated, isLoading, login, logout } = useAuthContext();

  return {
    isAuthenticated,
    isLoading,
    login,
    logout,
  };
}