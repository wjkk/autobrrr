import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

export interface ProviderCaptureReplayRequest {
  providerCode: string;
  capability: 'text' | 'image' | 'video' | 'audio';
  operation: string;
  request: {
    url: string;
    method: 'GET' | 'POST';
    body?: Record<string, unknown>;
  };
}

interface JsonReplayEnvelope {
  version: 1;
  kind: 'json';
  ok: boolean;
  status: number;
  request: ProviderCaptureReplayRequest;
  response: unknown;
}

interface BinaryReplayEnvelope {
  version: 1;
  kind: 'binary';
  ok: boolean;
  status: number;
  request: ProviderCaptureReplayRequest;
  contentType: string;
  bodyBase64: string;
}

type ProviderReplayEnvelope = JsonReplayEnvelope | BinaryReplayEnvelope;

function stableNormalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => stableNormalize(item));
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => [key, stableNormalize(nested)]),
    );
  }

  return value;
}

function buildReplayHash(request: ProviderCaptureReplayRequest) {
  const normalized = stableNormalize(request);
  return crypto.createHash('sha256').update(JSON.stringify(normalized)).digest('hex');
}

function buildReplayFilePath(baseDir: string, request: ProviderCaptureReplayRequest) {
  const hash = buildReplayHash(request);
  const operation = request.operation
    .replace(/^\//, '')
    .replaceAll('/', '__')
    .replaceAll(/[^a-zA-Z0-9_.-]/g, '_');

  return path.join(
    baseDir,
    request.providerCode,
    request.capability,
    `${operation}-${hash}.json`,
  );
}

async function readReplayEnvelope(baseDir: string | null | undefined, request: ProviderCaptureReplayRequest) {
  if (!baseDir) {
    return null;
  }

  const filePath = buildReplayFilePath(baseDir, request);
  try {
    const content = await fs.readFile(filePath, 'utf8');
    return JSON.parse(content) as ProviderReplayEnvelope;
  } catch (error) {
    const code = error && typeof error === 'object' ? (error as NodeJS.ErrnoException).code : null;
    if (code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

async function writeReplayEnvelope(baseDir: string | null | undefined, request: ProviderCaptureReplayRequest, envelope: ProviderReplayEnvelope) {
  if (!baseDir) {
    return;
  }

  const filePath = buildReplayFilePath(baseDir, request);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(envelope, null, 2)}\n`, 'utf8');
}

export async function tryReplayJsonResponse<T>(args: {
  replayDir?: string | null;
  request: ProviderCaptureReplayRequest;
}) {
  const envelope = await readReplayEnvelope(args.replayDir, args.request);
  if (!envelope) {
    return null;
  }
  if (envelope.kind !== 'json') {
    throw new Error(`Replay payload kind mismatch for ${args.request.operation}.`);
  }

  return {
    ok: envelope.ok,
    status: envelope.status,
    payload: envelope.response as T,
  };
}

export async function tryReplayBinaryResponse(args: {
  replayDir?: string | null;
  request: ProviderCaptureReplayRequest;
}) {
  const envelope = await readReplayEnvelope(args.replayDir, args.request);
  if (!envelope) {
    return null;
  }
  if (envelope.kind !== 'binary') {
    throw new Error(`Replay payload kind mismatch for ${args.request.operation}.`);
  }

  return {
    ok: envelope.ok,
    status: envelope.status,
    contentType: envelope.contentType,
    buffer: Buffer.from(envelope.bodyBase64, 'base64'),
  };
}

export async function captureJsonResponse(args: {
  captureDir?: string | null;
  request: ProviderCaptureReplayRequest;
  ok: boolean;
  status: number;
  response: unknown;
}) {
  await writeReplayEnvelope(args.captureDir, args.request, {
    version: 1,
    kind: 'json',
    ok: args.ok,
    status: args.status,
    request: args.request,
    response: args.response,
  });
}

export async function captureBinaryResponse(args: {
  captureDir?: string | null;
  request: ProviderCaptureReplayRequest;
  ok: boolean;
  status: number;
  contentType: string;
  buffer: Buffer;
}) {
  await writeReplayEnvelope(args.captureDir, args.request, {
    version: 1,
    kind: 'binary',
    ok: args.ok,
    status: args.status,
    request: args.request,
    contentType: args.contentType,
    bodyBase64: args.buffer.toString('base64'),
  });
}
