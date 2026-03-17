import assert from 'node:assert/strict';
import test from 'node:test';

import { buildCreationBootstrap, selectCreationEpisodeId } from './creation-api-bootstrap';

test('creation api server selects current episode first and falls back to the first episode', () => {
  assert.equal(
    selectCreationEpisodeId({
      id: 'project-1',
      title: '项目',
      brief: null,
      contentMode: 'series',
      status: 'READY',
      currentEpisodeId: 'episode-current',
      episodes: [{ id: 'episode-1', episodeNo: 1, title: '第 1 集', status: 'READY' }],
    }),
    'episode-current',
  );

  assert.equal(
    selectCreationEpisodeId({
      id: 'project-1',
      title: '项目',
      brief: null,
      contentMode: 'series',
      status: 'READY',
      currentEpisodeId: null,
      episodes: [{ id: 'episode-1', episodeNo: 1, title: '第 1 集', status: 'READY' }],
    }),
    'episode-1',
  );
});

test('creation api server buildCreationBootstrap preserves runtimeApi ids from project and workspace', () => {
  const result = buildCreationBootstrap(
    {
      id: 'project-1',
      title: '项目',
      brief: null,
      contentMode: 'single',
      status: 'READY',
      currentEpisodeId: 'episode-1',
      episodes: [{ id: 'episode-1', episodeNo: 1, title: '第 1 集', status: 'READY' }],
    },
    {
      project: {
        id: 'project-1',
        title: '项目',
        status: 'ready',
      },
      episode: {
        id: 'episode-1',
        episodeNo: 1,
        title: '第 1 集',
        status: 'ready',
      },
      shots: [],
    },
  );

  assert.equal(result.runtimeApi.projectId, 'project-1');
  assert.equal(result.runtimeApi.episodeId, 'episode-1');
  assert.equal(result.studio?.creation.selectedShotId ?? '', '');
});
