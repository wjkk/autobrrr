interface ArkRequestOptions {
  baseUrl: string;
  apiKey: string;
  path: string;
  body: Record<string, unknown>;
}

async function requestArk<T>({ baseUrl, apiKey, path, body }: ArkRequestOptions): Promise<T> {
  const response = await fetch(`${baseUrl.replace(/\/$/, '')}${path}`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${apiKey}`,
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

export async function submitArkTextResponse(args: { model: string; prompt: string; baseUrl: string; apiKey: string }) {
  return requestArk<Record<string, unknown>>({
    baseUrl: args.baseUrl,
    apiKey: args.apiKey,
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
