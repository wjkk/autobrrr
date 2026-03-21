import assert from 'node:assert/strict';
import test from 'node:test';

import { prisma } from '../lib/prisma.js';
import { serializeRunInput } from '../lib/run-input.js';
import { __testables as runWorkerTestables } from '../lib/run-worker.js';
import { createCreationVideoFixture } from './test-fixtures.js';

test('claimNextRunWithDeps only lets one worker claim the same queued run', async (t) => {
  const fixture = await createCreationVideoFixture();

  t.after(async () => {
    await fixture.cleanup();
  });

  const run = await prisma.run.create({
    data: {
      projectId: fixture.projectId,
      episodeId: fixture.episodeId,
      modelFamilyId: fixture.familyId,
      modelProviderId: fixture.providerId,
      modelEndpointId: fixture.endpointId,
      runType: 'VIDEO_GENERATION',
      resourceType: 'shot',
      resourceId: fixture.shotId,
      status: 'QUEUED',
      executorType: 'SYSTEM_WORKER',
      inputJson: serializeRunInput({
        shotId: fixture.shotId,
        prompt: '并发抢占测试',
        modelFamily: {
          id: fixture.familyId,
          slug: fixture.familySlug,
          name: fixture.familySlug,
        },
        modelProvider: {
          id: fixture.providerId,
          code: `${fixture.scope}-provider`,
          name: `${fixture.scope} provider`,
          providerType: 'proxy',
        },
        modelEndpoint: {
          id: fixture.endpointId,
          slug: fixture.endpointSlug,
          label: fixture.endpointSlug,
          remoteModelKey: `${fixture.scope}-video-model`,
        },
        referenceAssetIds: [],
        options: null,
      }),
    },
  });

  const scopedDeps: {
    findFirst: typeof prisma.run.findFirst;
    updateMany: typeof prisma.run.updateMany;
    findUnique: typeof prisma.run.findUnique;
  } = {
    findFirst: (((args?: Parameters<typeof prisma.run.findFirst>[0]) => prisma.run.findFirst({
      ...(args ?? {}),
      where: {
        AND: [
          args?.where ?? {},
          { id: run.id },
        ],
      },
    })) as unknown as typeof prisma.run.findFirst),
    updateMany: (((args: Parameters<typeof prisma.run.updateMany>[0]) => prisma.run.updateMany({
      ...args,
      where: {
        AND: [
          args.where ?? {},
          { id: run.id },
        ],
      },
    })) as unknown as typeof prisma.run.updateMany),
    findUnique: (((args: Parameters<typeof prisma.run.findUnique>[0]) => prisma.run.findUnique(args)) as unknown as typeof prisma.run.findUnique),
  };

  const [claimA, claimB] = await Promise.all([
    runWorkerTestables.claimNextRunWithDeps(scopedDeps),
    runWorkerTestables.claimNextRunWithDeps(scopedDeps),
  ]);

  const successfulClaims = [claimA, claimB].filter((value): value is NonNullable<typeof value> => value !== null);
  assert.equal(successfulClaims.length, 1);
  assert.equal(successfulClaims[0]?.id, run.id);

  const storedRun = await prisma.run.findUniqueOrThrow({
    where: { id: run.id },
  });
  assert.equal(storedRun.status, 'RUNNING');
  assert.ok(storedRun.startedAt);
});
