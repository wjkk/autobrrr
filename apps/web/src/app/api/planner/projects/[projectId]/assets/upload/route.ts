import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

import { NextResponse } from 'next/server';

import { AivApiError, requestAivApi } from '@/lib/aiv-api';

interface RouteContext {
  params: Promise<{ projectId: string }>;
}

const MAX_IMAGE_SIZE_BYTES = 8 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);

function sanitizeFileName(fileName: string) {
  const cleaned = fileName.trim().replace(/[^a-zA-Z0-9._-]+/g, '-');
  return cleaned.length > 0 ? cleaned.slice(-120) : 'upload.png';
}

async function resolveUploadDir() {
  const cwd = process.cwd();
  const candidates = [
    path.join(cwd, 'public', 'uploads', 'planner'),
    path.join(cwd, 'apps', 'web', 'public', 'uploads', 'planner'),
  ];

  for (const candidate of candidates) {
    const parent = path.dirname(candidate);
    try {
      await mkdir(candidate, { recursive: true });
      if (parent) {
        return candidate;
      }
    } catch {
      // Try next candidate.
    }
  }

  throw new Error('Unable to prepare planner upload directory.');
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { projectId } = await context.params;
    const formData = await request.formData();
    const file = formData.get('file');
    const episodeId = typeof formData.get('episodeId') === 'string' ? (formData.get('episodeId') as string) : '';

    if (!(file instanceof File)) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: 'INVALID_ARGUMENT',
            message: 'Missing upload file.',
          },
        },
        { status: 400 },
      );
    }

    if (!episodeId.trim()) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: 'INVALID_ARGUMENT',
            message: 'Missing episodeId.',
          },
        },
        { status: 400 },
      );
    }

    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: 'UNSUPPORTED_MEDIA_TYPE',
            message: 'Only png, jpeg and webp images are supported.',
          },
        },
        { status: 415 },
      );
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: 'FILE_TOO_LARGE',
            message: 'Image file must be 8MB or smaller.',
          },
        },
        { status: 413 },
      );
    }

    const uploadDir = await resolveUploadDir();
    const now = new Date();
    const datePath = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const datedDir = path.join(uploadDir, datePath);
    await mkdir(datedDir, { recursive: true });

    const fileName = sanitizeFileName(file.name || 'upload-image');
    const storedFileName = `${randomUUID()}-${fileName}`;
    const targetFilePath = path.join(datedDir, storedFileName);
    const bytes = Buffer.from(await file.arrayBuffer());
    await writeFile(targetFilePath, bytes);

    const sourcePath = `/uploads/planner/${datePath}/${storedFileName}`;
    const sourceUrl = new URL(sourcePath, request.url).toString();

    const asset = await requestAivApi<{
      id: string;
      sourceUrl: string | null;
      fileName: string;
      mediaKind: string;
      sourceKind: string;
    }>(`/api/projects/${encodeURIComponent(projectId)}/assets`, {
      method: 'POST',
      cookieHeader: request.headers.get('cookie'),
      body: JSON.stringify({
        episodeId,
        mediaKind: 'image',
        sourceKind: 'upload',
        fileName,
        mimeType: file.type,
        fileSizeBytes: file.size,
        sourceUrl,
        metadata: {
          plannerUpload: true,
          plannerScope: 'planner',
          retentionClass: 'temp-editable',
          uploadedAt: now.toISOString(),
          originalFileName: file.name,
        },
      }),
    });

    return NextResponse.json({
      ok: true,
      data: asset,
    });
  } catch (error) {
    const message = error instanceof AivApiError || error instanceof Error ? error.message : 'Planner upload failed.';
    const status = error instanceof AivApiError && error.status ? error.status : 500;
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: error instanceof AivApiError ? error.code : 'PLANNER_UPLOAD_FAILED',
          message,
        },
      },
      { status },
    );
  }
}
