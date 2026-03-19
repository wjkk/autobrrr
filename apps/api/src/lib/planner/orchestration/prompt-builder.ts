import type { ResolvedPlannerAgentSelection } from '../agent/registry.js';
import type { PlannerStepAnalysisItem } from '../agent/schemas.js';
import { buildPlannerStructuredDocSchemaExample } from '../doc/planner-doc.js';
import { buildPlannerOutlineRefinementHints, type PlannerOutlineRefinementHints } from '../doc/outline-doc.js';

export interface PlannerRerunPromptContext {
  scopeType: 'subject' | 'scene' | 'shot' | 'act';
  targetSummary: string;
  entityContext: Record<string, unknown>;
}

function normalizeSteps(rawValue: unknown): PlannerStepAnalysisItem[] {
  if (!Array.isArray(rawValue)) {
    return [];
  }

  return rawValue
    .map((value, index) => {
      const record = value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
      const id = typeof record.id === 'string' && record.id.trim() ? record.id.trim() : `step-${index + 1}`;
      const title = typeof record.title === 'string' && record.title.trim() ? record.title.trim() : null;
      if (!title) {
        return null;
      }

      const status = typeof record.status === 'string' && record.status.trim() ? record.status.trim() : 'done';
      const details = Array.isArray(record.details)
        ? record.details.filter((detail): detail is string => typeof detail === 'string' && detail.trim().length > 0)
        : [];

      return {
        id,
        title,
        status: status === 'pending' || status === 'running' || status === 'failed' ? status : 'done',
        details,
      } satisfies PlannerStepAnalysisItem;
    })
    .filter((value): value is PlannerStepAnalysisItem => value !== null);
}

export function resolvePlannerStepDefinitions(selection: ResolvedPlannerAgentSelection) {
  const subSteps = normalizeSteps(selection.subAgentProfile.stepDefinitionsJson);
  if (subSteps.length > 0) {
    return subSteps;
  }

  return normalizeSteps(selection.agentProfile.defaultStepDefinitionsJson);
}

export interface PlannerPromptSnapshot {
  systemPromptFinal: string;
  developerPromptFinal: string;
  messagesFinal: Array<{
    role: 'system' | 'developer' | 'user' | 'assistant';
    content: string;
  }>;
  inputContextSnapshot: Record<string, unknown>;
  modelSelectionSnapshot?: Record<string, unknown>;
}

function buildPlannerUserContextSections(args: {
  projectTitle: string;
  episodeTitle: string;
  contentMode?: string | null;
  scriptContent?: string | null;
  selectedSubjectName?: string | null;
  selectedStyleName?: string | null;
  selectedImageModelLabel?: string | null;
  targetStage: 'outline' | 'refinement';
  targetVideoModelFamilySlug?: string | null;
  targetVideoModelSummary?: string | null;
  outlineRefinementHints?: PlannerOutlineRefinementHints | null;
  currentOutlineDoc?: unknown;
  currentStructuredDoc?: unknown;
  rerunContext?: PlannerRerunPromptContext | null;
  stepDefinitions: PlannerStepAnalysisItem[];
  userPrompt: string;
}) {
  return [
    `项目标题：${args.projectTitle}`,
    `集标题：${args.episodeTitle}`,
    args.contentMode ? `项目模式：${args.contentMode}` : '',
    args.scriptContent ? `剧本原文：${args.scriptContent}` : '',
    args.selectedSubjectName ? `当前主体：${args.selectedSubjectName}` : '',
    args.selectedStyleName ? `当前画风：${args.selectedStyleName}` : '',
    args.selectedImageModelLabel ? `当前主体图模型：${args.selectedImageModelLabel}` : '',
    args.targetStage === 'refinement' && args.targetVideoModelFamilySlug
      ? `当前目标视频模型：${args.targetVideoModelFamilySlug}`
      : '',
    args.targetStage === 'refinement' && args.targetVideoModelSummary
      ? `目标视频模型能力摘要：${args.targetVideoModelSummary}`
      : '',
    args.targetStage === 'refinement' && args.outlineRefinementHints
      ? `大纲继承提示：${JSON.stringify(args.outlineRefinementHints)}`
      : '',
    args.currentOutlineDoc && args.targetStage === 'outline'
      ? `当前激活大纲：${JSON.stringify(args.currentOutlineDoc)}`
      : '',
    args.currentStructuredDoc ? `当前激活文档：${JSON.stringify(args.currentStructuredDoc)}` : '',
    args.rerunContext ? `局部重跑目标：${JSON.stringify(args.rerunContext.entityContext)}` : '',
    args.rerunContext ? `局部重跑摘要：${args.rerunContext.targetSummary}` : '',
    `步骤定义：${JSON.stringify(args.stepDefinitions)}`,
    `用户最新需求：${args.userPrompt}`,
  ]
    .filter(Boolean)
    .join('\n');
}

