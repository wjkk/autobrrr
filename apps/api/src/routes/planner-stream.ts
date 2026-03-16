import type { FastifyInstance } from 'fastify';
import { Prisma } from '@prisma/client';
import { z } from 'zod';

import { requireUser } from '../lib/auth.js';
import { findOwnedEpisode } from '../lib/ownership.js';
import { prisma } from '../lib/prisma.js';
import { parseRunInput } from '../lib/run-input.js';

const paramsSchema = z.object({
  projectId: z.string().min(1),
});

const querySchema = z.object({
  episodeId: z.string().min(1),
  runId: z.string().min(1).optional(),
});

function toStepStatus(status: string) {
  switch (status.toUpperCase()) {
    case 'DONE':
      return 'done';
    case 'RUNNING':
      return 'running';
    case 'FAILED':
      return 'failed';
    default:
      return 'waiting';
  }
}

function readStepDefinitions(run: { id: string; runType: string; inputJson: Prisma.JsonValue | null; status: string }) {
  if (run.runType !== 'PLANNER_DOC_UPDATE') {
    return [];
  }

  try {
    const input = parseRunInput({
      id: run.id,
      runType: run.runType,
      inputJson: run.inputJson,
    });
    if (!('stepDefinitions' in input) || !Array.isArray(input.stepDefinitions)) {
      return [];
    }

    return input.stepDefinitions.map((step, index) => {
      const title = typeof step.title === 'string' && step.title.trim().length > 0 ? step.title.trim() : `步骤 ${index + 1}`;
      const rawDetails = Array.isArray(step.details) ? step.details.filter((detail): detail is string => typeof detail === 'string') : [];
      return {
        id: typeof step.id === 'string' && step.id.trim().length > 0 ? step.id.trim() : `step-${index + 1}`,
        title,
        details: rawDetails,
      };
    });
  } catch {
    return [];
  }
}

function buildSyntheticSteps(run: { id: string; runType: string; inputJson: Prisma.JsonValue | null; status: string }) {
  const definitions = readStepDefinitions(run);
  if (definitions.length === 0) {
    return [];
  }

  const normalizedRunStatus = run.status.toUpperCase();

  return definitions.map((step, index) => ({
    id: step.id,
    stepKey: step.id,
    title: step.title,
    status:
      normalizedRunStatus === 'RUNNING'
        ? index === 0
          ? 'running'
          : 'waiting'
        : normalizedRunStatus === 'FAILED' || normalizedRunStatus === 'TIMED_OUT' || normalizedRunStatus === 'CANCELED'
          ? index === 0
            ? 'failed'
            : 'waiting'
          : 'waiting',
    detail: {
      details: step.details,
    },
    sortOrder: index + 1,
  }));
}

async function buildPlannerStreamSnapshot(args: {
  projectId: string;
  episodeId: string;
  runId?: string;
}) {
  const plannerSession = await prisma.plannerSession.findFirst({
    where: {
      projectId: args.projectId,
      episodeId: args.episodeId,
      isActive: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
    select: {
      id: true,
      status: true,
      refinementVersions: {
        where: {
          isActive: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 1,
        select: {
          id: true,
          sourceRunId: true,
          stepAnalysis: {
            orderBy: {
              sortOrder: 'asc',
            },
            select: {
              id: true,
              stepKey: true,
              title: true,
              status: true,
              detailJson: true,
              sortOrder: true,
            },
          },
        },
      },
    },
  });

  const trackedRun = args.runId
    ? await prisma.run.findFirst({
        where: {
          id: args.runId,
          projectId: args.projectId,
          episodeId: args.episodeId,
        },
        select: {
          id: true,
          runType: true,
          status: true,
          inputJson: true,
          errorCode: true,
          errorMessage: true,
        },
      })
    : null;

  const activeRefinement = plannerSession?.refinementVersions[0] ?? null;
  const shouldUsePersistedSteps =
    activeRefinement?.stepAnalysis.length
    && (!trackedRun || activeRefinement.sourceRunId === trackedRun.id);

  const steps = shouldUsePersistedSteps
    ? activeRefinement.stepAnalysis.map((step) => ({
        id: step.id,
        stepKey: step.stepKey,
        title: step.title,
        status: toStepStatus(step.status),
        detail:
          step.detailJson && typeof step.detailJson === 'object' && !Array.isArray(step.detailJson)
            ? step.detailJson
            : null,
        sortOrder: step.sortOrder,
      }))
    : trackedRun
      ? buildSyntheticSteps(trackedRun)
      : [];

  const runStatus = trackedRun?.status.toLowerCase() ?? null;
  const terminal = runStatus ? ['completed', 'failed', 'canceled', 'timed_out'].includes(runStatus) : false;

  return {
    plannerSessionId: plannerSession?.id ?? null,
    plannerStatus: plannerSession?.status.toLowerCase() ?? null,
    refinementVersionId: activeRefinement?.id ?? null,
    runId: trackedRun?.id ?? null,
    runStatus,
    errorCode: trackedRun?.errorCode ?? null,
    errorMessage: trackedRun?.errorMessage ?? null,
    steps,
    terminal,
  };
}

export async function registerPlannerStreamRoutes(app: FastifyInstance) {
  app.get('/api/projects/:projectId/planner/stream', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) {
      return;
    }

    const params = paramsSchema.safeParse(request.params);
    const query = querySchema.safeParse(request.query);
    if (!params.success || !query.success) {
      return reply.code(400).send({
        ok: false,
        error: {
          code: 'INVALID_ARGUMENT',
          message: 'Invalid planner stream request.',
        },
      });
    }

    const episode = await findOwnedEpisode(params.data.projectId, query.data.episodeId, user.id);
    if (!episode) {
      return reply.code(404).send({
        ok: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Planner stream workspace not found.',
        },
      });
    }

    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    });
    reply.raw.flushHeaders?.();

    let closed = false;
    let previousPayload = '';

    const writeEvent = async () => {
      const snapshot = await buildPlannerStreamSnapshot({
        projectId: episode.project.id,
        episodeId: episode.id,
        runId: query.data.runId,
      });
      const serialized = JSON.stringify(snapshot);
      if (serialized !== previousPayload) {
        reply.raw.write(`event: planner_state\n`);
        reply.raw.write(`data: ${serialized}\n\n`);
        previousPayload = serialized;
      }

      if (snapshot.terminal) {
        reply.raw.end();
        closed = true;
      }
    };

    const interval = setInterval(() => {
      if (closed) {
        return;
      }

      void writeEvent().catch(() => {
        if (!closed) {
          reply.raw.end();
          closed = true;
        }
      });
    }, 1000);

    const timeout = setTimeout(() => {
      if (!closed) {
        reply.raw.end();
        closed = true;
      }
    }, 90_000);

    request.raw.on('close', () => {
      closed = true;
      clearInterval(interval);
      clearTimeout(timeout);
    });

    await writeEvent();
    return reply;
  });
}
