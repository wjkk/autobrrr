import assert from 'node:assert/strict';
import test from 'node:test';

import { buildPlannerPageDataFromApi } from './planner-page-bootstrap';

test('buildPlannerPageDataFromApi maps active episode summary and runtime text messages', () => {
  const result = buildPlannerPageDataFromApi(
    {
      id: 'project-1',
      title: '项目A',
      brief: '项目简介',
      contentMode: 'series',
      status: 'READY',
      currentEpisodeId: 'episode-1',
      episodes: [
        {
          id: 'episode-1',
          episodeNo: 1,
          title: '第1集',
          status: 'READY',
        },
        {
          id: 'episode-2',
          episodeNo: 2,
          title: '第2集',
          status: 'READY',
        },
      ],
    },
    {
      project: {
        id: 'project-1',
        title: '项目A',
        status: 'READY',
        contentMode: 'series',
        currentEpisodeId: 'episode-1',
        creationConfig: null,
      },
      episode: {
        id: 'episode-1',
        episodeNo: 1,
        title: '第1集',
        summary: '当前集摘要',
        status: 'READY',
      },
      plannerSession: null,
      latestPlannerRun: null,
      messages: [
        {
          id: 'msg-1',
          role: 'assistant',
          messageType: 'assistant_text',
          content: {
            text: '请确认主体设定',
          },
          refinementVersionId: null,
          createdAt: '2026-03-17T10:00:00.000Z',
        },
        {
          id: 'msg-2',
          role: 'assistant',
          messageType: 'assistant_text',
          content: {
            text: '   ',
          },
          refinementVersionId: null,
          createdAt: '2026-03-17T10:01:00.000Z',
        },
      ],
    },
  );

  assert.equal(result.project.status, 'ready_for_storyboard');
  assert.equal(result.episodes[0]?.summary, '当前集摘要');
  assert.equal(result.episodes[1]?.summary, '待补充当前集剧情摘要。');
  assert.equal(result.planner.submittedRequirement, '当前集摘要');
  assert.deepEqual(result.planner.messages, [
    {
      id: 'msg-1',
      role: 'assistant',
      content: '请确认主体设定',
    },
  ]);
  assert.equal(result.creation.points, 120);
});