function buildPlannerPromptSnapshot(args: {
  selection: ResolvedPlannerAgentSelection;
  targetStage: 'outline' | 'refinement';
  userPrompt: string;
  projectTitle: string;
  episodeTitle: string;
  contentMode?: string | null;
  scriptContent?: string | null;
  selectedSubjectName?: string | null;
  selectedStyleName?: string | null;
  selectedImageModelLabel?: string | null;
  priorMessages: Array<{ role: string; text: string }>;
  currentOutlineDoc?: unknown;
  currentStructuredDoc?: unknown;
  rerunContext?: PlannerRerunPromptContext | null;
  targetVideoModelFamilySlug?: string | null;
  targetVideoModelSummary?: string | null;
  modelSelectionSnapshot?: Record<string, unknown>;
  stepDefinitions: PlannerStepAnalysisItem[];
}) {
  const outlineRefinementHints =
    args.targetStage === 'refinement'
      ? buildPlannerOutlineRefinementHints(args.currentOutlineDoc)
      : null;
  const refinementStructuredDocSchemaExample = buildPlannerStructuredDocSchemaExample({
    projectTitle: args.projectTitle,
    episodeTitle: args.episodeTitle,
    targetVideoModelFamilySlug: args.targetVideoModelFamilySlug ?? null,
  });
  const refinementAssistantPackageExample = {
    stage: 'refinement',
    assistantMessage: '已完成细化文档生成。',
    stepAnalysis: args.stepDefinitions.length > 0
      ? args.stepDefinitions.map((step) => ({
          id: step.id,
          title: step.title,
          status: step.status,
          details: step.details,
        }))
      : [{ id: 'step-1', title: '整理剧情', status: 'done', details: ['补齐细化文档'] }],
    documentTitle: args.projectTitle,
    structuredDoc: refinementStructuredDocSchemaExample,
    operations: {
      replaceDocument: true,
      generateStoryboard: false,
      confirmOutline: false,
    },
  };
  const systemPromptFinal = [
    '你是短片策划阶段的专业编排代理。',
    `当前目标阶段：${args.targetStage === 'outline' ? '策划剧本大纲' : '细化剧情内容'}`,
    `当前一级类型：${args.selection.contentType}`,
    `当前二级子类型：${args.selection.subtype}`,
    args.selection.agentProfile.defaultSystemPrompt,
    args.selection.subAgentProfile.systemPromptOverride ?? '',
  ]
    .filter(Boolean)
    .join('\n');

  const developerPromptFinal = [
    args.selection.agentProfile.defaultDeveloperPrompt ?? '',
    args.selection.subAgentProfile.developerPromptOverride ?? '',
    '请输出严格 JSON，不要输出 markdown，不要输出额外解释。',
    args.targetStage === 'refinement' && args.targetVideoModelSummary
      ? `细化剧情内容时必须显式适配目标视频模型能力摘要，不要输出与该模型能力冲突的镜头组织。${args.targetVideoModelSummary}`
      : '',
    args.targetStage === 'outline'
      ? [
          '输出格式必须包含 stage、assistantMessage、documentTitle、outlineDoc、operations。outlineDoc 用于可确认的大纲。',
          '大纲阶段硬性要求：',
          '- mainCharacters 只能放人物、动物或关键叙事实体，不要把地点、场所、空间写进 mainCharacters。',
          '- storyArc 必须围绕事件推进组织，不要把纯地点名或泛化占位词当成剧情标题。',
          '- 如果后续 refinement 需要识别关键空间，请把空间信息写进 storyArc.summary，而不是误写到 mainCharacters。',
        ].join('\n')
      : '输出格式必须包含 stage、assistantMessage、stepAnalysis、documentTitle、structuredDoc、operations。structuredDoc 用于右侧细化文档。',
    args.targetStage === 'refinement'
      ? [
          '细化阶段硬性要求：',
          '- stepAnalysis 必须是数组，不允许输出对象。',
          '- operations 必须是对象，且只包含 replaceDocument / generateStoryboard / confirmOutline 三个布尔字段。',
          '- structuredDoc 必须严格使用 projectTitle / episodeTitle / episodeCount / pointCost / summaryBullets / highlights / styleBullets / subjectBullets / subjects / sceneBullets / scenes / scriptSummary / acts 这些键。',
          '- 不允许使用“故事梗概”“三幕主体剧情”“场景设定”“分镜剧本（适配模型）”等替代键名。',
          '- 每条 summaryBullets / styleBullets / subjectBullets / sceneBullets 长度不超过 2000 字符。',
          '- 每条 scriptSummary 长度不超过 500 字符。',
          '- 每个 shot.line 长度不超过 1000 字符。',
          '- 返回内容必须可直接通过 schema 校验。',
          '- subjects / scenes 数组内的每一项都必须显式包含 entityType；subjects 里的 entityType 必须是 "subject"，scenes 里的 entityType 必须是 "scene"。',
          '- subjects / subjectBullets 必须优先使用剧情中的具体实体名、职业、身份，不要退化成“主角”“配角”“神秘人”“核心场景”这类泛化占位词；除非用户明确要求抽象占位。',
          '- subjects 只能放人物、动物、道具或关键叙事实体；场景地点绝不能出现在 subjects。',
          '- scenes / sceneBullets 必须给出可落地的具体空间名称与视觉提示，不要只写“核心场景”“过渡场景”。',
          '- scenes 只能放地点、空间、场所；人物、动物、道具绝不能出现在 scenes。',
          '- 如果 entityType 声明与 title / prompt 的语义冲突，后端会按语义校验并纠正；不要故意输出冲突声明。',
          args.rerunContext
            ? [
                '局部重跑硬性要求：',
                `- 当前局部重跑目标类型：${args.rerunContext.scopeType}。`,
                '- 只允许修改目标实体及其必要上下文，不要无差别重写整份 refinement 文档。',
                '- 若目标是 subject / scene，只能同步改动与该实体强相关的 bullets、实体 prompt 和关联镜头表述。',
                '- 若目标是 shot / act，只能同步改动对应镜头/幕及其必要承接，不要重写无关实体设定。',
              ].join('\n')
            : '',
          '- acts 应与当前大纲或用户要求的叙事结构保持一致；如果需求明确是三幕结构，不要压缩成单幕。',
          '- act.title / shot.title 也必须带语义信息，不要只写“第一幕”“第1幕”“分镜01”“分镜1-1”这类纯序号标题；应结合事件、线索或动作命名。',
          '- shots 的 visual / line / voice 必须引用当前 summaryBullets / subjectBullets / scenes 中的具体信息，不要直接复读用户原始需求。',
          `refinement assistant package 示例：${JSON.stringify(refinementAssistantPackageExample)}`,
        ].join('\n')
      : '',
  ]
    .filter(Boolean)
    .join('\n');

  const userContextSections = buildPlannerUserContextSections({
    projectTitle: args.projectTitle,
    episodeTitle: args.episodeTitle,
    contentMode: args.contentMode,
    scriptContent: args.scriptContent,
    selectedSubjectName: args.selectedSubjectName,
    selectedStyleName: args.selectedStyleName,
    selectedImageModelLabel: args.selectedImageModelLabel,
    targetStage: args.targetStage,
    targetVideoModelFamilySlug: args.targetVideoModelFamilySlug,
    targetVideoModelSummary: args.targetVideoModelSummary,
    outlineRefinementHints,
    currentOutlineDoc: args.currentOutlineDoc,
    currentStructuredDoc: args.currentStructuredDoc,
    rerunContext: args.rerunContext,
    stepDefinitions: args.stepDefinitions,
    userPrompt: args.userPrompt,
  });

  return {
    systemPromptFinal,
    developerPromptFinal,
    messagesFinal: [
      { role: 'system' as const, content: systemPromptFinal },
      { role: 'developer' as const, content: developerPromptFinal },
      ...args.priorMessages.map((message) => ({
        role: message.role === 'assistant' ? ('assistant' as const) : ('user' as const),
        content: message.text,
      })),
      { role: 'user' as const, content: userContextSections },
    ],
    inputContextSnapshot: {
      projectTitle: args.projectTitle,
      episodeTitle: args.episodeTitle,
      contentMode: args.contentMode ?? null,
      scriptContent: args.scriptContent ?? null,
      selectedSubjectName: args.selectedSubjectName ?? null,
      selectedStyleName: args.selectedStyleName ?? null,
      selectedImageModelLabel: args.selectedImageModelLabel ?? null,
      targetVideoModelFamilySlug: args.targetVideoModelFamilySlug ?? null,
      targetVideoModelSummary: args.targetVideoModelSummary ?? null,
      priorMessages: args.priorMessages,
      currentOutlineDoc: args.currentOutlineDoc ?? null,
      outlineRefinementHints: outlineRefinementHints as PlannerOutlineRefinementHints | null,
      currentStructuredDoc: args.currentStructuredDoc ?? null,
      rerunContext: args.rerunContext ?? null,
      stepDefinitions: args.stepDefinitions,
      userPrompt: args.userPrompt,
    } satisfies Record<string, unknown>,
    ...(args.modelSelectionSnapshot ? { modelSelectionSnapshot: args.modelSelectionSnapshot } : {}),
  } satisfies PlannerPromptSnapshot;
}

