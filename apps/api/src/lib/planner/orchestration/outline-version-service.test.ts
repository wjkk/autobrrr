import assert from 'node:assert/strict';
import test from 'node:test';

import { __testables } from './outline-version-service.js';

test('toOutlinePreview extracts project and first-episode summary fields from outline doc json', () => {
  const preview = __testables.toOutlinePreview({
    projectTitle: '项目A',
    premise: '一个关于旧档案的悬疑故事。',
    storyArc: [
      {
        title: '档案室',
        summary: '主角第一次接触关键线索。',
      },
    ],
  });

  assert.deepEqual(preview, {
    projectTitle: '项目A',
    premise: '一个关于旧档案的悬疑故事。',
    episodeTitle: '档案室',
    episodeSummary: '主角第一次接触关键线索。',
    outlineDoc: {
      projectTitle: '项目A',
      premise: '一个关于旧档案的悬疑故事。',
      storyArc: [
        {
          title: '档案室',
          summary: '主角第一次接触关键线索。',
        },
      ],
    },
  });
});

test('findPlannerContextWithDeps short-circuits when episode is not owned', async () => {
  const result = await __testables.findPlannerContextWithDeps(
    'project-1',
    'episode-1',
    'user-1',
    {
      findOwnedEpisode: async () => null,
      prisma: {
        plannerSession: {
          findFirst: async () => {
            throw new Error('should not query planner session');
          },
        },
        plannerRefinementVersion: {
          count: async () => {
            throw new Error('should not count refinement versions');
          },
        },
      } as never,
    },
  );

  assert.deepEqual(result, {
    episode: null,
    plannerSession: null,
    refinementCount: 0,
  });
});

test('confirmPlannerOutlineVersionWithDeps confirms the outline and advances workspace target stage to refinement', async () => {
  let syncCall: Record<string, unknown> | null = null;
  let sessionUpdate: { status?: unknown; outlineConfirmedAt?: unknown } | null = null;
  let outlineUpdate: { isActive?: unknown; isConfirmed?: unknown } | null = null;
  let transitionMessage: { contentJson?: unknown } | null = null;

  const result = await __testables.confirmPlannerOutlineVersionWithDeps(
    {
      projectId: 'project-1',
      episodeId: 'episode-1',
      userId: 'user-1',
      versionId: 'outline-1',
    },
    {
      findPlannerContext: (async () => ({
        episode: {
          id: 'episode-1',
          project: {
            id: 'project-1',
            status: 'PLANNING',
            title: '项目A',
            contentMode: 'single',
            currentEpisodeId: 'episode-1',
          },
        },
        plannerSession: {
          id: 'session-1',
          outlineConfirmedAt: null,
        },
        refinementCount: 0,
      })) as never,
      syncOutlinePreviewToWorkspace: async (args) => {
        syncCall = args as unknown as Record<string, unknown>;
      },
      prisma: {
        plannerOutlineVersion: {
          findFirst: async () => ({
            id: 'outline-1',
            outlineDocJson: {
              projectTitle: '项目A',
              premise: '一个关于旧档案的悬疑故事。',
              storyArc: [
                {
                  title: '档案室',
                  summary: '主角第一次接触关键线索。',
                },
              ],
            },
          }),
        },
        plannerSession: {} as never,
        plannerRefinementVersion: {} as never,
        $transaction: async (callback: (tx: never) => Promise<void>) =>
          callback({
            plannerOutlineVersion: {
              updateMany: async () => null,
              update: async ({ data }: { data: Record<string, unknown> }) => {
                outlineUpdate = data;
                return null;
              },
            },
            plannerSession: {
              update: async ({ data }: { data: Record<string, unknown> }) => {
                sessionUpdate = data;
                return null;
              },
            },
            plannerMessage: {
              create: async ({ data }: { data: Record<string, unknown> }) => {
                transitionMessage = data;
                return null;
              },
            },
            project: {
              update: async () => null,
            },
            episode: {
              update: async () => null,
            },
            run: {
              findFirst: async () => null,
              update: async () => null,
            },
          } as never),
      } as never,
    },
  );

  assert.equal(result.ok, true);
  if (!result.ok) {
    return;
  }
  assert.equal(result.data.outlineVersionId, 'outline-1');
  assert.equal(result.data.isConfirmed, true);
  assert.ok(result.data.confirmedAt);
  assert.equal((outlineUpdate as { isActive?: unknown } | null)?.isActive, true);
  assert.equal((outlineUpdate as { isConfirmed?: unknown } | null)?.isConfirmed, true);
  assert.equal((sessionUpdate as { status?: unknown } | null)?.status, 'READY');
  assert.ok((sessionUpdate as { outlineConfirmedAt?: unknown } | null)?.outlineConfirmedAt instanceof Date);
  assert.equal(((transitionMessage as { contentJson?: unknown } | null)?.contentJson as { transition?: string } | undefined)?.transition, 'outline_confirmed');
  assert.equal((syncCall as { targetStage?: unknown } | null)?.targetStage, 'refinement');
  assert.equal((syncCall as { outlineVersionId?: unknown } | null)?.outlineVersionId, 'outline-1');
});
