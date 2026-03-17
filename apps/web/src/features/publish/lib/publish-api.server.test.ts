import assert from 'node:assert/strict';
import test from 'node:test';

import { buildPublishBootstrap, selectPublishEpisodeId } from './publish-api-bootstrap';

test('publish api server selects current episode first and falls back to first episode', () => {
  assert.equal(
    selectPublishEpisodeId({
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
    selectPublishEpisodeId({
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

test('publish api server buildPublishBootstrap returns initial workspace and runtime ids', () => {
  const workspace = {
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
    summary: {
      totalShots: 2,
      publishableShotCount: 1,
      readyToPublish: false,
    },
    shots: [],
  };

  const result = buildPublishBootstrap(
    {
      id: 'project-1',
      title: '项目',
      brief: null,
      contentMode: 'single',
      status: 'READY',
      currentEpisodeId: 'episode-1',
      episodes: [{ id: 'episode-1', episodeNo: 1, title: '第 1 集', status: 'READY' }],
    },
    workspace,
  );

  assert.equal(result.runtimeApi?.projectId, 'project-1');
  assert.equal(result.runtimeApi?.episodeId, 'episode-1');
  assert.equal(result.initialPublishWorkspace, workspace);
});
