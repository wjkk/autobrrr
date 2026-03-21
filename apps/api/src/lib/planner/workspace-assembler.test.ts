import assert from 'node:assert/strict';
import test from 'node:test';

import { assemblePlannerWorkspace } from './workspace-assembler.js';
import type { PlannerWorkspaceSource } from './workspace-query.js';

test('assemblePlannerWorkspace maps planner assets and debug metadata into dto', async () => {
  const source = {
    episode: {
      id: 'episode-1',
      projectId: 'project-1',
      episodeNo: 1,
      title: '第1集',
      summary: 'summary',
      status: 'PLANNING',
      activePlannerSessionId: 'session-1',
      createdAt: new Date('2026-03-21T00:00:00.000Z'),
      updatedAt: new Date('2026-03-21T00:00:00.000Z'),
      project: {
        id: 'project-1',
        title: '夜航者',
        status: 'PLANNING',
        contentMode: 'SERIES',
        currentEpisodeId: 'episode-1',
        creationConfig: null,
      },
    },
    plannerSession: {
      id: 'session-1',
      status: 'IDLE',
      outlineConfirmedAt: new Date('2026-03-21T00:00:00.000Z'),
      createdAt: new Date('2026-03-21T00:00:00.000Z'),
      updatedAt: new Date('2026-03-21T00:01:00.000Z'),
    },
    latestPlannerRun: null,
    messages: [],
    activeOutline: null,
    outlineVersions: [],
    activeRefinement: {
      id: 'ref-1',
      versionNumber: 3,
      triggerType: 'debug_apply',
      sourceOutlineVersionId: 'outline-1',
      sourceRefinementVersionId: null,
      status: 'READY',
      documentTitle: '终稿',
      assistantMessage: 'done',
      generatedText: 'text',
      structuredDocJson: {},
      inputSnapshotJson: { appliedFromDebugRunId: 'debug-run-1' },
      isConfirmed: false,
      confirmedAt: null,
      createdAt: new Date('2026-03-21T00:02:00.000Z'),
      subAgentProfile: { id: 'agent-1', slug: 'default', subtype: 'writer', displayName: 'Writer' },
      subjects: [{ id: 'subject-1', name: '主角', role: '记者', appearance: '', personality: '', prompt: '', negativePrompt: '', referenceAssetIdsJson: ['asset-1'], generatedAssetIdsJson: [], sortOrder: 1, editable: true }],
      scenes: [],
      shotScripts: [],
      stepAnalysis: [{ id: 'step-1', stepKey: 'subject', title: '主体', status: 'READY', detailJson: {}, sortOrder: 1 }],
    },
    refinementVersions: [{ id: 'ref-1', versionNumber: 3, triggerType: 'debug_apply', sourceOutlineVersionId: 'outline-1', sourceRefinementVersionId: null, status: 'READY', documentTitle: '终稿', isActive: true, isConfirmed: false, confirmedAt: null, createdAt: new Date('2026-03-21T00:02:00.000Z'), inputSnapshotJson: { appliedFromDebugRunId: 'debug-run-1' } }],
  } as unknown as PlannerWorkspaceSource;

  const dto = await assemblePlannerWorkspace(source, {
    loadAssets: async () => ([{
      id: 'asset-1',
      ownerUserId: 'user-1',
      projectId: 'project-1',
      episodeId: 'episode-1',
      mediaKind: 'IMAGE',
      sourceKind: 'UPLOAD',
      fileName: 'subject.png',
      mimeType: 'image/png',
      fileSizeBytes: 100,
      width: 100,
      height: 100,
      durationMs: null,
      storageKey: 'asset-1',
      sourceUrl: 'https://cdn.example.com/subject.png',
      metadataJson: null,
      createdAt: new Date('2026-03-21T00:00:00.000Z'),
      updatedAt: new Date('2026-03-21T00:00:00.000Z'),
    }] as any),
  });

  assert.equal(dto.plannerSession?.stage, 'refinement');
  assert.equal(dto.plannerSession?.runtimeStatus, 'refinement_ready');
  assert.equal(dto.activeRefinement?.debugApplySource?.debugRunId, 'debug-run-1');
  assert.equal(dto.activeRefinement?.subjects[0]?.referenceAssets[0]?.id, 'asset-1');
  assert.equal(dto.refinementVersions[0]?.debugApplySource?.debugRunId, 'debug-run-1');
});
