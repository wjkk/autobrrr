import assert from 'node:assert/strict';
import test from 'node:test';

import { authenticateCatalogUser, fetchCatalogCurrentUser } from './auth-client';

test('fetchCatalogCurrentUser returns null when auth endpoint fails', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => ({ ok: false, async json() { return { ok: false, error: { message: 'nope' } }; } }) as Response) as typeof fetch;

  const user = await fetchCatalogCurrentUser();

  assert.equal(user, null);
  globalThis.fetch = originalFetch;
});

test('authenticateCatalogUser performs register + login flow and returns current user', async () => {
  const originalFetch = globalThis.fetch;
  const calls: string[] = [];
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    calls.push(String(input));
    return {
      ok: true,
      async json() {
        return {
          ok: true,
          data: {
            id: 'user-1',
            email: 'qa.local@aiv.dev',
            displayName: 'QA',
          },
        };
      },
    } as Response;
  }) as typeof fetch;

  const user = await authenticateCatalogUser({
    mode: 'register',
    email: 'qa.local@aiv.dev',
    password: 'AivLocal123!',
    displayName: 'QA',
  });

  assert.equal(user?.id, 'user-1');
  assert.deepEqual(calls, ['/api/auth/register', '/api/auth/login', '/api/auth/me']);
  globalThis.fetch = originalFetch;
});
