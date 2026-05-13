export type SessionUser = {
  id: string;
  email?: string;
  name?: string;
  avatarUrl?: string;
};

export type AuthSession = {
  accessToken: string;
  refreshToken: string;
  user: SessionUser;
};

export type RefreshTokenResponse = {
  accessToken: string;
  refreshToken?: string;
};
