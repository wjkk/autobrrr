import assert from 'node:assert/strict';
import test from 'node:test';

import { buildPublishStudio } from './publish-page-bootstrap';

test('buildPublishStudio maps publish workspace summary into publish page draft', () => {
  const result = buildPublishStudio(
    {
      id: 'project-1',
      title: '项目A',
      brief: '项目简介',
      contentMode: 'single',
      status: 'PUBLISHING',
      currentEpisodeId: 'episode-1',
      episodes: [
        {
          id: 'episode-1',
          episodeNo: 1,
          title: '第1集',
          status: 'READY',
        },
      ],
    },
    {
      project: {
        id: 'project-1',
        title: '项目A',
        status: 'PUBLISHING',
      },
      episode: {
        id: 'episode-1',
        episodeNo: 1,
        title: '第1集',
        status: 'READY',
      },
      summary: {
        totalShots: 2,
        publishableShotCount: 2,
        readyToPublish: true,
      },
      shots: [
        {
          id: 'shot-1',
          sequenceNo: 1,
          title: '镜头一',
          status: 'success',
          activeVersionId: 'version-1',
          activeVersion: {
            id: 'version-1',
            label: 'V1',
            mediaKind: 'video',
            status: 'active',
          },
        },
        {
          id: 'shot-2',
          sequenceNo: 2,
          title: '镜头二',
          status: 'success',
          activeVersionId: 'version-2',
          activeVersion: {
            id: 'version-2',
            label: 'V2',
            mediaKind: 'video',
            status: 'active',
          },
        },
      ],
    },
  );

  assert.equal(result.project.status, 'export_ready');
  assert.equal(result.publish.draft.title, '项目A');
  assert.equal(result.publish.draft.tag, 'Ready');
  assert.equal(result.publish.draft.script, '镜头一 / 镜头二');
});