export function buildPlannerGenerationPrompt(args: {
  selection: ResolvedPlannerAgentSelection;
  targetStage: 'outline' | 'refinement';
  userPrompt: string;
  projectTitle: string;
  episodeTitle: string;
  contentMode?: string | null;
  scriptContent?: string | null;
  selectedSubjectName?: string | null;
  selectedStyleName?: string | null;
  selectedImageModelLabel?: string | null;
  priorMessages: Array<{ role: string; text: string }>;
  currentOutlineDoc?: unknown;
  currentStructuredDoc?: unknown;
  rerunContext?: PlannerRerunPromptContext | null;
  targetVideoModelFamilySlug?: string | null;
  targetVideoModelSummary?: string | null;
  modelSelectionSnapshot?: Record<string, unknown>;
}) {
  const stepDefinitions = resolvePlannerStepDefinitions(args.selection);
  const promptSnapshot = buildPlannerPromptSnapshot({
    ...args,
    stepDefinitions,
  });
  const outlineRefinementHints =
    args.targetStage === 'refinement'
      ? buildPlannerOutlineRefinementHints(args.currentOutlineDoc)
      : null;
  const userContextSections = buildPlannerUserContextSections({
    projectTitle: args.projectTitle,
    episodeTitle: args.episodeTitle,
    contentMode: args.contentMode,
    scriptContent: args.scriptContent,
    selectedSubjectName: args.selectedSubjectName,
    selectedStyleName: args.selectedStyleName,
    selectedImageModelLabel: args.selectedImageModelLabel,
    targetStage: args.targetStage,
    targetVideoModelFamilySlug: args.targetVideoModelFamilySlug,
    targetVideoModelSummary: args.targetVideoModelSummary,
    outlineRefinementHints,
    currentOutlineDoc: args.currentOutlineDoc,
    currentStructuredDoc: args.currentStructuredDoc,
    rerunContext: args.rerunContext,
    stepDefinitions,
    userPrompt: args.userPrompt,
  });
  const promptSections = [
    promptSnapshot.systemPromptFinal,
    promptSnapshot.developerPromptFinal,
    args.priorMessages.length > 0 ? `最近对话：${JSON.stringify(args.priorMessages, null, 2)}` : '',
    userContextSections,
  ];
  const promptText = promptSections.filter(Boolean).join('\n');

  return {
    promptText,
    stepDefinitions,
    promptSnapshot,
    promptArtifact: {
      promptText,
      promptSnapshot,
      stepDefinitions,
      targetVideoModelFamilySlug: args.targetVideoModelFamilySlug ?? null,
      targetVideoModelSummary: args.targetVideoModelSummary ?? null,
    } satisfies Record<string, unknown>,
  };
}
