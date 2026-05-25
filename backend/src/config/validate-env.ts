import { z } from 'zod';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
dotenv.config();

const SECRET_PATH = '/run/secrets';

function loadEnvVar(key: string): string | undefined {
  const secretFile = path.join(SECRET_PATH, key);
  if (fs.existsSync(secretFile)) {
    return fs.readFileSync(secretFile, 'utf8').trim();
  }
  return process.env[key];
}

// Load all expected env vars using fallback logic
const rawEnv: Record<string, string | undefined> = {
  JWT_SECRET: loadEnvVar('JWT_SECRET'),
  JWT_REFRESH_SECRET: loadEnvVar('JWT_REFRESH_SECRET'),
  JWT_EXPIRES_IN: loadEnvVar('JWT_EXPIRES_IN'),
  JWT_REFRESH_EXPIRES_IN: loadEnvVar('JWT_REFRESH_EXPIRES_IN'),
  DATABASE_URL: loadEnvVar('DATABASE_URL'),
  PORT: loadEnvVar('PORT'),
  GOOGLE_CLIENT_ID: loadEnvVar('GOOGLE_CLIENT_ID'),
  GOOGLE_WEB_CLIENT_ID: loadEnvVar('GOOGLE_WEB_CLIENT_ID'),
  GOOGLE_ANDROID_CLIENT_ID: loadEnvVar('GOOGLE_ANDROID_CLIENT_ID'),
  GOOGLE_IOS_CLIENT_ID: loadEnvVar('GOOGLE_IOS_CLIENT_ID'),
  AWS_ACCESS_KEY_ID: loadEnvVar('AWS_ACCESS_KEY_ID'),
  AWS_SECRET_ACCESS_KEY: loadEnvVar('AWS_SECRET_ACCESS_KEY') || loadEnvVar('AWS_ACCESS_SECRET'),
  AWS_S3_BUCKET_NAME: loadEnvVar('AWS_S3_BUCKET_NAME') || loadEnvVar('AWS_BUCKET_NAME'),
  AWS_REGION: loadEnvVar('AWS_REGION') || loadEnvVar('AWS_BUCKET_REGION'),
  HUGGINGFACE_API_URL: loadEnvVar('HUGGINGFACE_API_URL'),
  ML_GATEWAY_TIMEOUT_MS: loadEnvVar('ML_GATEWAY_TIMEOUT_MS'),
  ML_GATEWAY_MAX_RETRIES: loadEnvVar('ML_GATEWAY_MAX_RETRIES'),
  GOOGLE_API_KEY: loadEnvVar('GOOGLE_API_KEY'),
};

const envSchema = z.object({
  JWT_SECRET: z.string(),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_SECRET: z.string(),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  DATABASE_URL: z.string().url(),
  PORT: z
    .union([z.string(), z.number()])
    .transform((val) => Number(val))
    .refine((val) => !isNaN(val), {
      message: 'PORT must be a valid number',
    }),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_WEB_CLIENT_ID: z.string().optional(),
  GOOGLE_ANDROID_CLIENT_ID: z.string().optional(),
  GOOGLE_IOS_CLIENT_ID: z.string().optional(),
  AWS_ACCESS_KEY_ID: z.string(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_S3_BUCKET_NAME: z.string().optional(),
  AWS_REGION: z.string().optional(),
  HUGGINGFACE_API_URL: z.string().url().default('https://sameer2210-cataractaiml.hf.space/predict'),
  ML_GATEWAY_TIMEOUT_MS: z
    .union([z.string(), z.number()])
    .transform((val) => Number(val))
    .refine((val) => !isNaN(val), { message: 'ML_GATEWAY_TIMEOUT_MS must be a number' })
    .default(15000),
  ML_GATEWAY_MAX_RETRIES: z
    .union([z.string(), z.number()])
    .transform((val) => Number(val))
    .refine((val) => !isNaN(val), { message: 'ML_GATEWAY_MAX_RETRIES must be a number' })
    .default(3),
  GOOGLE_API_KEY: z.string().optional(),
});

if (process.env.NODE_ENV !== 'production') {
  console.log('[Config] Loaded env:', rawEnv);
}

export const validatedEnv: Record<string, string | number> =
  envSchema.parse(rawEnv);
