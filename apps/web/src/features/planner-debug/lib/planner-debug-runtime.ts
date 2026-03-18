export interface DebugFormState {
  configSource: 'draft' | 'published';
  targetStage: 'outline' | 'refinement';
  partialRerunScope: 'none' | 'subject_only' | 'scene_only' | 'shots_only';
  projectId: string;
  episodeId: string;
  projectTitle: string;
  episodeTitle: string;
  userPrompt: string;
  scriptContent: string;
  selectedSubjectName: string;
  selectedStyleName: string;
  selectedImageModelLabel: string;
  priorMessagesJson: string;
  currentOutlineDocJson: string;
  currentStructuredDocJson: string;
  targetEntityJson: string;
  plannerAssetsJson: string;
  modelFamily: string;
  modelEndpoint: string;
}

export interface PlannerDebugRouteContext {
  projectId?: string | null;
  episodeId?: string | null;
  projectTitle?: string | null;
  episodeTitle?: string | null;
  replayRunId?: string | null;
  autoRun?: boolean;
}

interface DebugFormPreset extends DebugFormState {}

const sharedPlannerAssets = [
  {
    id: 'asset-generated-main',
    fileName: 'main-generated.png',
    sourceUrl: 'https://images.unsplash.com/photo-1518791841217-8f162f1e1131?auto=format&fit=crop&w=800&q=80',
    sourceKind: 'generated',
    createdAt: '2026-03-14T10:00:00.000Z',
  },
  {
    id: 'asset-reference-style',
    fileName: 'reference-style.png',
    sourceUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80',
    sourceKind: 'reference',
    createdAt: '2026-03-14T09:40:00.000Z',
  },
];

function basePreset(): DebugFormPreset {
  return {
    configSource: 'draft',
    targetStage: 'refinement',
    partialRerunScope: 'none',
    projectId: '',
    episodeId: '',
    projectTitle: '调试项目',
    episodeTitle: '第1集',
    userPrompt: '',
    scriptContent: '',
    selectedSubjectName: '',
    selectedStyleName: '',
    selectedImageModelLabel: '',
    priorMessagesJson: '',
    currentOutlineDocJson: '',
    currentStructuredDocJson: '',
    targetEntityJson: '',
    plannerAssetsJson: '',
    modelFamily: 'doubao-text',
    modelEndpoint: '',
  };
}

const debugFormPresetsBySlug: Record<string, Partial<DebugFormPreset>> = {
  'drama-dialogue': {
    projectTitle: '雨夜便利店',
    episodeTitle: '第1集：门口的误会',
    userPrompt: '做一个短剧漫剧对话剧情方案：雨夜便利店门口，外卖员和店员因为一把伞产生误会，3个分镜，情绪从防备转向理解，写实电影感。',
    selectedSubjectName: '外卖员与店员',
    selectedStyleName: '写实电影感',
    selectedImageModelLabel: 'Seko Image V1',
  },
  'drama-narration': {
    projectTitle: '回家的路灯',
    episodeTitle: '第1集：晚归',
    userPrompt: '做一个旁白解说型短剧方案：夜晚下班后的女孩独自走回家，旁白讲述她对城市和孤独的理解，3个分镜，治愈克制。',
    selectedSubjectName: '晚归女孩',
    selectedStyleName: '暖灰治愈',
    selectedImageModelLabel: 'Seko Image V1',
  },
  'mv-plot': {
    projectTitle: '逆光而行',
    episodeTitle: '副歌段',
    userPrompt: '做一个剧情MV方案：主角在城市夜色中追逐失去的恋人记忆，4个段落，副歌形成情绪高潮，镜头可剪辑卡点。',
    selectedSubjectName: '都市青年',
    selectedStyleName: '霓虹都市',
    selectedImageModelLabel: 'MV Visual V2',
  },
  'mv-performance': {
    projectTitle: '聚光之下',
    episodeTitle: '主歌+副歌',
    userPrompt: '做一个表演MV方案：女歌手在工业风舞台完成高能表演，强调动作爆点、强拍切换和镜头冲击力。',
    selectedSubjectName: '女主唱',
    selectedStyleName: '工业舞台',
    selectedImageModelLabel: 'MV Visual V2',
  },
  'mv-singing': {
    projectTitle: '留声',
    episodeTitle: '主唱特写',
    userPrompt: '做一个演唱MV方案：男歌手在空旷剧场独唱，突出表情、口型、近景镜头和歌词情绪递进。',
    selectedSubjectName: '男主唱',
    selectedStyleName: '剧场演唱',
    selectedImageModelLabel: 'MV Visual V2',
  },
  'mv-vibe': {
    projectTitle: '海风来信',
    episodeTitle: '情绪段落',
    userPrompt: '做一个氛围MV方案：海边黄昏、风声和独自行走的女孩，重点是情绪流动、光影质感和慢镜头呼吸感。',
    selectedSubjectName: '海边女孩',
    selectedStyleName: '胶片黄昏',
    selectedImageModelLabel: 'MV Visual V2',
  },
  'knowledge-science': {
    projectTitle: '为什么猫会踩奶',
    episodeTitle: '知识科普短片',
    userPrompt: '做一个知识科普短视频方案：解释猫为什么会踩奶，3个分镜，口语化、易懂，并配合示意画面帮助理解。',
    selectedSubjectName: '橘猫',
    selectedStyleName: '轻科普插画感',
    selectedImageModelLabel: 'Knowledge Image V1',
  },
  'knowledge-emotion': {
    projectTitle: '慢一点也没关系',
    episodeTitle: '情感短片',
    userPrompt: '做一个情感哲言短视频方案：主题是“慢一点也没关系”，3个分镜，偏治愈与留白，适合短句配音传播。',
    selectedSubjectName: '独处青年',
    selectedStyleName: '柔和留白',
    selectedImageModelLabel: 'Knowledge Image V1',
    plannerAssetsJson: JSON.stringify(sharedPlannerAssets, null, 2),
  },
  'knowledge-travel': {
    projectTitle: '杭州一日游',
    episodeTitle: '目的地宣传',
    userPrompt: '做一个旅游宣传短视频方案：杭州一日游，突出西湖、龙井和夜景，镜头像真实游览路线，适合宣传传播。',
    selectedSubjectName: '旅行博主',
    selectedStyleName: '清透旅行',
    selectedImageModelLabel: 'Knowledge Image V1',
  },
  'knowledge-history': {
    projectTitle: '长安夜宴',
    episodeTitle: '历史文化讲述',
    userPrompt: '做一个历史文化短视频方案：介绍唐代长安夜宴文化，3个分镜，突出时代背景、器物、服饰和文化语境。',
    selectedSubjectName: '唐代宾客',
    selectedStyleName: '盛唐华彩',
    selectedImageModelLabel: 'Knowledge Image V1',
  },
};

