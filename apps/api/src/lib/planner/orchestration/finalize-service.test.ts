import assert from 'node:assert/strict';
import test from 'node:test';

import { __testables } from './finalize-service.js';

test('finalizePlannerRefinementWithDeps returns NOT_FOUND when episode is not owned', async () => {
  const result = await __testables.finalizePlannerRefinementWithDeps(
    {
      projectId: 'project-1',
      episodeId: 'episode-1',
      userId: 'user-1',
    },
    {
      prisma: {} as never,
      findOwnedEpisode: async () => null,
      resolvePlannerTargetVideoModel: async () => null,
      finalizePlannerRefinementToCreation: async () => {
        throw new Error('unexpected');
      },
    },
  );

  assert.deepEqual(result, {
    ok: false,
    error: 'NOT_FOUND',
  });
});

test('finalizePlannerRefinementWithDeps returns TARGET_VIDEO_MODEL_REQUIRED when no model can be resolved', async () => {
  const result = await __testables.finalizePlannerRefinementWithDeps(
    {
      projectId: 'project-1',
      episodeId: 'episode-1',
      userId: 'user-1',
    },
    {
      findOwnedEpisode: async () =>
        ({
          id: 'episode-1',
          project: {
            id: 'project-1',
          },
        }) as never,
      resolvePlannerTargetVideoModel: async () => null,
      finalizePlannerRefinementToCreation: async () => {
        throw new Error('unexpected');
      },
      prisma: {
        plannerSession: {
          findFirst: async () => ({
            id: 'session-1',
            project: {
              creationConfig: {
                settingsJson: {},
              },
            },
            refinementVersions: [
              {
                id: 'ref-1',
                status: 'READY',
                shotScripts: [
                  {
                    targetModelFamilySlug: null,
                  },
                ],
                scenes: [],
                subjects: [],
              },
            ],
          }),
        },
      } as never,
    },
  );

  assert.deepEqual(result, {
    ok: false,
    error: 'TARGET_VIDEO_MODEL_REQUIRED',
  });
});

test('finalizePlannerRefinementWithDeps finalizes active refinement and writes transition message', async () => {
  let transitionWritten = false;

  const result = await __testables.finalizePlannerRefinementWithDeps(
    {
      projectId: 'project-1',
      episodeId: 'episode-1',
      userId: 'user-1',
      targetVideoModelFamilySlug: 'seedance-2-0',
    },
    {
      findOwnedEpisode: async () =>
        ({
          id: 'episode-1',
          project: {
            id: 'project-1',
          },
        }) as never,
      resolvePlannerTargetVideoModel: async () =>
        ({
          familySlug: 'seedance-2-0',
          familyName: 'Seedance 2.0',
          summary: 'summary',
          capability: {},
        }) as never,
      finalizePlannerRefinementToCreation: async () => ({
        promptPackages: [],
        finalizedShotCount: 3,
        finalizedAt: '2026-03-19T00:00:00.000Z',
      }),
      prisma: {
        plannerSession: {
          findFirst: async () => ({
            id: 'session-1',
            project: {
              creationConfig: {
                settingsJson: {},
              },
            },
            refinementVersions: [
              {
                id: 'ref-1',
                status: 'READY',
                shotScripts: [
                  {
                    id: 'shot-1',
                    targetModelFamilySlug: 'seedance-2-0',
                  },
                ],
                scenes: [],
                subjects: [],
              },
            ],
          }),
        },
        $transaction: async (callback: (db: never) => Promise<{ finalizedShotCount: number; finalizedAt: string }>) =>
          callback({
            plannerMessage: {
              create: async () => {
                transitionWritten = true;
              },
            },
          } as never),
      } as never,
    },
  );

  assert.equal(transitionWritten, true);
  assert.deepEqual(result, {
    ok: true,
    refinementVersionId: 'ref-1',
    targetVideoModelFamilySlug: 'seedance-2-0',
    finalizedShotCount: 3,
    finalizedAt: '2026-03-19T00:00:00.000Z',
  });
});
