import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getBodyInsight, upsertBodyInsight } from '../api/body-insight-api';
import type { UpsertBodyInsightPayload } from '../types';

export function useBodyInsight() {
  return useQuery({
    queryKey: ['body-insight'],
    queryFn: getBodyInsight,
  });
}

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
