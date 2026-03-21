import assert from 'node:assert/strict';
import test from 'node:test';

import { prisma } from '../lib/prisma.js';
import { resolveProviderAdapter } from '../lib/provider-adapters.js';
import { createIntegrationApp } from './test-app.js';
import { createPlannerAssetFixture } from './test-fixtures.js';

const tinyPngDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a4k0AAAAASUVORK5CYII=';

test('planner subject image generation persists asset and exposes it in planner workspace', async (t) => {
  const app = await createIntegrationApp();
  const fixture = await createPlannerAssetFixture();

  t.after(async () => {
    await app.close();
    await fixture.cleanup();
  });

  const queueResponse = await app.inject({
    method: 'POST',
    url: `/api/projects/${fixture.projectId}/planner/subjects/${fixture.subjectId}/generate-image`,
    headers: {
      cookie: fixture.cookie,
    },
    payload: {
      episodeId: fixture.episodeId,
      prompt: '生成主角林夏的角色定妆图',
      modelFamily: fixture.familySlug,
      modelEndpoint: fixture.endpointSlug,
    },
  });
  assert.equal(queueResponse.statusCode, 202);
  const queuedPayload = queueResponse.json() as {
    ok: true;
    data: { run: { id: string; status: string } };
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
        downloadUrl: tinyPngDataUrl,
      },
    },
  });
  assert.equal(callbackResponse.statusCode, 200);

  const assetCount = await prisma.asset.count({
    where: { projectId: fixture.projectId },
  });
  assert.equal(assetCount, 1);

  const workspaceResponse = await app.inject({
    method: 'GET',
    url: `/api/projects/${fixture.projectId}/planner/workspace?episodeId=${fixture.episodeId}`,
    headers: {
      cookie: fixture.cookie,
    },
  });
  assert.equal(workspaceResponse.statusCode, 200);
  const workspacePayload = workspaceResponse.json() as {
    ok: true;
    data: {
      activeRefinement: {
        subjects: Array<{
          id: string;
          generatedAssetIds: string[];
          generatedAssets: Array<{ id: string; mediaKind: string; sourceKind: string }>;
        }>;
      } | null;
    };
  };
  const subject = workspacePayload.data.activeRefinement?.subjects.find((item) => item.id === fixture.subjectId);
  assert.ok(subject);
  assert.equal(subject?.generatedAssetIds.length, 1);
  assert.equal(subject?.generatedAssets.length, 1);
  assert.equal(subject?.generatedAssets[0]?.id, subject?.generatedAssetIds[0]);
  assert.equal(subject?.generatedAssets[0]?.mediaKind, 'image');
  assert.equal(subject?.generatedAssets[0]?.sourceKind, 'generated');
});
