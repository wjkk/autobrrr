import assert from 'node:assert/strict';
import test from 'node:test';

import { prisma } from '../lib/prisma.js';
import { resolveProviderAdapter } from '../lib/provider-adapters.js';
import { createIntegrationApp } from './test-app.js';
import { createCreationVideoFixture, queueVideoRunViaApi } from './test-fixtures.js';

const tinyMp4DataUrl = 'data:video/mp4;base64,AAAAHGZ0eXBpc29tAAAAAGlzb20=';

test('creation video callback finalizes run once and duplicate callbacks stay idempotent', async (t) => {
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
    data: {
      run: { id: string; status: string };
    };
  };
  assert.equal(queuedPayload.data.run.status, 'queued');

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
  const callbackPayload = callbackResponse.json() as {
    ok: true;
    data: { id: string; status: string; providerStatus: string | null };
  };
  assert.equal(callbackPayload.data.id, queuedRun.id);
  assert.equal(callbackPayload.data.status, 'completed');
  assert.equal(callbackPayload.data.providerStatus, 'succeeded');

  const countsAfterFirstCallback = {
    assets: await prisma.asset.count({ where: { projectId: fixture.projectId } }),
    versions: await prisma.shotVersion.count({ where: { shotId: fixture.shotId } }),
  };
  assert.equal(countsAfterFirstCallback.assets, 1);
  assert.equal(countsAfterFirstCallback.versions, 1);

  const duplicateCallbackResponse = await app.inject({
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
  assert.equal(duplicateCallbackResponse.statusCode, 200);
  const duplicatePayload = duplicateCallbackResponse.json() as {
    ok: true;
    data: { id: string; status: string };
  };
  assert.equal(duplicatePayload.data.id, queuedRun.id);
  assert.equal(duplicatePayload.data.status, 'completed');

  const countsAfterDuplicateCallback = {
    assets: await prisma.asset.count({ where: { projectId: fixture.projectId } }),
    versions: await prisma.shotVersion.count({ where: { shotId: fixture.shotId } }),
  };
  assert.deepEqual(countsAfterDuplicateCallback, countsAfterFirstCallback);

  const workspaceResponse = await app.inject({
    method: 'GET',
    url: `/api/projects/${fixture.projectId}/creation/workspace?episodeId=${fixture.episodeId}`,
    headers: {
      cookie: fixture.cookie,
    },
  });
  assert.equal(workspaceResponse.statusCode, 200);
  const workspacePayload = workspaceResponse.json() as {
    ok: true;
    data: {
      shots: Array<{
        id: string;
        status: string;
        activeVersionId: string | null;
        activeVersion: { mediaKind: string; status: string } | null;
        latestGenerationRun: { id: string; status: string } | null;
      }>;
    };
  };
  const finalizedShot = workspacePayload.data.shots.find((shot) => shot.id === fixture.shotId);
  assert.ok(finalizedShot);
  assert.equal(finalizedShot?.status, 'success');
  assert.equal(finalizedShot?.activeVersion?.mediaKind, 'video');
  assert.equal(finalizedShot?.activeVersion?.status, 'active');
  assert.equal(finalizedShot?.latestGenerationRun?.id, queuedRun.id);
  assert.equal(finalizedShot?.latestGenerationRun?.status, 'completed');
});

test('creation video failed callback marks run failed and does not create assets or versions', async (t) => {
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
    data: {
      run: { id: string };
    };
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

  const failedCallbackResponse = await app.inject({
    method: 'POST',
    url: `/api/internal/provider-callbacks/${submit.providerCallbackToken!}`,
    payload: {
      providerJobId: submit.providerJobId,
      providerStatus: 'failed',
      errorCode: 'PROVIDER_FAILED',
      errorMessage: 'integration failure',
    },
  });
  assert.equal(failedCallbackResponse.statusCode, 200);

  const failedRun = await prisma.run.findUniqueOrThrow({
    where: { id: queuedRun.id },
  });
  assert.equal(failedRun.status, 'FAILED');
  assert.equal(failedRun.errorCode, 'PROVIDER_FAILED');
  assert.equal(await prisma.asset.count({ where: { projectId: fixture.projectId } }), 0);
  assert.equal(await prisma.shotVersion.count({ where: { shotId: fixture.shotId } }), 0);
});
