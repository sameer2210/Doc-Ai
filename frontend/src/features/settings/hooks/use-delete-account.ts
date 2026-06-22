import { useState } from 'react';
import { router } from 'expo-router';

import { deleteAccountAPI } from '@/features/auth/api/auth-api';
import { clearUserScopedClientState } from '@/shared/auth/client-session-boundary';
import { getUserFacingError } from '@/shared/errors/user-facing-error';

export function useDeleteAccount() {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deleteAccount = async (): Promise<boolean> => {
    if (isDeleting) return false;

    setIsDeleting(true);
    setError(null);

    try {
      // 1. Perform backend deletion API call
      await deleteAccountAPI();

      // 2. Perform frontend local session and state invalidations
      await clearUserScopedClientState();

      // 3. Redirect the user to the login screen
      router.replace('/login');
      return true;
    } catch (err: unknown) {
      const parsed = getUserFacingError(err);
      setError(parsed.message);
      return false;
    } finally {
      setIsDeleting(false);
    }
  };

  const clearError = () => {
    setError(null);
  };

  return {
    deleteAccount,
    isDeleting,
    error,
    clearError,
  };
}
