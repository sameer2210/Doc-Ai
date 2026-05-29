import { z } from 'zod';

const envSchema = z.object({
  EXPO_PUBLIC_API_URL: z
    .string()
    .min(1, 'EXPO_PUBLIC_API_URL is required')
    .refine(value => value.startsWith('http://') || value.startsWith('https://'), {
      message: 'EXPO_PUBLIC_API_URL must start with http:// or https://',
    }),
});

const parsedEnv = envSchema.safeParse({
  EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL,
});
console.log("Backend Url====="+ process.env.EXPO_PUBLIC_API_URL);

if (!parsedEnv.success) {
  const issue = parsedEnv.error.issues[0]?.message ?? 'Invalid environment configuration';
  throw new Error(`Environment validation failed: ${issue}`);
}

export const env = parsedEnv.data;
