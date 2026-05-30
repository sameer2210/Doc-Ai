import { abortActiveChatStreams } from '@/features/chat/api/chat-api';
import { queryClient } from '@/shared/api/query-client';
import { useAuthStore } from '@/store/auth-store';
import { usePredictionStore } from '@/store/prediction-store';

export function clearUserScopedClientState(): void {
  abortActiveChatStreams();
  queryClient.clear();
  useAuthStore.getState().setToken(null);
  usePredictionStore.getState().clearAll();
}
