import type { StreamErrorCode } from '@/features/chat/types/chat-types';

export type ChatErrorContent = {
  title: string;
  message: string;
};

const ERROR_CONTENT: Partial<Record<StreamErrorCode, ChatErrorContent>> = {
  DAILY_LIMIT_REACHED: {
    title: 'Daily Limit Reached',
    message:
      'You have used all 30 AI consultations available today.\nUpgrade your plan or try again tomorrow.',
  },
  PROVIDER_RATE_LIMIT: {
    title: 'AI Service Busy',
    message: 'The AI consultation service is temporarily busy.\nPlease try again in a few minutes.',
  },
  RATE_LIMIT: {
    title: 'AI Service Busy',
    message: 'The AI provider is temporarily overloaded.\nUpgrade your plan or try again',
  },
  PROVIDER_ERROR: {
    title: 'AI Service Unavailable',
    message: 'The AI service is currently unavailable.\nPlease try again later.',
  },
  // Authentication / session errors
  SESSION_EXPIRED: {
    title: 'Session Expired',
    message: 'Your session has expired. Please sign in again.',
  },
  UNAUTHORIZED: {
    title: 'Authentication Required',
    message: 'Please sign in to continue using chat.',
  },
};

const FALLBACK_ERROR_CONTENT: ChatErrorContent = {
  title: 'Response Failed',
  message: 'The response could not be completed. Please try again.',
};

export function getChatErrorContent(errorCode?: StreamErrorCode): ChatErrorContent {
  return (errorCode && ERROR_CONTENT[errorCode]) || FALLBACK_ERROR_CONTENT;
}
