export type SessionUser = {
  id: string;
  email?: string;
  name?: string;
  avatarUrl?: string;
  bodyInsightCompleted: boolean;
  givenName?: string;
  familyName?: string;
  locale?: string;
  emailVerified?: boolean;
  provider?: string;
  providerId?: string;
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
