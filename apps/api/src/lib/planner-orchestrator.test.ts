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
    currentOutlineDoc: {
      projectTitle: '项目A',
      contentType: 'drama',
      subtype: '悬疑',
      format: 'single',
      episodeCount: 1,
      genre: '校园悬疑',
      toneStyle: ['紧张', '克制'],
      premise: '学生记者重返档案室。',
      mainCharacters: [
        { id: 'c1', name: '林夏', role: '学生记者', description: '执着追查失踪案。' },
      ],
      storyArc: [
        { episodeNo: 1, title: '夜探档案室', summary: '林夏深夜进入档案室寻找线索。' },
      ],
      constraints: ['保持单集强悬念'],
      openQuestions: [],
    },
    rerunContext: {
      scopeType: 'subject',
      targetSummary: '主体：林夏',
      entityContext: {
        scopeType: 'subject',
        targetSubject: { title: '林夏', prompt: '学生记者，冷静执着。' },
      },
    },
    targetVideoModelFamilySlug: 'seedance-2-0',
    targetVideoModelSummary: '支持多镜头叙事，并要求音效描述内联。',
  });

  assert.match(refinement.promptText, /当前目标视频模型：seedance-2-0/);
  assert.match(refinement.promptText, /目标视频模型能力摘要：支持多镜头叙事/);
  assert.match(refinement.promptText, /大纲继承提示：/);
  assert.match(refinement.promptText, /局部重跑目标：/);
  assert.match(refinement.promptText, /局部重跑摘要：主体：林夏/);
  assert.match(refinement.promptSnapshot.developerPromptFinal, /必须显式适配目标视频模型能力摘要/);
  assert.match(refinement.promptSnapshot.developerPromptFinal, /每一项都必须显式包含 entityType/);
  assert.match(refinement.promptSnapshot.developerPromptFinal, /不要退化成“主角”“配角”/);
  assert.match(refinement.promptSnapshot.developerPromptFinal, /场景地点绝不能出现在 subjects/);
  assert.match(refinement.promptSnapshot.developerPromptFinal, /人物、动物、道具绝不能出现在 scenes/);
  assert.match(refinement.promptSnapshot.developerPromptFinal, /局部重跑硬性要求/);
  assert.match(refinement.promptSnapshot.developerPromptFinal, /如果需求明确是三幕结构，不要压缩成单幕/);
  assert.match(refinement.promptSnapshot.developerPromptFinal, /不要只写“第一幕”“第1幕”“分镜01”/);
  assert.match(refinement.promptSnapshot.developerPromptFinal, /不要直接复读用户原始需求/);
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
  assert.match(outline.promptSnapshot.developerPromptFinal, /mainCharacters 只能放人物、动物或关键叙事实体/);
  assert.match(outline.promptSnapshot.developerPromptFinal, /把空间信息写进 storyArc.summary/);
});
