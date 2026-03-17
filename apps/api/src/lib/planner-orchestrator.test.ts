import assert from 'node:assert/strict';
import test from 'node:test';

import { buildPlannerGenerationPrompt, resolvePlannerStepDefinitions } from './planner-orchestrator.js';
import type { ResolvedPlannerAgentSelection } from './planner-agent-registry.js';

function createSelection(overrides?: Partial<ResolvedPlannerAgentSelection>): ResolvedPlannerAgentSelection {
  return {
    contentType: '短剧漫剧',
    subtype: '对话剧情',
    agentProfile: {
      id: 'agent-1',
      slug: 'planner-agent',
      displayName: 'Planner Agent',
      defaultSystemPrompt: '系统提示',
      defaultDeveloperPrompt: '开发提示',
      defaultStepDefinitionsJson: [
        {
          id: 'agent-step',
          title: '默认步骤',
          status: 'done',
        },
      ],
    },
    subAgentProfile: {
      id: 'sub-1',
      slug: 'planner-sub-agent',
      displayName: 'Planner Sub Agent',
      systemPromptOverride: '子系统提示',
      developerPromptOverride: '子开发提示',
      stepDefinitionsJson: [
        {
          id: 'sub-step',
          title: '子步骤',
          status: 'running',
        },
      ],
    },
    ...overrides,
  };
}

test('resolvePlannerStepDefinitions prefers sub-agent steps and falls back to agent defaults', () => {
  const preferred = resolvePlannerStepDefinitions(createSelection());
  assert.deepEqual(preferred, [
    {
      id: 'sub-step',
      title: '子步骤',
      status: 'running',
      details: [],
    },
  ]);

  const fallback = resolvePlannerStepDefinitions(
    createSelection({
      subAgentProfile: {
        id: 'sub-1',
        slug: 'planner-sub-agent',
        displayName: 'Planner Sub Agent',
        systemPromptOverride: null,
        developerPromptOverride: null,
        stepDefinitionsJson: [],
      },
    }),
  );
  assert.deepEqual(fallback, [
    {
      id: 'agent-step',
      title: '默认步骤',
      status: 'done',
      details: [],
    },
  ]);
});

test('buildPlannerGenerationPrompt injects target model guidance only for refinement stage', () => {
  const refinement = buildPlannerGenerationPrompt({
    selection: createSelection(),
    targetStage: 'refinement',
    userPrompt: '细化剧情',
    projectTitle: '项目A',
    episodeTitle: '第1集',
    priorMessages: [],
    currentStructuredDoc: {
      projectTitle: '项目A',
      episodeTitle: '第1集',
      summaryBullets: [],
      subjects: [],
      scenes: [],
      acts: [],
    },
    targetVideoModelFamilySlug: 'seedance-2-0',
    targetVideoModelSummary: '支持多镜头叙事，并要求音效描述内联。',
  });

  assert.match(refinement.promptText, /当前目标视频模型：seedance-2-0/);
  assert.match(refinement.promptText, /目标视频模型能力摘要：支持多镜头叙事/);
  assert.match(refinement.promptSnapshot.developerPromptFinal, /必须显式适配目标视频模型能力摘要/);
  assert.equal(refinement.promptArtifact.targetVideoModelFamilySlug, 'seedance-2-0');
  assert.equal(refinement.promptArtifact.targetVideoModelSummary, '支持多镜头叙事，并要求音效描述内联。');
  assert.deepEqual(refinement.stepDefinitions, [
    {
      id: 'sub-step',
      title: '子步骤',
      status: 'running',
      details: [],
    },
  ]);

  const outline = buildPlannerGenerationPrompt({
    selection: createSelection(),
    targetStage: 'outline',
    userPrompt: '生成大纲',
    projectTitle: '项目A',
    episodeTitle: '第1集',
    priorMessages: [],
    currentOutlineDoc: {
      projectTitle: '项目A',
    },
    targetVideoModelFamilySlug: 'seedance-2-0',
    targetVideoModelSummary: '支持多镜头叙事，并要求音效描述内联。',
  });

  assert.doesNotMatch(outline.promptText, /目标视频模型能力摘要/);
  assert.doesNotMatch(outline.promptSnapshot.developerPromptFinal, /必须显式适配目标视频模型能力摘要/);
});
