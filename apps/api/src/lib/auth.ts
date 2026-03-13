import type { FastifyRequest, FastifyReply } from 'fastify';

import { env } from './env.js';
import { prisma } from './prisma.js';
import { hashSessionToken } from './session.js';

const SESSION_SELECT = {
  id: true,
  expiresAt: true,
  revokedAt: true,
  user: {
    select: {
      id: true,
      email: true,
      displayName: true,
      status: true,
    },
  },
} as const;

export type AuthUser = {
  id: string;
  email: string;
  displayName: string | null;
  status: string;
};

export async function getCurrentUser(request: FastifyRequest): Promise<AuthUser | null> {
  const token = request.cookies[env.SESSION_COOKIE_NAME];
  if (!token) {
    return null;
  }

  const session = await prisma.userSession.findUnique({
    where: { sessionTokenHash: hashSessionToken(token) },
    select: SESSION_SELECT,
  });

  if (!session || session.revokedAt || session.expiresAt <= new Date() || session.user.status !== 'ACTIVE') {
    return null;
  }

  await prisma.userSession.update({
    where: { id: session.id },
    data: {
      lastSeenAt: new Date(),
    },
  });

  return session.user;
}

export async function requireUser(request: FastifyRequest, reply: FastifyReply) {
  const user = await getCurrentUser(request);
  if (!user) {
    reply.code(401);
    return reply.send({
      ok: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required.',
      },
    });
  }

  return user;
}
