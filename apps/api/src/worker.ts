import { pathToFileURL } from 'node:url';

import { createExternalApiCallLogHook } from './lib/external-api-call-logs.js';
import { prisma } from './lib/prisma.js';
import { processNextQueuedRun } from './lib/run-worker.js';
import { setTransportHook } from './lib/transport-hooks.js';

const DEFAULT_IDLE_INTERVAL_MS = 1500;
const DEFAULT_ERROR_RETRY_MS = 3000;

interface WorkerRuntimeConfig {
  once: boolean;
  idleIntervalMs: number;
  errorRetryMs: number;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function readInterval(envValue: string | undefined, fallback: number) {
  const parsed = Number(envValue);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function readWorkerRuntimeConfig(args = process.argv.slice(2), env = process.env): WorkerRuntimeConfig {
  return {
    once: args.includes('--once') || env.AIV_WORKER_ONCE === '1',
    idleIntervalMs: readInterval(env.AIV_WORKER_IDLE_INTERVAL_MS, DEFAULT_IDLE_INTERVAL_MS),
    errorRetryMs: readInterval(env.AIV_WORKER_ERROR_RETRY_MS, DEFAULT_ERROR_RETRY_MS),
  };
}

async function main() {
  const config = readWorkerRuntimeConfig();
  setTransportHook(createExternalApiCallLogHook());
  let idleLogged = false;

  while (true) {
    try {
      const processed = await processNextQueuedRun();

      if (!processed) {
        if (config.once) {
          console.log('[worker] no queued runs');
          return;
        }

        if (!idleLogged) {
          console.log(`[worker] idle; polling every ${config.idleIntervalMs}ms`);
          idleLogged = true;
        }
        await sleep(config.idleIntervalMs);
        continue;
      }

      idleLogged = false;
      console.log(`[worker] ${processed.action}: ${processed.runId} (${processed.status})`);
      if (config.once) {
        return;
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.stack ?? error.message : String(error);
      console.error(`[worker] failed: ${message}`);
      if (config.once) {
        throw error;
      }
      idleLogged = false;
      await sleep(config.errorRetryMs);
    }
  }
}

const isEntrypoint = process.argv[1] ? import.meta.url === pathToFileURL(process.argv[1]).href : false;

if (isEntrypoint) {
  main()
    .catch(() => {
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

export const __testables = {
  readWorkerRuntimeConfig,
};
