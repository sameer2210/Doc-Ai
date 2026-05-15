import { z } from 'zod';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

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
});

if (process.env.NODE_ENV !== 'production') {
  console.log('[Config] Loaded env:', rawEnv);
}

export const validatedEnv: Record<string, string | number> =
  envSchema.parse(rawEnv);
