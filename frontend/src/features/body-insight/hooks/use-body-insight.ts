import { useSessionStore } from '@/features/auth/store/session-store';
import { persistSession } from '@/shared/auth/token-storage';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getBodyInsight, upsertBodyInsight } from '../api/body-insight-api';
import type { UpsertBodyInsightPayload } from '../types';

export function useBodyInsight() {
  const accessToken = useSessionStore(state => state.accessToken);

  const hydrated = useSessionStore(state => state.hydrated);

  return useQuery({
    queryKey: ['body-insight'],
    queryFn: getBodyInsight,
    enabled: !!accessToken && hydrated,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
  });
}

export function useSaveBodyInsight() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpsertBodyInsightPayload) => upsertBodyInsight(payload),
    onSuccess: async () => {
      // Only update after confirmed server success — no optimistic updates.
      const store = useSessionStore.getState();

      if (store.user) {
        // Patch Zustand in-memory state immediately.
        store.updateUser({ bodyInsightCompleted: true });

        // Read the now-updated state to persist the full session.
        const updated = useSessionStore.getState();
        await persistSession({
          accessToken: updated.accessToken ?? '',
          refreshToken: updated.refreshToken ?? '',
          user: updated.user,
        });
      }

      queryClient.invalidateQueries({
        queryKey: ['body-insight'],
      });
    },
  });
}
