import assert from 'node:assert/strict';
import test from 'node:test';

import { buildPlannerBootstrap, selectPlannerEpisodeId } from './planner-api-bootstrap';

test('planner api bootstrap selects current episode first and falls back to first episode', () => {
  assert.equal(
    selectPlannerEpisodeId({
      id: 'project-1',
      title: '项目',
      brief: 'brief',
      contentMode: 'series',
      status: 'READY',
      currentEpisodeId: 'episode-current',
      episodes: [{ id: 'episode-1', episodeNo: 1, title: '第 1 集', status: 'READY' }],
    }),
    'episode-current',
  );

  assert.equal(
    selectPlannerEpisodeId({
      id: 'project-1',
      title: '项目',
      brief: 'brief',
      contentMode: 'series',
      status: 'READY',
      currentEpisodeId: null,
      episodes: [{ id: 'episode-1', episodeNo: 1, title: '第 1 集', status: 'READY' }],
    }),
    'episode-1',
  );

  assert.equal(
    selectPlannerEpisodeId({
      id: 'project-1',
      title: '项目',
      brief: 'brief',
      contentMode: 'single',
      status: 'READY',
      currentEpisodeId: null,
      episodes: [],
    }),
    null,
  );
});

test('planner api bootstrap prefers refinement doc then outline preview and latest run fallback', () => {
  const project = {
    id: 'project-1',
    title: '项目',
    brief: 'brief',
    contentMode: 'series' as const,
    status: 'READY',
    currentEpisodeId: 'episode-1',
    episodes: [{ id: 'episode-1', episodeNo: 1, title: '第 1 集', status: 'READY' }],
  };
  const refinementStructuredDoc = {
    projectTitle: '项目',
    episodeTitle: 'refinement',
    episodeCount: 1,
    pointCost: 38,
    summaryBullets: ['refinement'],
    highlights: [],
    styleBullets: [],
    subjectBullets: [],
    subjects: [],
    sceneBullets: [],
    scenes: [],
    scriptSummary: [],
    acts: [],
  };
  const latestRunStructuredDoc = {
    projectTitle: '项目',
    episodeTitle: 'latest',
    episodeCount: 1,
    pointCost: 38,
    summaryBullets: ['latest'],
    highlights: [],
    styleBullets: [],
    subjectBullets: [],
    subjects: [],
    sceneBullets: [],
    scenes: [],
    scriptSummary: [],
    acts: [],
  };

  const workspace = {
    project: {
      id: 'project-1',
      title: '项目',
      status: 'ready',
      contentMode: 'series' as const,
      currentEpisodeId: 'episode-1',
      creationConfig: null,
    },
    episode: {
      id: 'episode-1',
      episodeNo: 1,
      title: '第 1 集',
      summary: 'summary',
      status: 'ready',
    },
    plannerSession: {
      id: 'session-1',
      status: 'ready',
      stage: 'refinement' as const,
      outlineConfirmedAt: null,
      createdAt: '2026-03-17T00:00:00.000Z',
      updatedAt: '2026-03-17T00:00:00.000Z',
    },
    latestPlannerRun: {
      id: 'run-1',
      status: 'succeeded',
      executionMode: 'live' as const,
      providerStatus: 'completed',
      generatedText: 'generated',
      structuredDoc: latestRunStructuredDoc,
      errorCode: null,
      errorMessage: null,
      createdAt: '2026-03-17T00:00:00.000Z',
      finishedAt: '2026-03-17T00:00:00.000Z',
    },
    activeOutline: {
      id: 'outline-1',
      versionNumber: 1,
      triggerType: 'generate_outline',
      status: 'succeeded',
      documentTitle: 'outline',
      assistantMessage: null,
      generatedText: null,
      outlineDoc: {
        projectTitle: '项目',
        contentType: 'drama' as const,
        subtype: 'series',
        format: 'series' as const,
        episodeCount: 1,
        genre: '悬疑',
        toneStyle: ['冷静'],
        premise: 'premise',
        mainCharacters: [],
        storyArc: [],
        constraints: [],
        openQuestions: [],
      },
      isConfirmed: true,
      confirmedAt: '2026-03-17T00:00:00.000Z',
      isActive: true,
      createdAt: '2026-03-17T00:00:00.000Z',
    },
    activeRefinement: {
      id: 'refinement-1',
      versionNumber: 2,
      triggerType: 'generate_doc',
      status: 'succeeded',
      documentTitle: 'refinement',
      assistantMessage: null,
      generatedText: 'generated',
      structuredDoc: refinementStructuredDoc,
      sourceOutlineVersionId: 'outline-1',
      sourceRefinementVersionId: null,
      isConfirmed: true,
      confirmedAt: '2026-03-17T00:00:00.000Z',
      subAgentProfile: null,
      subjects: [],
      scenes: [],
      shotScripts: [],
      stepAnalysis: [],
      createdAt: '2026-03-17T00:00:00.000Z',
    },
    outlineVersions: [],
    refinementVersions: [],
    messages: [],
  };

  const withRefinement = buildPlannerBootstrap(project, workspace);
  assert.equal(withRefinement.runtimeApi?.projectId, 'project-1');
  assert.equal(withRefinement.runtimeApi?.episodeId, 'episode-1');
  assert.equal(withRefinement.initialGeneratedText, 'generated');
  assert.equal(withRefinement.initialPlannerReady, true);
  assert.equal(withRefinement.initialWorkspace?.episode.id, 'episode-1');
  assert.equal(withRefinement.initialStructuredDoc?.episodeTitle, 'refinement');

  const outlineOnly = buildPlannerBootstrap(project, {
    ...workspace,
    activeRefinement: null,
    latestPlannerRun: {
      ...workspace.latestPlannerRun,
      structuredDoc: null,
    },
  });
  assert.equal(outlineOnly.initialStructuredDoc?.episodeTitle, '项目·大纲');

  const latestOnly = buildPlannerBootstrap(project, {
    ...workspace,
    activeOutline: null,
    activeRefinement: null,
  });
  assert.equal(latestOnly.initialStructuredDoc?.episodeTitle, 'latest');
});
