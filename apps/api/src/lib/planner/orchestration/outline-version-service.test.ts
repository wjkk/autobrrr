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
