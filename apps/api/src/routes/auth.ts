import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { env } from '../lib/env.js';
import { hashPassword, verifyPassword } from '../lib/password.js';
import { prisma } from '../lib/prisma.js';
import { createSessionToken, hashSessionToken } from '../lib/session.js';

const registerSchema = z.object({
  email: z.email().transform((value) => value.trim().toLowerCase()),
  password: z.string().min(8).max(128),
  displayName: z.string().trim().min(1).max(64).optional(),
});

const loginSchema = z.object({
  email: z.email().transform((value) => value.trim().toLowerCase()),
  password: z.string().min(1),
});

export async function registerAuthRoutes(app: FastifyInstance) {
  app.post('/api/auth/register', async (request, reply) => {
    const payload = registerSchema.safeParse(request.body);
    if (!payload.success) {
      return reply.code(400).send({
        ok: false,
        error: {
          code: 'INVALID_ARGUMENT',
          message: 'Invalid registration payload.',
          details: payload.error.flatten(),
        },
      });
    }

    const existing = await prisma.user.findUnique({
      where: { email: payload.data.email },
      select: { id: true },
    });

    if (existing) {
      return reply.code(409).send({
        ok: false,
        error: {
          code: 'EMAIL_ALREADY_EXISTS',
          message: 'Email already registered.',
        },
      });
    }

    const user = await prisma.user.create({
      data: {
        email: payload.data.email,
        passwordHash: hashPassword(payload.data.password),
        displayName: payload.data.displayName ?? null,
        status: 'ACTIVE',
      },
      select: {
        id: true,
        email: true,
        displayName: true,
      },
    });

    return reply.code(201).send({ ok: true, data: user });
  });

  app.post('/api/auth/login', async (request, reply) => {
    const payload = loginSchema.safeParse(request.body);
    if (!payload.success) {
      return reply.code(400).send({
        ok: false,
        error: {
          code: 'INVALID_ARGUMENT',
          message: 'Invalid login payload.',
          details: payload.error.flatten(),
        },
      });
    }

    const user = await prisma.user.findUnique({
      where: { email: payload.data.email },
    });

    if (!user || user.status !== 'ACTIVE' || !verifyPassword(payload.data.password, user.passwordHash)) {
      return reply.code(401).send({
        ok: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password.',
        },
      });
    }

    const sessionToken = createSessionToken();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + env.SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);

    await prisma.userSession.create({
      data: {
        userId: user.id,
        sessionTokenHash: hashSessionToken(sessionToken),
        expiresAt,
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'] ?? null,
      },
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: now },
    });

    reply.setCookie(env.SESSION_COOKIE_NAME, sessionToken, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      expires: expiresAt,
      secure: process.env.NODE_ENV === 'production',
    });

    return reply.send({
      ok: true,
      data: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
      },
    });
  });

  app.post('/api/auth/logout', async (request, reply) => {
    const sessionToken = request.cookies[env.SESSION_COOKIE_NAME];
    if (sessionToken) {
      await prisma.userSession.updateMany({
        where: { sessionTokenHash: hashSessionToken(sessionToken), revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }

    reply.clearCookie(env.SESSION_COOKIE_NAME, {
      httpOnly: true,
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });

    return reply.send({ ok: true, data: { success: true } });
  });

  app.get('/api/auth/me', async (request, reply) => {
    const sessionToken = request.cookies[env.SESSION_COOKIE_NAME];
    if (!sessionToken) {
      return reply.code(401).send({
        ok: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required.',
        },
      });
    }

    const session = await prisma.userSession.findUnique({
      where: { sessionTokenHash: hashSessionToken(sessionToken) },
      select: {
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
      },
    });

    if (!session || session.revokedAt || session.expiresAt <= new Date() || session.user.status !== 'ACTIVE') {
      return reply.code(401).send({
        ok: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required.',
        },
      });
    }

    return reply.send({
      ok: true,
      data: {
        id: session.user.id,
        email: session.user.email,
        displayName: session.user.displayName,
      },
    });
  });
}
