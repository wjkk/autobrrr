import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { AppError, conflict, parseOrThrow, unauthorized } from '../lib/app-error.js';
import { getCurrentUser } from '../lib/auth.js';
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

const updateProfileSchema = z.object({
  displayName: z
    .string()
    .trim()
    .max(64)
    .transform((value) => value || null),
});

function assertLoginUserOrThrow(user: {
  id: string;
  email: string;
  displayName: string | null;
  status: string;
  passwordHash: string;
} | null, password: string): asserts user is {
  id: string;
  email: string;
  displayName: string | null;
  status: string;
  passwordHash: string;
} {
  if (!user || user.status !== 'ACTIVE' || !verifyPassword(password, user.passwordHash)) {
    throw new AppError({
      code: 'INVALID_CREDENTIALS',
      message: 'Invalid email or password.',
      statusCode: 401,
    });
  }
}

export async function registerAuthRoutes(app: FastifyInstance) {
  app.post('/api/auth/register', async (request, reply) => {
    const payload = parseOrThrow(registerSchema, request.body, 'Invalid registration payload.');

    const existing = await prisma.user.findUnique({
      where: { email: payload.email },
      select: { id: true },
    });

    if (existing) {
      throw conflict('Email already registered.', 'EMAIL_ALREADY_EXISTS');
    }

    const user = await prisma.user.create({
      data: {
        email: payload.email,
        passwordHash: hashPassword(payload.password),
        displayName: payload.displayName ?? null,
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
    const payload = parseOrThrow(loginSchema, request.body, 'Invalid login payload.');

    const user = await prisma.user.findUnique({
      where: { email: payload.email },
    });

    assertLoginUserOrThrow(user, payload.password);

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
      throw unauthorized();
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
      throw unauthorized();
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

  app.patch('/api/auth/me', async (request, reply) => {
    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      throw unauthorized();
    }

    const payload = parseOrThrow(updateProfileSchema, request.body, 'Invalid profile update payload.');

    const user = await prisma.user.update({
      where: { id: currentUser.id },
      data: {
        displayName: payload.displayName,
      },
      select: {
        id: true,
        email: true,
        displayName: true,
      },
    });

    return reply.send({ ok: true, data: user });
  });
}

export const __testables = {
  assertLoginUserOrThrow,
};
