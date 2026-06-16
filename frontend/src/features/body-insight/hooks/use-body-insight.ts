import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getBodyInsight, upsertBodyInsight } from '../api/body-insight-api';
import type { UpsertBodyInsightPayload } from '../types';
import { useSessionStore } from '@/features/auth/store/session-store';

/**
 * Hook to fetch body insight data.
 * Enabled only when the user is authenticated (access token present) and the session is hydrated.
 * Prevents unnecessary network calls on app start, after logout, or when unauthenticated.
 */
export function useBodyInsight() {
  const { accessToken, hydrated } = useSessionStore((state) => ({
    accessToken: state.accessToken,
    hydrated: state.hydrated,
  }));

  return useQuery({
    queryKey: ['body-insight'],
    queryFn: getBodyInsight,
    enabled: !!accessToken && hydrated,
    // Avoid refetch on reconnect or window focus to respect the enabled guard.
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook to upsert (save) body insight data.
 * On success, it invalidates the body‑insight query to refresh dependent UI components.
 */
export function useSaveBodyInsight() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpsertBodyInsightPayload) => upsertBodyInsight(payload),
    onSuccess: () => {
      // Invalidate queries to reload home & profile components dynamically
      queryClient.invalidateQueries({
        queryKey: ['body-insight'],
      });
    },
  });
}
