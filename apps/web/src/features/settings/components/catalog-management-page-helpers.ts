export type ApiEnvelope<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code?: string; message?: string } };

export function parseApiEnvelope<T>(payload: unknown): ApiEnvelope<T> {
  return payload as ApiEnvelope<T>;
}

export function stringifyJson(value: unknown) {
  if (!value) {
    return '';
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return '';
  }
}

export function parseTags(input: string) {
  return input
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

export function parseMetadata(input: string) {
  const normalized = input.trim();
  if (!normalized) {
    return undefined;
  }

  return JSON.parse(normalized) as Record<string, unknown>;
}

export function nextImageFeedbackTone(message: string, isError: boolean): 'idle' | 'pending' | 'success' | 'error' {
  if (!message) {
    return 'idle';
  }
  if (isError) {
    return 'error';
  }
  if (message.includes('正在') || message.includes('中…')) {
    return 'pending';
  }
  return 'success';
}
