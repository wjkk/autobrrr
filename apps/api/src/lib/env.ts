import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  API_PORT: z.coerce.number().int().positive().default(8787),
  SESSION_COOKIE_NAME: z.string().min(1).default('aiv_session'),
  SESSION_TTL_DAYS: z.coerce.number().int().positive().default(14),
  AICSO_API_BASE_URL: z.string().url().default('https://api.aicso.top'),
  AICSO_API_TOKEN: z.string().optional(),
  AICSO_IMAGE_MODEL: z.string().min(1).default('gemini-3.1-flash-image-preview'),
  AICSO_TEXT_MODEL: z.string().min(1).default('gemini-3.1-flash-lite-preview'),
  AICSO_VIDEO_MODEL: z.string().min(1).default('veo_3_1-fast-4K'),
  AICSO_POLL_INTERVAL_SECONDS: z.coerce.number().int().positive().default(6),
});

export const env = envSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  API_PORT: process.env.API_PORT,
  SESSION_COOKIE_NAME: process.env.SESSION_COOKIE_NAME,
  SESSION_TTL_DAYS: process.env.SESSION_TTL_DAYS,
  AICSO_API_BASE_URL: process.env.AICSO_API_BASE_URL,
  AICSO_API_TOKEN: process.env.AICSO_API_TOKEN,
  AICSO_IMAGE_MODEL: process.env.AICSO_IMAGE_MODEL,
  AICSO_TEXT_MODEL: process.env.AICSO_TEXT_MODEL,
  AICSO_VIDEO_MODEL: process.env.AICSO_VIDEO_MODEL,
  AICSO_POLL_INTERVAL_SECONDS: process.env.AICSO_POLL_INTERVAL_SECONDS,
});
