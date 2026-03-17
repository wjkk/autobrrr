import assert from 'node:assert/strict';
import test from 'node:test';

import { __testables } from './planner-debug-query-service.js';

test('mapPlannerDebugRunListItem normalizes execution mode and timestamps', () => {
  const result = __testables.mapPlannerDebugRunListItem({
    id: 'run-1',
    compareGroupKey: 'group-1',
    compareLabel: 'A',
    executionMode: 'LIVE',
    createdAt: new Date('2026-03-17T10:00:00.000Z'),
    errorMessage: null,
    agentProfile: {
      id: 'agent-1',
      slug: 'agent-1',
      displayName: 'Agent',
    },
    subAgentProfile: {
      id: 'sub-1',
      slug: 'sub-1',
      subtype: '对话剧情',
      displayName: 'Sub Agent',
    },
  });

  assert.equal(result.executionMode, 'live');
  assert.equal(result.createdAt, '2026-03-17T10:00:00.000Z');
  assert.equal(result.compareGroupKey, 'group-1');
});

test('mapPlannerDebugRunDetail exposes replay source, prompt snapshot, usage and diff summary', () => {
  const result = __testables.mapPlannerDebugRunDetail({
    id: 'run-1',
    compareGroupKey: 'group-1',
    compareLabel: 'A',
    executionMode: 'FALLBACK',
    createdAt: new Date('2026-03-17T10:00:00.000Z'),
    errorMessage: 'fallback',
    inputJson: {
      replaySourceRunId: 'run-0',
      targetStage: 'refinement',
      partialRerunScope: 'subject_only',
      promptSnapshot: {
        systemPromptFinal: 'system',
        developerPromptFinal: 'developer',
        messagesFinal: [
          {
            role: 'user',
            content: 'hello',
          },
        ],
        inputContextSnapshot: {
          projectTitle: '项目A',
        },
      },
      currentStructuredDoc: {
        projectTitle: '项目A',
        episodeTitle: '第1集',
        summaryBullets: [],
        subjects: [
          { id: 'subject-1', name: '旧主体' },
        ],
        scenes: [],
        acts: [],
      },
      targetEntity: {
        subjectId: 'subject-1',
      },
    },
    modelSnapshotJson: {
      endpoint: {
        costConfig: {
          inputPer1kTokens: 0.01,
          outputPer1kTokens: 0.02,
          currency: 'CNY',
        },
      },
    },
    finalPrompt: 'a'.repeat(40),
    rawText: 'b'.repeat(20),
    providerOutputJson: {
      usage: {
        input_tokens: 12,
        output_tokens: 8,
        total_tokens: 20,
      },
    },
    assistantPackageJson: {
      structuredDoc: {
        projectTitle: '项目A',
        episodeTitle: '第1集',
        summaryBullets: [],
        subjects: [
          { id: 'subject-1', name: '新主体' },
        ],
        scenes: [],
        acts: [],
      },
    },
    agentProfile: {
      id: 'agent-1',
      slug: 'agent-1',
      displayName: 'Agent',
    },
    subAgentProfile: {
      id: 'sub-1',
      slug: 'sub-1',
      subtype: '对话剧情',
      displayName: 'Sub Agent',
    },
  });

  assert.equal(result.executionMode, 'fallback');
  assert.equal(result.replaySourceRunId, 'run-0');
  assert.equal(result.promptSnapshot?.systemPromptFinal, 'system');
  assert.equal(result.usage.promptTokens, 12);
  assert.equal(result.usage.completionTokens, 8);
  assert.equal(result.usage.totalTokens, 20);
  assert.equal(result.usage.currency, 'CNY');
  assert.ok(Array.isArray(result.diffSummary));
});
