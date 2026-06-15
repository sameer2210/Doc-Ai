import type { AuthSession } from '../../types/auth-types';

export interface RequestOtpPayload {
  email: string;
}

export interface RequestOtpResponse {
  success: boolean;
}

export interface VerifyOtpPayload {
  email: string;
  otp: string;
}

export type VerifyOtpResponse = AuthSession;
