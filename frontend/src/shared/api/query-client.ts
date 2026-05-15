import { QueryClient } from '@tanstack/react-query';

function shouldRetry(failureCount: number, error: unknown): boolean {
  if (failureCount >= 2) {
    return false;
  }

  if (typeof error === 'object' && error && 'retryable' in error) {
    return Boolean((error as { retryable?: boolean }).retryable);
  }

  return true;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: shouldRetry,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      staleTime: 15_000,
      gcTime: 5 * 60_000,
    },
    mutations: {
      retry: 0,
    },
  },
});
