import test from 'node:test';
import assert from 'node:assert/strict';

import { __testables } from './workspace-shared.js';

test('requireOwnedEpisodeWithDeps queries episode ownership with project and creationConfig context', async () => {
  let captured: Record<string, unknown> | null = null;
  const episode = { id: 'episode-1', project: { id: 'project-1' } };
  const findEpisode = async (args?: Record<string, unknown>) => {
    captured = args ?? null;
    return episode as never;
  };

  const result = await __testables.requireOwnedEpisodeWithDeps(
    'project-1',
    'episode-1',
    'user-1',
    {
      findEpisode,
    },
  );

  assert.equal(result, episode);
  assert.deepEqual(captured, {
    where: {
      id: 'episode-1',
      projectId: 'project-1',
      project: {
        createdById: 'user-1',
      },
    },
    include: {
      project: {
        select: {
          id: true,
          title: true,
          status: true,
          contentMode: true,
          currentEpisodeId: true,
          creationConfig: {
            select: {
              selectedTab: true,
              selectedSubtype: true,
            },
          },
        },
      },
    },
  });
});
