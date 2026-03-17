import fs from 'node:fs';
import path from 'node:path';

import { z } from 'zod';

function stripWrappingQuotes(value: string) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

function applyEnvFileContent(content: string, target: NodeJS.ProcessEnv) {
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }

    const separatorIndex = line.indexOf('=');
    if (separatorIndex <= 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    if (!key || target[key] !== undefined) {
      continue;
    }

    const rawValue = line.slice(separatorIndex + 1).trim();
    target[key] = stripWrappingQuotes(rawValue);
  }
}

function loadLocalEnvFile() {
  const envFilePath = path.resolve(process.cwd(), '.env');
  if (!fs.existsSync(envFilePath)) {
    return;
  }

  applyEnvFileContent(fs.readFileSync(envFilePath, 'utf8'), process.env);
}

loadLocalEnvFile();

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  API_PORT: z.coerce.number().int().positive().default(8787),
  API_PUBLIC_BASE_URL: z.string().trim().url().optional(),
  SESSION_COOKIE_NAME: z.string().min(1).default('aiv_session'),
  SESSION_TTL_DAYS: z.coerce.number().int().positive().default(14),
});

function parseEnv(source: NodeJS.ProcessEnv) {
  return envSchema.parse({
    DATABASE_URL: source.DATABASE_URL,
    API_PORT: source.API_PORT,
    API_PUBLIC_BASE_URL: source.API_PUBLIC_BASE_URL,
    SESSION_COOKIE_NAME: source.SESSION_COOKIE_NAME,
    SESSION_TTL_DAYS: source.SESSION_TTL_DAYS,
  });
}

export const env = parseEnv(process.env);

export const __testables = {
  stripWrappingQuotes,
  applyEnvFileContent,
  parseEnv,
};
