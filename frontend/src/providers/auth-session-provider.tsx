import { PropsWithChildren, useEffect } from 'react';

import { useSessionStore } from '@/features/auth/store/session-store';
import { readSession } from '@/shared/auth/token-storage';

export function AuthSessionProvider({ children }: PropsWithChildren) {
  const setSession = useSessionStore(state => state.setSession);
  const setHydrated = useSessionStore(state => state.setHydrated);

  useEffect(() => {
    let isMounted = true;

    async function hydrateSession(): Promise<void> {
      try {
        const stored = await readSession();
        if (!isMounted || !stored) {
          return;
        }

        setSession({
          accessToken: stored.accessToken,
          refreshToken: stored.refreshToken,
          user: stored.user,
        });
      } finally {
        if (isMounted) {
          setHydrated(true);
        }
      }
    }

    void hydrateSession();

    return () => {
      isMounted = false;
    };
  }, [setSession, setHydrated]);

  return children;
}
