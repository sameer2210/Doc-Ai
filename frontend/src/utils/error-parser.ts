import { AxiosError } from 'axios';

/**
 * Parsed error structure for healthcare-friendly feedback.
 */
export interface ParsedError {
  message: string;
  code?: string;
  status?: number;
}

/**
 * Parses diverse error types (AxiosError, Network Error, Timeout, Server Errors, etc.)
 * and transforms them into patient-friendly, professional medical app-friendly alerts.
 */
export function parseUploadError(error: any): ParsedError {
  // 1. Default fallback message
  const fallbackMessage = 'Unable to analyze the eye image right now. Please try again.';

  if (!error) {
    return { message: fallbackMessage };
  }

  // 2. Handle Axios Error
  if (error.isAxiosError || error instanceof AxiosError) {
    const axiosError = error as AxiosError<any>;
    const status = axiosError.response?.status;
    const responseData = axiosError.response?.data;

    // Check custom backend API response messages
    const apiMessage = responseData?.message ?? responseData?.error;

    // 503 Service Unavailable / 502 Bad Gateway (Backend or ML Model offline)
    if (status === 503 || status === 502) {
      return {
        message: 'The clinical analysis server is temporarily unavailable. Please retry in a few moments.',
        status,
        code: 'SERVER_UNAVAILABLE',
      };
    }

    // 504 Gateway Timeout
    if (status === 504 || axiosError.code === 'ECONNABORTED' || error.message?.toLowerCase().includes('timeout')) {
      return {
        message: 'The analysis request timed out. Please check your network connection and try again.',
        status,
        code: 'TIMEOUT',
      };
    }

    // 400 Bad Request (Invalid eye scan image, bad lighting, missing parameters)
    if (status === 400) {
      const isInvalidImage = apiMessage?.toLowerCase().includes('image') || apiMessage?.toLowerCase().includes('invalid');
      return {
        message: isInvalidImage
          ? 'Please upload a clear, high-resolution eye image for accurate cataract analysis.'
          : (apiMessage ?? 'The submitted data was invalid. Please review and try again.'),
        status,
        code: 'INVALID_REQUEST',
      };
    }

    // 413 Payload Too Large
    if (status === 413) {
      return {
        message: 'The selected eye image file size is too large. Please upload an image under 5MB.',
        status,
        code: 'FILE_TOO_LARGE',
      };
    }

    // 401 / 403 Authentication issues
    if (status === 401 || status === 403) {
      return {
        message: 'Your session has expired. Please log in again to continue with the analysis.',
        status,
        code: 'UNAUTHORIZED',
      };
    }

    // 500 Internal Server Error
    if (status === 500) {
      return {
        message: 'A server error occurred during clinical analysis. Our team has been notified.',
        status,
        code: 'INTERNAL_SERVER_ERROR',
      };
    }

    // Other API errors with messages
    if (apiMessage) {
      return {
        message: apiMessage,
        status,
        code: 'API_ERROR',
      };
    }
  }

  // 3. Handle Network Errors
  if (error.message?.toLowerCase().includes('network error') || error.code === 'ERR_NETWORK') {
    return {
      message: 'Network connection failure. Please check your internet connection and try again.',
      code: 'NETWORK_ERROR',
    };
  }

  // 4. Handle Standard Errors
  if (error instanceof Error) {
    if (error.message?.toLowerCase().includes('timeout')) {
      return {
        message: 'The analysis request timed out. Please try again.',
        code: 'TIMEOUT',
      };
    }
    return {
      message: error.message || fallbackMessage,
      code: 'STANDARD_ERROR',
    };
  }

  // 5. Unrecognized Error object/string
  const messageString = typeof error === 'string' ? error : fallbackMessage;
  return {
    message: messageString,
    code: 'UNKNOWN',
  };
}
