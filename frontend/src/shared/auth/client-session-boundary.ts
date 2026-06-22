import { useSessionStore } from '@/features/auth/store/session-store';
import { useChatStore } from '@/features/chat/store/chat-store';
import { useUploadWorkflowStore } from '@/features/upload/store/upload-workflow-store';
import { abortActiveChatStreams } from '@/features/chat/api/chat-api';
import { clearNativeGoogleSession } from '@/services/auth/google-auth';
import { cancelAuthRefresh } from '@/shared/api/http-client';
import { queryClient } from '@/shared/api/query-client';
import { clearPersistedSession } from '@/shared/auth/token-storage';
import { useAuthStore } from '@/store/auth-store';
import { usePredictionStore } from '@/store/prediction-store';

export async function clearUserScopedClientState(): Promise<void> {
  // 1. Cancel in-flight auth refresh requests
  cancelAuthRefresh();

  // 2. Abort active chat consultation streams
  abortActiveChatStreams();

  // 3. Cancel and clear React Query cache to prevent race conditions
  try {
    await queryClient.cancelQueries();
  } catch (err) {
    if (__DEV__) {
      console.warn('[client-session-boundary] Failed to cancel queries:', err);
    }
  }
  queryClient.clear();

  // 4. Reset all client-side Zustand stores
  useAuthStore.getState().setToken(null);
  useSessionStore.getState().clearSession();
  usePredictionStore.getState().clearAll();
  useChatStore.getState().clearActiveChat();
  useUploadWorkflowStore.getState().clearWorkflow();

  // 5. Best-effort async revoking and clearing of persistent native credentials
  const results = await Promise.allSettled([
    clearPersistedSession(),
    clearNativeGoogleSession({ revokeAccess: true }),
  ]);

  if (__DEV__) {
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.warn(
          `[client-session-boundary] Async credential clearing task [${index}] failed:`,
          result.reason
        );
      }
    });
  }
}

