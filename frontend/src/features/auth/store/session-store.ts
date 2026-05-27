import { create } from 'zustand';

import type { SessionUser } from '../types/auth-types';

type SessionState = {
  accessToken: string | null;
  refreshToken: string | null;
  user: SessionUser | null;
  hydrated: boolean;
  version: number;
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
  version: 0,
  setSession: payload =>
    set(state => ({
      accessToken: payload.accessToken,
      refreshToken: payload.refreshToken,
      user: payload.user,
      version: state.version + 1,
    })),
  updateAccessToken: accessToken => set({ accessToken }),
  clearSession: () =>
    set(state => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      version: state.version + 1,
    })),
  setHydrated: hydrated => set({ hydrated }),
}));
