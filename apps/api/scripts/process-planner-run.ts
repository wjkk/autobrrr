import { PrismaClient, type Prisma, type Run } from '@prisma/client';

import { resolveProviderAdapter } from '../src/lib/provider-adapters.ts';
import { failRun, finalizePlannerRun } from '../src/lib/run-lifecycle.ts';

const prisma = new PrismaClient();
const runId = process.argv.slice(2).find((value) => value !== '--');

function readObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

async function markRunRunning(run: Run) {
  if (run.status !== 'QUEUED') {
    return run;
  }

  return prisma.run.update({
    where: { id: run.id },
    data: {
      status: 'RUNNING',
      startedAt: run.startedAt ?? new Date(),
    },
  });
}

async function persistProviderOutput(run: Run, update: Extract<Awaited<ReturnType<ReturnType<typeof resolveProviderAdapter>['submit']>>, { type: 'completed' }>) {
  const currentOutput = readObject(run.outputJson);

  await prisma.run.update({
    where: { id: run.id },
    data: {
      providerStatus: update.providerStatus,
      nextPollAt: null,
      outputJson: {
        ...currentOutput,
        executionMode: 'live',
        providerData: update.providerOutput,
      } as Prisma.InputJsonValue,
    },
  });
}

async function finalizeIfProviderOutputExists(run: Run) {
  const output = readObject(run.outputJson);
  if (!output.providerData) {
    return null;
  }

  return finalizePlannerRun(run);
}

async function main() {
  if (!runId) {
    throw new Error('runId is required');
  }

  const existingRun = await prisma.run.findUnique({ where: { id: runId } });
  if (!existingRun) {
    throw new Error(`Run not found: ${runId}`);
  }

  if (existingRun.status === 'COMPLETED') {
    console.log(JSON.stringify({
      phase: 'completed',
      result: {
        runId: existingRun.id,
        status: existingRun.status.toLowerCase(),
        action: 'processed',
      },
    }, null, 2));
    return;
  }

  if (existingRun.status === 'FAILED' || existingRun.status === 'CANCELED' || existingRun.status === 'TIMED_OUT') {
    console.log(JSON.stringify({
      phase: 'terminal',
      result: {
        runId: existingRun.id,
        status: existingRun.status.toLowerCase(),
        action: 'failed',
      },
    }, null, 2));
    return;
  }

  let run = await markRunRunning(existingRun);
  const finalizedExisting = await finalizeIfProviderOutputExists(run);
  if (finalizedExisting) {
    console.log(JSON.stringify({ phase: 'completed', result: finalizedExisting }, null, 2));
    return;
  }

  const adapter = resolveProviderAdapter(run);
  const update = await adapter.submit(run);

  if (update.type === 'failed') {
    const result = await failRun(run.id, update.errorCode, update.errorMessage);
    console.log(JSON.stringify({ phase: 'failed', result }, null, 2));
    return;
  }

  if (update.type !== 'completed') {
    console.log(JSON.stringify({
      phase: 'non-completed',
      update,
    }, null, 2));
    return;
  }

  await persistProviderOutput(run, update);
  run = await prisma.run.findUniqueOrThrow({ where: { id: run.id } });
  const result = await finalizePlannerRun(run);
  console.log(JSON.stringify({ phase: 'completed', result }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
