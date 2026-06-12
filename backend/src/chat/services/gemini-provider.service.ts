import { Injectable } from '@nestjs/common';
import { ConfigService } from '@config/config.service';
import { AxiosError } from 'axios';
import { isObjectRecord, safeSerialize } from '../utils/stream-parser.util';

export type StreamErrorCode =
  | 'DAILY_LIMIT_REACHED'
  | 'PROVIDER_RATE_LIMIT'
  | 'RATE_LIMIT'
  | 'DUPLICATE_STREAM'
  | 'INVALID_REQUEST'
  | 'CONFIGURATION_ERROR'
  | 'EMPTY_CONTEXT'
  | 'EMPTY_RESPONSE'
  | 'STREAM_ABORTED'
  | 'PERSISTENCE_ERROR'
  | 'PROVIDER_ERROR';

export interface ProviderErrorDetails {
  code: StreamErrorCode;
  message: string;
  providerStatus?: number;
}

@Injectable()
export class GeminiProviderService {
  private readonly defaultGeminiModel = 'gemini-2.5-flash';

  constructor(private readonly configService: ConfigService) {}

  buildGenerationConfig(model: string): Record<string, unknown> {
    const config: Record<string, unknown> = {
      temperature: 0.35,
      maxOutputTokens: 512,
      topP: 0.8,
    };

    // Gemini 2.5 can consume output budget in thinking tokens.
    // Keep thinking budget at 0 so visible answer is not unexpectedly truncated.
    if (model.includes('2.5')) {
      config.thinkingConfig = {
        thinkingBudget: 0,
      };
    }

    return config;
  }

  buildGeminiStreamUrl(apiKey: string): { url: string; model: string } {
    const configuredModel = this.configService.googleGeminiModel?.trim();
    const model = configuredModel || this.defaultGeminiModel;
    return {
      model,
      url: `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${apiKey}&alt=sse`,
    };
  }

  extractProviderMessage(rawData: unknown): string {
    if (typeof rawData === 'string') {
      return rawData;
    }

    if (isObjectRecord(rawData)) {
      const errorPayload = rawData.error;
      if (isObjectRecord(errorPayload)) {
        const providerMessage = errorPayload.message;
        if (typeof providerMessage === 'string' && providerMessage.trim()) {
          return providerMessage;
        }
      }

      const directMessage = rawData.message;
      if (typeof directMessage === 'string' && directMessage.trim()) {
        return directMessage;
      }
    }

    return safeSerialize(rawData);
  }

  getProviderStatus(error: unknown): number | undefined {
    if (!error || typeof error !== 'object') {
      return undefined;
    }

    const candidate = error as {
      status?: unknown;
      response?: { status?: unknown };
    };
    const status = candidate.status ?? candidate.response?.status;
    return typeof status === 'number' ? status : undefined;
  }

  buildProviderError(error: unknown): ProviderErrorDetails {
    const axiosError = error as AxiosError<unknown>;
    const status = this.getProviderStatus(error);
    const rawData = axiosError?.response?.data;
    const fallbackErrorMessage =
      error instanceof Error ? error.message : 'Unknown provider error';
    const rawMessage =
      this.extractProviderMessage(rawData) ||
      axiosError?.message ||
      fallbackErrorMessage;
    const lowered = rawMessage.toLowerCase();
    const isRateLimited =
      status === 429 ||
      lowered.includes('rate limit') ||
      lowered.includes('quota') ||
      lowered.includes('resource has been exhausted');

    if (isRateLimited) {
      return {
        code: 'PROVIDER_RATE_LIMIT',
        message: 'AI provider quota exceeded.',
        providerStatus: status ?? 429,
      };
    }

    if (status === 400) {
      return {
        code: 'INVALID_REQUEST',
        message: 'AI request could not be processed',
        providerStatus: status,
      };
    }

    if (axiosError?.code === 'ECONNABORTED') {
      return {
        code: 'PROVIDER_ERROR',
        message: 'AI provider request timed out',
        providerStatus: status,
      };
    }

    return {
      code: 'PROVIDER_ERROR',
      message: 'AI service unavailable.',
      providerStatus: status,
    };
  }
}
