import { env } from './env.js';

interface ArkRequestOptions {
  path: string;
  body: Record<string, unknown>;
}

function resolveKey() {
  const key = env.ARK_API_KEY?.trim();
  return key ? key : null;
}

function resolveUrl(path: string) {
  return `${env.ARK_API_BASE_URL.replace(/\/$/, '')}${path}`;
}

export function isArkConfigured() {
  return !!resolveKey();
}

async function requestArk<T>({ path, body }: ArkRequestOptions): Promise<T> {
  const key = resolveKey();
  if (!key) {
    throw new Error('ARK_API_KEY is not configured.');
  }

  const response = await fetch(resolveUrl(path), {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const payload = (await response.json()) as T & { error?: { message?: string } };
  if (!response.ok) {
    throw new Error(payload.error?.message ?? `ARK request failed: ${path}`);
  }

  return payload;
}

export async function submitArkTextResponse(args: { model: string; prompt: string }) {
  return requestArk<Record<string, unknown>>({
    path: '/responses',
    body: {
      model: args.model,
      input: [
        {
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: args.prompt,
            },
          ],
        },
      ],
    },
  });
}
