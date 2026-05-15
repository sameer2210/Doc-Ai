import { create } from 'zustand';

import type { SessionUser } from '../types/auth-types';

type SessionState = {
  accessToken: string | null;
  refreshToken: string | null;
  user: SessionUser | null;
  hydrated: boolean;
  setSession: (payload: {
    accessToken: string;
    refreshToken: string;
    user: SessionUser | null;
  }) => void;
  updateAccessToken: (accessToken: string) => void;
  clearSession: () => void;
  setHydrated: (hydrated: boolean) => void;
};

export const useSessionStore = create<SessionState>(set => ({
  accessToken: null,
  refreshToken: null,
  user: null,
  hydrated: false,
  setSession: payload =>
    set({
      accessToken: payload.accessToken,
      refreshToken: payload.refreshToken,
      user: payload.user,
    }),
  updateAccessToken: accessToken => set({ accessToken }),
  clearSession: () =>
    set({
      accessToken: null,
      refreshToken: null,
      user: null,
    }),
  setHydrated: hydrated => set({ hydrated }),
}));
