import * as dotenv from 'dotenv';
import * as fs from 'fs';
import { z } from 'zod';

const NODE_ENV = process.env.NODE_ENV || 'development';

dotenv.config();
const envFile = `.env.${NODE_ENV}`;
if (fs.existsSync(envFile)) {
  dotenv.config({ path: envFile });
}

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.preprocess((val) => val ?? process.env.PORT, z.coerce.number()),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(10),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.format());
  process.exit(1);
}

export const Env = parsed.data;
