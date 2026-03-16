import { createReadStream } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import type { FastifyInstance } from 'fastify';

import { env } from './env.js';
import type { SupportedMediaKind } from './run-lifecycle.js';

const uploadsRoot = path.resolve(process.cwd(), 'uploads');
const generatedRoot = path.join(uploadsRoot, 'generated');

function getExtensionForMimeType(mimeType: string | null, mediaKind: SupportedMediaKind) {
  const normalized = mimeType?.split(';')[0]?.trim().toLowerCase() ?? '';
  if (normalized === 'image/jpeg') {
    return 'jpg';
  }
  if (normalized === 'image/webp') {
    return 'webp';
  }
  if (normalized === 'video/quicktime') {
    return 'mov';
  }
  if (normalized === 'video/webm') {
    return 'webm';
  }
  return mediaKind === 'IMAGE' ? 'png' : 'mp4';
}

function inferMimeTypeFromExtension(filePath: string) {
  const extension = path.extname(filePath).toLowerCase();
  if (extension === '.jpg' || extension === '.jpeg') {
    return 'image/jpeg';
  }
  if (extension === '.webp') {
    return 'image/webp';
  }
  if (extension === '.mp4') {
    return 'video/mp4';
  }
  if (extension === '.mov') {
    return 'video/quicktime';
  }
  if (extension === '.webm') {
    return 'video/webm';
  }
  if (extension === '.png') {
    return 'image/png';
  }
  return 'application/octet-stream';
}

function buildPublicBaseUrl() {
  return env.API_PUBLIC_BASE_URL?.trim() || `http://localhost:${env.API_PORT}`;
}

function buildRelativeStorageKey(args: { runId: string; mediaKind: SupportedMediaKind; mimeType: string | null }) {
  const now = new Date();
  const year = now.getUTCFullYear().toString();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const day = String(now.getUTCDate()).padStart(2, '0');
  const extension = getExtensionForMimeType(args.mimeType, args.mediaKind);
  return path.posix.join(year, month, day, `${args.runId}.${extension}`);
}

export async function downloadGeneratedAssetToLocal(args: {
  runId: string;
  mediaKind: SupportedMediaKind;
  providerSourceUrl: string;
}) {
  const response = await fetch(args.providerSourceUrl);
  if (!response.ok) {
    throw new Error(`Failed to download provider asset: ${response.status} ${response.statusText}`);
  }

  const mimeType = response.headers.get('content-type');
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  if (buffer.length === 0) {
    throw new Error('Downloaded provider asset is empty.');
  }

  const storageKey = buildRelativeStorageKey({
    runId: args.runId,
    mediaKind: args.mediaKind,
    mimeType,
  });
  const absolutePath = path.join(generatedRoot, storageKey);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, buffer);

  const fileName = path.basename(absolutePath);
  const sourcePath = `/uploads/generated/${storageKey}`;
  const sourceUrl = new URL(sourcePath, buildPublicBaseUrl()).toString();

  return {
    storageKey: path.posix.join('generated', storageKey),
    absolutePath,
    fileName,
    sourcePath,
    sourceUrl,
    mimeType: mimeType?.split(';')[0]?.trim() || null,
    fileSizeBytes: buffer.length,
  };
}

export async function registerGeneratedUploadRoutes(app: FastifyInstance) {
  app.get('/uploads/generated/*', async (request, reply) => {
    const wildcard = (request.params as { '*': string })['*'] ?? '';
    const normalized = path.posix.normalize(wildcard).replace(/^(\.\.(\/|\\|$))+/, '');
    const absolutePath = path.join(generatedRoot, normalized);

    if (!absolutePath.startsWith(generatedRoot)) {
      return reply.code(400).send({
        ok: false,
        error: {
          code: 'INVALID_PATH',
          message: 'Invalid upload path.',
        },
      });
    }

    try {
      const stream = createReadStream(absolutePath);
      reply.type(inferMimeTypeFromExtension(absolutePath));
      return reply.send(stream);
    } catch {
      return reply.code(404).send({
        ok: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Uploaded asset not found.',
        },
      });
    }
  });
}
