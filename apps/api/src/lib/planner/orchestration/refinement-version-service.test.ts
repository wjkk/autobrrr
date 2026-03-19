import assert from 'node:assert/strict';
import test from 'node:test';

import { __testables } from './refinement-version-service.js';

test('activatePlannerRefinementVersionWithDeps returns NOT_FOUND when episode is not owned', async () => {
  const result = await __testables.activatePlannerRefinementVersionWithDeps(
    {
      projectId: 'project-1',
      episodeId: 'episode-1',
      userId: 'user-1',
      versionId: 'ref-1',
    },
    {
      prisma: {} as never,
      findOwnedEpisode: async () => null,
      createPlannerRefinementDraftCopy: async () => {
        throw new Error('unexpected');
      },
    },
  );

  assert.deepEqual(result, {
    ok: false,
    error: 'NOT_FOUND',
  });
});

test('activatePlannerRefinementVersionWithDeps activates target version and syncs structured doc into project, episode and latest run', async () => {
  const operations: string[] = [];

  const result = await __testables.activatePlannerRefinementVersionWithDeps(
    {
      projectId: 'project-1',
      episodeId: 'episode-1',
      userId: 'user-1',
      versionId: 'ref-1',
    },
    {
      findOwnedEpisode: async () =>
        ({
          id: 'episode-1',
          project: {
            id: 'project-1',
          },
        }) as never,
      createPlannerRefinementDraftCopy: async () => {
        throw new Error('unexpected');
      },
      prisma: {
        plannerSession: {
          findFirst: async () => ({
            id: 'session-1',
          }),
        },
        plannerRefinementVersion: {
          findFirst: async () => ({
            id: 'ref-1',
            plannerSessionId: 'session-1',
            structuredDocJson: {
              projectTitle: '新项目标题',
              episodeTitle: '新剧集标题',
              summaryBullets: ['新的摘要'],
            },
          }),
        },
        $transaction: async (callback: (db: never) => Promise<void>) =>
          callback({
            plannerRefinementVersion: {
              updateMany: async () => {
                operations.push('deactivate-active');
              },
              update: async () => {
                operations.push('activate-target');
              },
            },
            project: {
              update: async ({ data }: { data: Record<string, unknown> }) => {
                operations.push(`project:${String(data.title)}:${String(data.brief)}`);
              },
            },
            episode: {
              update: async ({ data }: { data: Record<string, unknown> }) => {
                operations.push(`episode:${String(data.title)}:${String(data.summary)}`);
              },
            },
            run: {
              findFirst: async () => ({
                id: 'run-1',
                outputJson: { current: true },
              }),
              update: async ({ data }: { data: { outputJson: Record<string, unknown> } }) => {
                operations.push(`run:${String(data.outputJson.structuredDoc && 'synced')}`);
              },
            },
          } as never),
      } as never,
    },
  );

  assert.deepEqual(result, {
    ok: true,
    refinementVersionId: 'ref-1',
  });
  assert.deepEqual(operations, [
    'deactivate-active',
    'activate-target',
    'project:新项目标题:新的摘要',
    'episode:新剧集标题:新的摘要',
    'run:synced',
  ]);
});

test('createPlannerRefinementDraftWithDeps returns PLANNER_REFINEMENT_NOT_CONFIRMED for draft source versions', async () => {
  const result = await __testables.createPlannerRefinementDraftWithDeps(
    {
      projectId: 'project-1',
      episodeId: 'episode-1',
      userId: 'user-1',
      versionId: 'ref-1',
    },
    {
      findOwnedEpisode: async () =>
        ({
          id: 'episode-1',
          project: {
            id: 'project-1',
          },
        }) as never,
      createPlannerRefinementDraftCopy: async () => {
        throw new Error('unexpected');
      },
      prisma: {
        plannerSession: {
          findFirst: async () => ({
            id: 'session-1',
          }),
        },
        plannerRefinementVersion: {
          findFirst: async () => ({
            id: 'ref-1',
            plannerSessionId: 'session-1',
            isConfirmed: false,
            subjects: [],
            scenes: [],
            shotScripts: [],
            stepAnalysis: [],
          }),
        },
      } as never,
    },
  );

  assert.deepEqual(result, {
    ok: false,
    error: 'PLANNER_REFINEMENT_NOT_CONFIRMED',
  });
});

test('createPlannerRefinementDraftWithDeps delegates draft copy creation for confirmed versions', async () => {
  const result = await __testables.createPlannerRefinementDraftWithDeps(
    {
      projectId: 'project-1',
      episodeId: 'episode-1',
      userId: 'user-1',
      versionId: 'ref-1',
    },
    {
      findOwnedEpisode: async () =>
        ({
          id: 'episode-1',
          project: {
            id: 'project-1',
          },
        }) as never,
      createPlannerRefinementDraftCopy: async ({ createdById }: { createdById: string | null }) => {
        assert.equal(createdById, 'user-1');
        return {
          id: 'ref-2',
        } as never;
      },
      prisma: {
        plannerSession: {
          findFirst: async () => ({
            id: 'session-1',
          }),
        },
        plannerRefinementVersion: {
          findFirst: async () => ({
            id: 'ref-1',
            plannerSessionId: 'session-1',
            agentProfileId: null,
            subAgentProfileId: null,
            sourceRunId: null,
            sourceOutlineVersionId: null,
            versionNumber: 1,
            triggerType: 'generate_doc',
            status: 'READY',
            instruction: null,
            assistantMessage: null,
            documentTitle: null,
            generatedText: null,
            structuredDocJson: null,
            inputSnapshotJson: null,
            modelSnapshotJson: null,
            operationsJson: null,
            isConfirmed: true,
            createdById: 'user-1',
            subjects: [],
            scenes: [],
            shotScripts: [],
            stepAnalysis: [],
          }),
        },
        $transaction: async (callback: (db: never) => Promise<{ id: string }>) => callback({} as never),
      } as never,
    },
  );

  assert.deepEqual(result, {
    ok: true,
    refinementVersionId: 'ref-2',
    sourceRefinementVersionId: 'ref-1',
  });
});
