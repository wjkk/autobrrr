import { Prisma } from '@prisma/client';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { mapRun } from '../lib/api-mappers.js';
import { conflict, invalidArgument, notFound } from '../lib/app-error.js';
import { resolveProviderAdapter } from '../lib/provider-adapters.js';
import { failRun, finalizeGeneratedRun, inferMediaKindFromRunType } from '../lib/run-lifecycle.js';
import { prisma } from '../lib/prisma.js';
import { buildProviderCallbackLogEntry } from '../lib/run-observability.js';

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

function assertProviderJobMatches(run: {
  providerJobId: string | null;
}, payload: {
  providerJobId?: string;
}) {
  if (payload.providerJobId && run.providerJobId && payload.providerJobId !== run.providerJobId) {
    throw conflict('Callback provider job id did not match the run.', 'PROVIDER_JOB_MISMATCH');
  }
}

export async function registerProviderCallbackRoutes(app: FastifyInstance) {
  app.post('/api/internal/provider-callbacks/:callbackToken', async (request, reply) => {
    const params = callbackParamsSchema.safeParse(request.params);
    const payload = callbackPayloadSchema.safeParse(request.body);
    if (!params.success || !payload.success) {
      throw invalidArgument(
        'Invalid provider callback payload.',
        payload.success ? undefined : payload.error.flatten(),
      );
    }

    const run = await prisma.run.findFirst({
      where: { providerCallbackToken: params.data.callbackToken },
    });

    if (!run) {
      throw notFound('Callback token not found.');
    }

    if (terminalStatuses.has(run.status)) {
      request.log.info(buildProviderCallbackLogEntry('terminal_short_circuit', {
        callbackToken: params.data.callbackToken,
        runId: run.id,
        status: run.status,
      }));
      return reply.send({
        ok: true,
        data: mapRun(run),
      });
    }

    assertProviderJobMatches(run, payload.data);

    const mediaKind = inferMediaKindFromRunType(run.runType);
    if (!mediaKind) {
      const failed = await failRun(run.id, 'RUN_TYPE_NOT_SUPPORTED', `Unsupported run type: ${run.runType}`);
      const failedRun = await prisma.run.findUniqueOrThrow({ where: { id: failed.runId } });
      throw conflict(failedRun.errorMessage ?? 'Unsupported run type.', 'RUN_TYPE_NOT_SUPPORTED');
    }

    const adapter = resolveProviderAdapter(run);
    request.log.info(buildProviderCallbackLogEntry('received', {
      callbackToken: params.data.callbackToken,
      runId: run.id,
      providerJobId: payload.data.providerJobId ?? run.providerJobId,
      providerStatus: payload.data.providerStatus,
    }));
    const update = await adapter.handleCallback(run, payload.data);

    if (update.type === 'failed') {
      await failRun(run.id, update.errorCode, update.errorMessage);
      const failedRun = await prisma.run.findUniqueOrThrow({ where: { id: run.id } });
      request.log.warn(buildProviderCallbackLogEntry('failed', {
        callbackToken: params.data.callbackToken,
        runId: run.id,
        providerJobId: payload.data.providerJobId ?? run.providerJobId,
        providerStatus: update.providerStatus,
        errorCode: update.errorCode,
      }));
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

      request.log.info(buildProviderCallbackLogEntry('running', {
        callbackToken: params.data.callbackToken,
        runId: run.id,
        providerJobId: payload.data.providerJobId ?? run.providerJobId,
        providerStatus: update.providerStatus,
      }));
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
    request.log.info(buildProviderCallbackLogEntry('completed', {
      callbackToken: params.data.callbackToken,
      runId: run.id,
      providerJobId: payload.data.providerJobId ?? run.providerJobId,
      providerStatus: completedRun.providerStatus,
      status: completedRun.status,
    }));
    return reply.send({
      ok: true,
      data: mapRun(completedRun),
    });
  });
}

export const __testables = {
  mergeProviderOutput,
  assertProviderJobMatches,
};
