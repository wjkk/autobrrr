import assert from 'node:assert/strict';
import test from 'node:test';

import { saveCatalogStyle, saveCatalogSubject } from './save-client';
import { makeEmptyStyleDraft, makeEmptySubjectDraft } from '../catalog-management-drafts';

function buildFetchMock(assertions: (input: RequestInfo | URL, init?: RequestInit) => void) {
  return async (input: RequestInfo | URL, init?: RequestInit) => {
    assertions(input, init);
    return {
      ok: true,
      async json() {
        return {
          ok: true,
          data: { id: 'saved-1', name: 'Saved', provider: null },
        };
      },
    } as Response;
  };
}

test('saveCatalogSubject posts normalized payload to subject endpoint', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = buildFetchMock((input, init) => {
    assert.equal(input, '/api/explore/subjects');
    assert.equal(init?.method, 'POST');
    assert.match(String(init?.body), /"slug":"hero"/);
    assert.match(String(init?.body), /"visibility":"public"/);
  }) as typeof fetch;

  await saveCatalogSubject({
    draft: { ...makeEmptySubjectDraft(), slug: ' hero ', name: ' Hero ' },
    publicOnly: true,
  });

  globalThis.fetch = originalFetch;
});

test('saveCatalogStyle patches existing style endpoint with normalized payload', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = buildFetchMock((input, init) => {
    assert.equal(input, '/api/explore/styles/style-1');
    assert.equal(init?.method, 'PATCH');
    assert.match(String(init?.body), /"slug":"neo-noir"/);
  }) as typeof fetch;

  await saveCatalogStyle({
    draft: { ...makeEmptyStyleDraft(), id: 'style-1', slug: ' neo-noir ', name: ' Neo Noir ' },
    publicOnly: false,
  });

  globalThis.fetch = originalFetch;
});
