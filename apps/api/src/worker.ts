import { createExternalApiCallLogHook } from './lib/external-api-call-logs.js';
import { prisma } from './lib/prisma.js';
import { processNextQueuedRun } from './lib/run-worker.js';
import { setTransportHook } from './lib/transport-hooks.js';

async function main() {
  setTransportHook(createExternalApiCallLogHook());
  const processed = await processNextQueuedRun();

  if (!processed) {
    console.log('[worker] no queued runs');
    return;
  }

  console.log(`[worker] ${processed.action}: ${processed.runId} (${processed.status})`);
}

main()
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.stack ?? error.message : String(error);
    console.error(`[worker] failed: ${message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
