import { Env } from './env';

export const AppConfig = {
  env: Env.NODE_ENV,
  port: Env.PORT,
  jwtSecret: Env.JWT_SECRET,
  databaseUrl: Env.DATABASE_URL,
  geminiDailyLimit: Env.GEMINI_DAILY_LIMIT,
};
