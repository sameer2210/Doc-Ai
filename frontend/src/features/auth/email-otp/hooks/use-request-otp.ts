import { useMutation } from '@tanstack/react-query';
import { requestOtp } from '../api/email-otp-api';
import type { RequestOtpPayload, RequestOtpResponse } from '../types';

export function useRequestOtp() {
  return useMutation<RequestOtpResponse, Error, RequestOtpPayload>({
    mutationFn: requestOtp,
  });
}
