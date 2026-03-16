import assert from 'node:assert/strict';

import { Prisma } from '@prisma/client';

import { createExternalApiCallLogHook } from '../src/lib/external-api-call-logs.js';
import { prisma } from '../src/lib/prisma.js';
import { emitTransportHook, setTransportHook } from '../src/lib/transport-hooks.js';

async function main() {
  const suffix = Date.now().toString(36);
  const traceId = `trace-smoke-${suffix}`;
  const user = await prisma.user.create({
    data: {
      email: `smoke-external-log-${suffix}@example.com`,
      passwordHash: 'not-used',
      displayName: 'Smoke External Api Log',
    },
  });

  const project = await prisma.project.create({
    data: {
      title: 'Smoke External Api Log Project',
      brief: 'Transport hook persistence smoke test.',
      createdById: user.id,
    },
  });

  const episode = await prisma.episode.create({
    data: {
      projectId: project.id,
      episodeNo: 1,
      title: 'Episode 1',
      status: 'PLANNING',
    },
  });

  const provider = await prisma.modelProvider.create({
    data: {
      code: `smoke-provider-${suffix}`,
      name: 'Smoke Provider',
      providerType: 'INTERNAL',
      enabled: true,
    },
  });

  const family = await prisma.modelFamily.create({
    data: {
      slug: `smoke-family-${suffix}`,
      name: 'Smoke Family',
      modelKind: 'TEXT',
      capabilityJson: {} as Prisma.InputJsonValue,
    },
  });

  const endpoint = await prisma.modelEndpoint.create({
    data: {
      familyId: family.id,
      providerId: provider.id,
      slug: `smoke-endpoint-${suffix}`,
      remoteModelKey: 'smoke-model',
      label: 'Smoke Endpoint',
      status: 'ACTIVE',
    },
  });

  const run = await prisma.run.create({
    data: {
      projectId: project.id,
      episodeId: episode.id,
      modelFamilyId: family.id,
      modelProviderId: provider.id,
      modelEndpointId: endpoint.id,
      runType: 'PLANNER_DOC_UPDATE',
      resourceType: 'planner_session',
      resourceId: 'planner-session-smoke',
      inputJson: {
        prompt: 'hello smoke',
      } as Prisma.InputJsonValue,
    },
  });

  setTransportHook(createExternalApiCallLogHook());

  await emitTransportHook({
    providerCode: 'smoke-provider',
    capability: 'text',
    operation: '/v1/test',
    request: {
      url: 'https://smoke.example.com/v1/test',
      method: 'POST',
      body: {
        prompt: 'hello smoke',
      },
    },
    response: {
      request_id: 'req-smoke-1',
      ok: true,
    },
    latencyMs: 123,
    metadata: {
      traceId,
      runId: run.id,
      userId: user.id,
      projectId: project.id,
      episodeId: episode.id,
      resourceType: 'planner_session',
      resourceId: 'planner-session-smoke',
      modelFamilyId: family.id,
      modelProviderId: provider.id,
      modelEndpointId: endpoint.id,
    },
  });

  const log = await prisma.externalApiCallLog.findFirstOrThrow({
    where: {
      traceId,
    },
  });

  assert.equal(log.runId, run.id);
  assert.equal(log.userId, user.id);
  assert.equal(log.projectId, project.id);
  assert.equal(log.episodeId, episode.id);
  assert.equal(log.providerCode, 'smoke-provider');
  assert.equal(log.capability, 'text');
  assert.equal(log.providerRequestId, 'req-smoke-1');
  assert.equal(log.latencyMs, 123);

  console.log('[smoke:external-api-call-logs] ok');
}

main()
  .catch((error) => {
    console.error('[smoke:external-api-call-logs] failed');
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    setTransportHook(null);
    await prisma.$disconnect();
  });
