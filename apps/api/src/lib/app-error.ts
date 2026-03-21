import type { FastifyReply } from 'fastify';
import { ZodType } from 'zod';

export interface AppErrorPayload {
  code: string;
  message: string;
  details?: unknown;
}

export class AppError extends Error {
  readonly code: string;
  readonly statusCode: number;
  readonly details?: unknown;

  constructor(args: {
    code: string;
    message: string;
    statusCode: number;
    details?: unknown;
  }) {
    super(args.message);
    this.name = 'AppError';
    this.code = args.code;
    this.statusCode = args.statusCode;
    this.details = args.details;
  }
}

export function invalidArgument(message: string, details?: unknown) {
  return new AppError({
    code: 'INVALID_ARGUMENT',
    message,
    statusCode: 400,
    details,
  });
}

export function unauthorized(message = 'Authentication required.') {
  return new AppError({
    code: 'UNAUTHORIZED',
    message,
    statusCode: 401,
  });
}

export function notFound(message: string, code = 'NOT_FOUND') {
  return new AppError({
    code,
    message,
    statusCode: 404,
  });
}

export function conflict(message: string, code: string) {
  return new AppError({
    code,
    message,
    statusCode: 409,
  });
}

export function parseOrThrow<TOutput>(schema: ZodType<TOutput>, input: unknown, message: string): TOutput {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw invalidArgument(message, result.error.flatten());
  }
  return result.data;
}

export function toAppError(error: unknown) {
  if (error instanceof AppError) {
    return error;
  }

  return new AppError({
    code: 'INTERNAL_ERROR',
    message: 'Unexpected server error.',
    statusCode: 500,
  });
}

export function sendAppError(reply: FastifyReply, error: unknown) {
  const appError = toAppError(error);
  const payload: { ok: false; error: AppErrorPayload } = {
    ok: false,
    error: {
      code: appError.code,
      message: appError.message,
      ...(appError.details === undefined ? {} : { details: appError.details }),
    },
  };
  return reply.code(appError.statusCode).send(payload);
}