export function buildPlannerDebugSearch(input: PlannerDebugRouteContext) {
  const search = new URLSearchParams();
  if (input.projectId) {
    search.set('projectId', input.projectId);
  }
  if (input.episodeId) {
    search.set('episodeId', input.episodeId);
  }
  if (input.projectTitle) {
    search.set('projectTitle', input.projectTitle);
  }
  if (input.episodeTitle) {
    search.set('episodeTitle', input.episodeTitle);
  }
  if (input.replayRunId) {
    search.set('replayRunId', input.replayRunId);
  }
  if (input.autoRun) {
    search.set('autoRun', '1');
  }
  const serialized = search.toString();
  return serialized ? `?${serialized}` : '';
}

export function buildInitialDebugForm(subAgentSlug?: string | null, context?: PlannerDebugRouteContext): DebugFormState {
  const preset = subAgentSlug ? debugFormPresetsBySlug[subAgentSlug] : null;
  return {
    ...basePreset(),
    ...(preset ?? {}),
    projectId: context?.projectId ?? '',
    episodeId: context?.episodeId ?? '',
    projectTitle: context?.projectTitle ?? (preset?.projectTitle ?? basePreset().projectTitle),
    episodeTitle: context?.episodeTitle ?? (preset?.episodeTitle ?? basePreset().episodeTitle),
  };
}

export function stringifyJsonInput(value: unknown) {
  if (value === null || value === undefined) {
    return '';
  }

  if (typeof value === 'string') {
    return value;
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return '';
  }
}

function parseJsonText(value: string, label: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return { value: undefined, error: null } as const;
  }

  try {
    return { value: JSON.parse(trimmed) as unknown, error: null } as const;
  } catch (error) {
    const reason = error instanceof Error ? error.message : '解析失败';
    return { value: undefined, error: `${label} JSON 无法解析：${reason}` } as const;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function parseDebugContext(debugForm: DebugFormState) {
  const priorMessages = parseJsonText(debugForm.priorMessagesJson, '历史消息');
  if (priorMessages.error) {
    return { ok: false as const, error: priorMessages.error };
  }
  if (priorMessages.value !== undefined && !Array.isArray(priorMessages.value)) {
    return { ok: false as const, error: '历史消息必须是数组。' };
  }

  const currentOutlineDoc = parseJsonText(debugForm.currentOutlineDocJson, '当前大纲');
  if (currentOutlineDoc.error) {
    return { ok: false as const, error: currentOutlineDoc.error };
  }
  if (currentOutlineDoc.value !== undefined && !isRecord(currentOutlineDoc.value)) {
    return { ok: false as const, error: '当前大纲必须是对象。' };
  }

  const currentStructuredDoc = parseJsonText(debugForm.currentStructuredDocJson, '当前细化文档');
  if (currentStructuredDoc.error) {
    return { ok: false as const, error: currentStructuredDoc.error };
  }
  if (currentStructuredDoc.value !== undefined && !isRecord(currentStructuredDoc.value)) {
    return { ok: false as const, error: '当前细化文档必须是对象。' };
  }

  const targetEntity = parseJsonText(debugForm.targetEntityJson, '目标实体');
  if (targetEntity.error) {
    return { ok: false as const, error: targetEntity.error };
  }
  if (targetEntity.value !== undefined && !isRecord(targetEntity.value)) {
    return { ok: false as const, error: '目标实体必须是对象。' };
  }

  const plannerAssets = parseJsonText(debugForm.plannerAssetsJson, '策划素材');
  if (plannerAssets.error) {
    return { ok: false as const, error: plannerAssets.error };
  }
  if (plannerAssets.value !== undefined && !Array.isArray(plannerAssets.value)) {
    return { ok: false as const, error: '策划素材必须是数组。' };
  }

  return {
    ok: true as const,
    value: {
      priorMessages: (priorMessages.value as Array<{ role: 'user' | 'assistant'; text: string }> | undefined) ?? undefined,
      currentOutlineDoc: (currentOutlineDoc.value as Record<string, unknown> | undefined) ?? undefined,
      currentStructuredDoc: (currentStructuredDoc.value as Record<string, unknown> | undefined) ?? undefined,
      targetEntity: (targetEntity.value as Record<string, unknown> | undefined) ?? undefined,
      plannerAssets:
        (plannerAssets.value as Array<{
          id: string;
          fileName?: string;
          sourceUrl?: string | null;
          sourceKind?: string;
          createdAt?: string;
        }> | undefined) ?? undefined,
    },
  };
}
