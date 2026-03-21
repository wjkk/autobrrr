import assert from 'node:assert/strict';
import test from 'node:test';

import { generateCatalogSubjectImage, uploadCatalogSubjectImage } from './subject-image-client';

test('generateCatalogSubjectImage posts normalized image generation request', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
    assert.equal(init?.method, 'POST');
    assert.match(String(init?.body), /"name":"主角"/);
    return {
      ok: true,
      async json() {
        return { ok: true, data: { imageUrl: 'https://cdn.example.com/generated.png' } };
      },
    } as Response;
  }) as typeof fetch;

  const imageUrl = await generateCatalogSubjectImage({
    name: '主角',
    subjectType: 'human',
    description: '赛博朋克记者',
  });

  assert.equal(imageUrl, 'https://cdn.example.com/generated.png');
  globalThis.fetch = originalFetch;
});

test('uploadCatalogSubjectImage sends multipart form data', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
    assert.ok(init?.body instanceof FormData);
    return {
      ok: true,
      async json() {
        return { ok: true, data: { imageUrl: 'https://cdn.example.com/uploaded.png' } };
      },
    } as Response;
  }) as typeof fetch;

  const imageUrl = await uploadCatalogSubjectImage(new File(['demo'], 'subject.png', { type: 'image/png' }));

  assert.equal(imageUrl, 'https://cdn.example.com/uploaded.png');
  globalThis.fetch = originalFetch;
});
