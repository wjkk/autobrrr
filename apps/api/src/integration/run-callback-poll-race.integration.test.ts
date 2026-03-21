import assert from 'node:assert/strict';
import test from 'node:test';

import { prisma } from '../lib/prisma.js';
import { resolveProviderAdapter } from '../lib/provider-adapters.js';
import { __testables as runWorkerTestables } from '../lib/run-worker.js';
import { createIntegrationApp } from './test-app.js';
import { createCreationVideoFixture, queueVideoRunViaApi } from './test-fixtures.js';

const tinyMp4DataUrl = 'data:video/mp4;base64,AAAAHGZ0eXBpc29tAAAAAGlzb20=';

test('completed callback followed by stale worker poll does not duplicate finalize side effects', async (t) => {
  const app = await createIntegrationApp();
  const fixture = await createCreationVideoFixture();

  t.after(async () => {
    await app.close();
    await fixture.cleanup();
  });

  const queueResponse = await queueVideoRunViaApi(app, fixture);
  assert.equal(queueResponse.statusCode, 202);
  const queuedPayload = queueResponse.json() as {
    ok: true;
    data: { run: { id: string } };
  };

  const queuedRun = await prisma.run.findUniqueOrThrow({
    where: { id: queuedPayload.data.run.id },
  });
  const submit = await resolveProviderAdapter(queuedRun).submit(queuedRun);
  assert.equal(submit.type, 'submitted');

  await prisma.run.update({
    where: { id: queuedRun.id },
    data: {
      status: 'RUNNING',
      startedAt: queuedRun.startedAt ?? new Date(),
      providerJobId: submit.providerJobId,
      providerCallbackToken: submit.providerCallbackToken,
      providerStatus: submit.providerStatus,
      nextPollAt: submit.nextPollAt,
    },
  });

  const staleRun = await prisma.run.findUniqueOrThrow({
    where: { id: queuedRun.id },
  });

  const callbackResponse = await app.inject({
    method: 'POST',
    url: `/api/internal/provider-callbacks/${submit.providerCallbackToken!}`,
    payload: {
      providerJobId: submit.providerJobId,
      providerStatus: 'completed',
      output: {
        downloadUrl: tinyMp4DataUrl,
      },
    },
  });
  assert.equal(callbackResponse.statusCode, 200);

  const assetsAfterCallback = await prisma.asset.count({
    where: { projectId: fixture.projectId },
  });
  const versionsAfterCallback = await prisma.shotVersion.count({
    where: { shotId: fixture.shotId },
  });
  assert.equal(assetsAfterCallback, 1);
  assert.equal(versionsAfterCallback, 1);

  const pollResult = await runWorkerTestables.handleProviderPoll(staleRun);
  assert.equal(pollResult.action, 'processed');
  assert.equal(pollResult.status, 'completed');

  const assetsAfterPoll = await prisma.asset.count({
    where: { projectId: fixture.projectId },
  });
  const versionsAfterPoll = await prisma.shotVersion.count({
    where: { shotId: fixture.shotId },
  });
  assert.equal(assetsAfterPoll, 1);
  assert.equal(versionsAfterPoll, 1);
});
