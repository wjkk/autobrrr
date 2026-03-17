import assert from 'node:assert/strict';
import test from 'node:test';

import { buildCreationPageDataFromApi } from './creation-page-bootstrap';

test('buildCreationPageDataFromApi maps finalized shot workspace into creation page data', () => {
  const result = buildCreationPageDataFromApi(
    {
      id: 'project-1',
      title: '项目A',
      brief: '项目简介',
      contentMode: 'single',
      status: 'READY',
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
        status: 'READY',
      },
      episode: {
        id: 'episode-1',
        episodeNo: 1,
        title: '第1集',
        status: 'READY',
      },
      shots: [
        {
          id: 'shot-1',
          sequenceNo: 1,
          title: '镜头一',
          subtitleText: '字幕',
          narrationText: '旁白',
          imagePrompt: '图像提示词',
          motionPrompt: '镜头运动 6s',
          promptJson: {
            mode: 'multi-shot',
          },
          targetVideoModelFamilySlug: 'seedance-2-0',
          materialBindings: [
            {
              id: 'asset-1',
              sourceUrl: 'https://example.com/asset.png',
              fileName: 'asset.png',
              mediaKind: 'image',
              sourceKind: 'generated',
              createdAt: '2026-03-17T10:00:00.000Z',
            },
          ],
          finalizedAt: '2026-03-17T10:00:00.000Z',
          status: 'success',
          latestGenerationRun: {
            id: 'run-1',
            runType: 'VIDEO_GENERATION',
            status: 'completed',
            modelEndpoint: {
              id: 'endpoint-1',
              slug: 'seedance-2-0',
              label: 'Seedance 2.0',
            },
          },
          activeVersionId: 'version-1',
          activeVersion: {
            id: 'version-1',
            label: 'V1',
            mediaKind: 'video',
            status: 'active',
          },
        },
      ],
    },
  );

  assert.equal(result.project.status, 'ready_for_storyboard');
  assert.equal(result.creation.selectedShotId, 'shot-1');
  assert.equal(result.creation.shots[0]?.preferredModel, 'seedance-2-0');
  assert.equal(result.creation.shots[0]?.materials[0]?.id, 'asset-1');
  assert.equal(result.creation.shots[0]?.durationMode, '6s');
});
