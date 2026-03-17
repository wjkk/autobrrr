import assert from 'node:assert/strict';
import test from 'node:test';

import { env } from './env.js';
import { prisma } from './prisma.js';
import { getCurrentUser, requireUser } from './auth.js';
import { hashSessionToken } from './session.js';

function installUserSessionStubs(overrides: {
  findUnique: (...args: any[]) => Promise<any>;
  update?: (...args: any[]) => Promise<any>;
}) {
  const originalFindUnique = prisma.userSession.findUnique;
  const originalUpdate = prisma.userSession.update;
  prisma.userSession.findUnique = overrides.findUnique as typeof prisma.userSession.findUnique;
  prisma.userSession.update = (overrides.update ?? originalUpdate) as typeof prisma.userSession.update;
  return () => {
    prisma.userSession.findUnique = originalFindUnique;
    prisma.userSession.update = originalUpdate;
  };
}

test('getCurrentUser returns null when session cookie is missing', async () => {
  const user = await getCurrentUser({
    cookies: {},
  } as never);

  assert.equal(user, null);
});

test('getCurrentUser returns null for revoked, expired or inactive sessions', async () => {
  const findUniqueCalls: unknown[] = [];
  let updateCallCount = 0;
  const queuedSessions = [
    {
      id: 'session-1',
      expiresAt: new Date(Date.now() - 1000),
      revokedAt: null,
      user: {
        id: 'user-1',
        email: 'user@example.com',
        displayName: 'User',
        status: 'ACTIVE',
      },
    },
    {
      id: 'session-2',
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: new Date(),
      user: {
        id: 'user-1',
        email: 'user@example.com',
        displayName: 'User',
        status: 'ACTIVE',
      },
    },
    {
      id: 'session-3',
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: null,
      user: {
        id: 'user-1',
        email: 'user@example.com',
        displayName: 'User',
        status: 'DISABLED',
      },
    },
  ];
  const restore = installUserSessionStubs({
    findUnique: async (args) => {
      findUniqueCalls.push(args);
      return queuedSessions.shift() ?? null;
    },
    update: async () => {
      updateCallCount += 1;
      throw new Error('should not update expired sessions');
    },
  });

  try {
    const expired = await getCurrentUser({
      cookies: {
        [env.SESSION_COOKIE_NAME]: 'session-token',
      },
    } as never);

    assert.equal(expired, null);
    assert.equal(
      (findUniqueCalls[0] as { where: { sessionTokenHash: string } }).where.sessionTokenHash,
      hashSessionToken('session-token'),
    );
    assert.equal(updateCallCount, 0);

    assert.equal(
      await getCurrentUser({
        cookies: {
          [env.SESSION_COOKIE_NAME]: 'session-token',
        },
      } as never),
      null,
    );

    assert.equal(
      await getCurrentUser({
        cookies: {
          [env.SESSION_COOKIE_NAME]: 'session-token',
        },
      } as never),
      null,
    );
  } finally {
    restore();
  }
});

test('getCurrentUser refreshes lastSeenAt and returns the active user', async () => {
  const findUniqueCalls: unknown[] = [];
  const updateCalls: unknown[] = [];
  const restore = installUserSessionStubs({
    findUnique: async (args) => {
      findUniqueCalls.push(args);
      return {
        id: 'session-1',
        expiresAt: new Date(Date.now() + 60_000),
        revokedAt: null,
        user: {
          id: 'user-1',
          email: 'user@example.com',
          displayName: 'User',
          status: 'ACTIVE',
        },
      };
    },
    update: async (args) => {
      updateCalls.push(args);
      return null as never;
    },
  });

  try {
    const user = await getCurrentUser({
      cookies: {
        [env.SESSION_COOKIE_NAME]: 'session-token',
      },
    } as never);

    assert.deepEqual(user, {
      id: 'user-1',
      email: 'user@example.com',
      displayName: 'User',
      status: 'ACTIVE',
    });
    assert.equal(
      (findUniqueCalls[0] as { where: { sessionTokenHash: string } }).where.sessionTokenHash,
      hashSessionToken('session-token'),
    );
    assert.equal(updateCalls.length, 1);
    assert.equal((updateCalls[0] as { where: { id: string } }).where.id, 'session-1');
    assert.ok((updateCalls[0] as { data: { lastSeenAt: unknown } }).data.lastSeenAt instanceof Date);
  } finally {
    restore();
  }
});

test('requireUser sends unauthorized response when current user is missing', async () => {
  let payload: unknown = null;
  let statusCode = 200;
  const reply = {
    code(code: number) {
      statusCode = code;
      return this;
    },
    send(data: unknown) {
      payload = data;
      return data;
    },
  };

  const user = await requireUser(
    {
      cookies: {},
    } as never,
    reply as never,
  );

  assert.equal(user, payload);
  assert.equal(statusCode, 401);
  assert.deepEqual(payload, {
    ok: false,
    error: {
      code: 'UNAUTHORIZED',
      message: 'Authentication required.',
    },
  });
});
