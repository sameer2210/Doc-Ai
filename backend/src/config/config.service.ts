import * as fs from 'fs';
import { EnvKey } from '@common/constants/env-keys.enum';
import { validatedEnv } from './validate-env';
import { Injectable } from '@nestjs/common';
@Injectable()
export class ConfigService {
  constructor() {}

  private tryLoadDockerSecret(secretPath: string): string | undefined {
    try {
      return fs.readFileSync(secretPath, 'utf8').trim();
    } catch {
      return undefined;
    }
  }

  get<T = string>(key: EnvKey): T {
    const secretOverrides: Partial<Record<EnvKey, string>> = {
      [EnvKey.JWT_SECRET]: this.tryLoadDockerSecret('/run/secrets/jwt_secret'),
      [EnvKey.JWT_REFRESH_SECRET]: this.tryLoadDockerSecret(
        '/run/secrets/jwt_refresh_secret',
      ),
      [EnvKey.DATABASE_URL]: this.tryLoadDockerSecret(
        '/run/secrets/database_url',
      ),
    };

    const value = secretOverrides[key] ?? validatedEnv[key];
    if (value === undefined || value === null) {
      throw new Error(`Missing environment variable: ${key}`);
    }
    return value as T;
  }

  getOptional<T = string>(key: EnvKey): T | undefined {
    return validatedEnv[key] as T | undefined;
  }

  get jwtSecret(): string {
    return this.get(EnvKey.JWT_SECRET);
  }

  get jwtExpiresIn(): string {
    return this.get(EnvKey.JWT_EXPIRES_IN);
  }

  get jwtRefreshSecret(): string {
    return this.get(EnvKey.JWT_REFRESH_SECRET);
  }

  get jwtRefreshExpiresIn(): string {
    return this.get(EnvKey.JWT_REFRESH_EXPIRES_IN);
  }

  get port(): number {
    return this.get<number>(EnvKey.PORT);
  }

  get databaseUrl(): string {
    return this.get(EnvKey.DATABASE_URL);
  }

  get googleWebClientId(): string | undefined {
    return this.getOptional(EnvKey.GOOGLE_WEB_CLIENT_ID);
  }

  get googleAndroidClientId(): string | undefined {
    return this.getOptional(EnvKey.GOOGLE_ANDROID_CLIENT_ID);
  }

  get googleIosClientId(): string | undefined {
    return this.getOptional(EnvKey.GOOGLE_IOS_CLIENT_ID);
  }

  get googleClientIds(): string[] {
    const ids = [
      this.googleWebClientId,
      this.googleAndroidClientId,
      this.googleIosClientId,
    ].filter((value): value is string => Boolean(value));

    return Array.from(new Set(ids));
  }

  get awsAccessKeyId(): string {
    return this.get(EnvKey.AWS_ACCESS_KEY_ID);
  }

  get awsAccessSecret(): string {
    return this.get(EnvKey.AWS_SECRET_ACCESS_KEY);
  }

  get awsBucketName(): string {
    return this.get(EnvKey.AWS_S3_BUCKET_NAME);
  }

  get awsBucketRegion(): string {
    return this.get(EnvKey.AWS_REGION);
  }

  get huggingfaceApiUrl(): string {
    return this.get(EnvKey.HUGGINGFACE_API_URL);
  }

  get mlGatewayTimeoutMs(): number {
    return this.get<number>(EnvKey.ML_GATEWAY_TIMEOUT_MS);
  }

  get mlGatewayMaxRetries(): number {
    return this.get<number>(EnvKey.ML_GATEWAY_MAX_RETRIES);
  }

  get googleApiKey(): string | undefined {
    return this.getOptional(EnvKey.GOOGLE_API_KEY);
  }
}
