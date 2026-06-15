import { useMutation } from '@tanstack/react-query';
import { useSessionStore } from '@/features/auth/store/session-store';
import { persistSession } from '@/shared/auth/token-storage';
import { clearUserScopedClientState } from '@/shared/auth/client-session-boundary';
import { verifyOtp } from '../api/email-otp-api';
import type { VerifyOtpPayload, VerifyOtpResponse } from '../types';

export function useVerifyOtp() {
  const setSession = useSessionStore((state) => state.setSession);
  const currentUserId = useSessionStore((state) => state.user?.id);

  return useMutation<VerifyOtpResponse, Error, VerifyOtpPayload>({
    mutationFn: verifyOtp,
    onSuccess: async (data) => {
      if (currentUserId && data.user.id && currentUserId !== data.user.id) {
        clearUserScopedClientState();
      }

      setSession({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        user: data.user,
      });

      await persistSession({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        user: data.user,
      });
    },
  });
}
