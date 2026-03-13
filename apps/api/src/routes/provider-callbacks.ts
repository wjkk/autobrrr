import { Prisma } from '@prisma/client';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { mapRun } from '../lib/api-mappers.js';
import { resolveProviderAdapter } from '../lib/provider-adapters.js';
import { failRun, finalizeGeneratedRun, inferMediaKindFromRunType } from '../lib/run-lifecycle.js';
import { prisma } from '../lib/prisma.js';

const callbackParamsSchema = z.object({
  callbackToken: z.string().min(1),
});

const callbackPayloadSchema = z.object({
  providerJobId: z.string().trim().min(1).optional(),
  providerStatus: z.string().trim().min(1),
  output: z.record(z.string(), z.unknown()).optional(),
  errorCode: z.string().trim().max(120).optional(),
  errorMessage: z.string().trim().max(4000).optional(),
});

const terminalStatuses = new Set(['COMPLETED', 'FAILED', 'CANCELED', 'TIMED_OUT']);

function mergeProviderOutput(run: { outputJson: unknown }, providerOutput?: Record<string, unknown>) {
  if (!providerOutput) {
    return undefined;
  }

  const currentOutput = run.outputJson && typeof run.outputJson === 'object' && !Array.isArray(run.outputJson)
    ? (run.outputJson as Record<string, unknown>)
    : {};

  return {
    ...currentOutput,
    providerData: providerOutput,
  } as Prisma.InputJsonValue;
}

export async function registerProviderCallbackRoutes(app: FastifyInstance) {
  app.post('/api/internal/provider-callbacks/:callbackToken', async (request, reply) => {
    const params = callbackParamsSchema.safeParse(request.params);
    const payload = callbackPayloadSchema.safeParse(request.body);
    if (!params.success || !payload.success) {
      return reply.code(400).send({
        ok: false,
        error: {
          code: 'INVALID_ARGUMENT',
          message: 'Invalid provider callback payload.',
          details: payload.success ? undefined : payload.error.flatten(),
        },
      });
    }

    const run = await prisma.run.findFirst({
      where: { providerCallbackToken: params.data.callbackToken },
    });

    if (!run) {
      return reply.code(404).send({
        ok: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Callback token not found.',
        },
      });
    }

    if (terminalStatuses.has(run.status)) {
      return reply.send({
        ok: true,
        data: mapRun(run),
      });
    }

    if (payload.data.providerJobId && run.providerJobId && payload.data.providerJobId !== run.providerJobId) {
      return reply.code(409).send({
        ok: false,
        error: {
          code: 'PROVIDER_JOB_MISMATCH',
          message: 'Callback provider job id did not match the run.',
        },
      });
    }

    const mediaKind = inferMediaKindFromRunType(run.runType);
    if (!mediaKind) {
      const failed = await failRun(run.id, 'RUN_TYPE_NOT_SUPPORTED', `Unsupported run type: ${run.runType}`);
      const failedRun = await prisma.run.findUniqueOrThrow({ where: { id: failed.runId } });
      return reply.code(409).send({
        ok: false,
        error: {
          code: 'RUN_TYPE_NOT_SUPPORTED',
          message: failedRun.errorMessage ?? 'Unsupported run type.',
        },
      });
    }

    const adapter = resolveProviderAdapter(run);
    const update = await adapter.handleCallback(run, payload.data);

    if (update.type === 'failed') {
      await failRun(run.id, update.errorCode, update.errorMessage);
      const failedRun = await prisma.run.findUniqueOrThrow({ where: { id: run.id } });
      return reply.send({
        ok: true,
        data: mapRun(failedRun),
      });
    }

    if (update.type === 'submitted' || update.type === 'running') {
      const updatedRun = await prisma.run.update({
        where: { id: run.id },
        data: {
          status: 'RUNNING',
          providerJobId: payload.data.providerJobId ?? run.providerJobId,
          providerStatus: update.providerStatus,
          nextPollAt: update.nextPollAt,
          startedAt: run.startedAt ?? new Date(),
          outputJson: mergeProviderOutput(run, update.providerOutput ?? payload.data.output),
        },
      });

      return reply.send({
        ok: true,
        data: mapRun(updatedRun),
      });
    }

    await prisma.run.update({
      where: { id: run.id },
      data: {
        status: 'RUNNING',
        providerJobId: payload.data.providerJobId ?? run.providerJobId,
        providerStatus: update.providerStatus,
        nextPollAt: null,
        startedAt: run.startedAt ?? new Date(),
        outputJson: mergeProviderOutput(run, update.providerOutput ?? payload.data.output),
      },
    });

    const refreshedRun = await prisma.run.findUniqueOrThrow({ where: { id: run.id } });
    await finalizeGeneratedRun(refreshedRun, mediaKind);

    const completedRun = await prisma.run.findUniqueOrThrow({ where: { id: run.id } });
    return reply.send({
      ok: true,
      data: mapRun(completedRun),
    });
  });
}
