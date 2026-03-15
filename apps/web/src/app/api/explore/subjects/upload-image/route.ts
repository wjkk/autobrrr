import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

import { NextResponse } from 'next/server';

const MAX_IMAGE_SIZE_BYTES = 8 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);

function sanitizeFileName(fileName: string) {
  const cleaned = fileName.trim().replace(/[^a-zA-Z0-9._-]+/g, '-');
  return cleaned.length > 0 ? cleaned.slice(-120) : 'upload.png';
}

async function resolveUploadDir() {
  const cwd = process.cwd();
  const candidates = [
    path.join(cwd, 'public', 'uploads', 'catalogs'),
    path.join(cwd, 'apps', 'web', 'public', 'uploads', 'catalogs'),
  ];

  for (const candidate of candidates) {
    try {
      await mkdir(candidate, { recursive: true });
      return candidate;
    } catch {
      // continue
    }
  }

  throw new Error('Unable to prepare catalog upload directory.');
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, error: { code: 'INVALID_ARGUMENT', message: 'Missing upload file.' } }, { status: 400 });
    }

    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      return NextResponse.json({ ok: false, error: { code: 'UNSUPPORTED_MEDIA_TYPE', message: 'Only png, jpeg and webp images are supported.' } }, { status: 415 });
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      return NextResponse.json({ ok: false, error: { code: 'FILE_TOO_LARGE', message: 'Image file must be 8MB or smaller.' } }, { status: 413 });
    }

    const uploadDir = await resolveUploadDir();
    const now = new Date();
    const datePath = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const datedDir = path.join(uploadDir, datePath);
    await mkdir(datedDir, { recursive: true });

    const fileName = sanitizeFileName(file.name || 'catalog-image');
    const storedFileName = `${randomUUID()}-${fileName}`;
    const targetFilePath = path.join(datedDir, storedFileName);
    const bytes = Buffer.from(await file.arrayBuffer());
    await writeFile(targetFilePath, bytes);

    const sourcePath = `/uploads/catalogs/${datePath}/${storedFileName}`;
    const sourceUrl = new URL(sourcePath, request.url).toString();

    return NextResponse.json({ ok: true, data: { imageUrl: sourcePath, absoluteUrl: sourceUrl, fileName } });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: { code: 'CATALOG_UPLOAD_FAILED', message: error instanceof Error ? error.message : 'Catalog image upload failed.' } },
      { status: 500 },
    );
  }
}
