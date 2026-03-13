import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  API_PORT: z.coerce.number().int().positive().default(8787),
  SESSION_COOKIE_NAME: z.string().min(1).default('aiv_session'),
  SESSION_TTL_DAYS: z.coerce.number().int().positive().default(14),
});

export const env = envSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  API_PORT: process.env.API_PORT,
  SESSION_COOKIE_NAME: process.env.SESSION_COOKIE_NAME,
  SESSION_TTL_DAYS: process.env.SESSION_TTL_DAYS,
});
