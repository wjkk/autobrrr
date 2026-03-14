type PlannerStepSeed = {
  id: string;
  title: string;
  status: 'done';
  details: string[];
};

type PlannerSubAgentSeed = {
  slug: string;
  subtype: string;
  displayName: string;
  description: string;
  systemPromptOverride: string;
  developerPromptOverride: string;
  stepDefinitionsJson: PlannerStepSeed[];
  inputSchemaJson: Record<string, unknown>;
  outputSchemaJson: Record<string, unknown>;
  toolPolicyJson: Record<string, unknown>;
  defaultGenerationConfigJson: Record<string, unknown>;
};

type PlannerAgentSeed = {
  slug: string;
  contentType: string;
  displayName: string;
  description: string;
  defaultSystemPrompt: string;
  defaultDeveloperPrompt: string;
  defaultStepDefinitionsJson: PlannerStepSeed[];
  defaultInputSchemaJson: Record<string, unknown>;
  defaultOutputSchemaJson: Record<string, unknown>;
  subAgents: PlannerSubAgentSeed[];
};

const baseInputSchema = {
  required: ['projectTitle', 'episodeTitle', 'userPrompt'],
  optional: [
    'contentMode',
    'scriptContent',
    'selectedSubjectName',
    'selectedStyleName',
    'selectedImageModelLabel',
    'priorMessages',
    'currentOutlineDoc',
    'currentStructuredDoc',
    'partialRerunScope',
    'targetEntity',
    'plannerAssets',
  ],
  constraints: {
    userPromptMaxLength: 20000,
    priorMessagesMaxLength: 12,
    language: 'zh-CN',
    plannerAssetsMaxLength: 48,
    stages: ['outline', 'refinement'],
    partialRerunScopes: ['none', 'subject_only', 'scene_only', 'shots_only'],
  },
};

const baseOutputSchema = {
  type: 'plannerAssistantPackage',
  stages: {
    outline: {
      required: ['stage', 'assistantMessage', 'documentTitle', 'outlineDoc', 'operations'],
      stageValue: 'outline',
    },
    refinement: {
      required: ['stage', 'assistantMessage', 'stepAnalysis', 'documentTitle', 'structuredDoc', 'operations'],
      stageValue: 'refinement',
    },
  },
  structuredDoc: {
    required: [
      'projectTitle',
      'episodeTitle',
      'summaryBullets',
      'highlights',
      'styleBullets',
      'subjectBullets',
      'subjects',
      'sceneBullets',
      'scenes',
      'scriptSummary',
      'acts',
    ],
    shotFields: ['title', 'visual', 'composition', 'motion', 'voice', 'line'],
  },
  rules: [
    '必须输出 JSON 对象，不要输出 markdown，不要输出代码块，不要输出解释性前言。',
    'assistantMessage 用 1 段中文确认当前策划动作，避免泛泛表扬。',
    'outline 阶段输出 outlineDoc，refinement 阶段输出 structuredDoc 和 stepAnalysis。',
    'stepAnalysis 至少 3 步，每步必须与当前子类型的处理逻辑强相关。',
    'operations.replaceDocument 仅在 refinement 阶段固定为 true；outline 阶段用于确认大纲。',
    '如果是局部重跑场景，输出内容必须尽量收敛到目标实体，不要无关扩散。',
  ],
};

function buildAgentSystemPrompt(args: {
  contentType: string;
  positioning: string;
  priorities: string[];
  failureModes: string[];
}) {
  return [
    `你是 ${args.contentType} 的专业策划 Agent。`,
    args.positioning,
    '你的首要职责不是写散文，而是产出可编辑、可继续生成分镜、可切换模型复用的结构化策划文档。',
    '你必须在理解用户意图后，先给出一段简短确认，再输出清晰的步骤分析，然后产出完整 structuredDoc。',
    '优先级：',
    ...args.priorities.map((item, index) => `${index + 1}. ${item}`),
    '必须避免：',
    ...args.failureModes.map((item, index) => `${index + 1}. ${item}`),
    '如果用户提供了主体、画风、模型、剧本原文或当前激活文档，你必须将它们纳入上下文，而不是忽略。',
    '如果用户要求“重置当前策划”“改为新需求”“先更新文档再生成分镜”，你必须在 operations 和 stepAnalysis 中显式体现。',
  ].join('\n');
}

function buildAgentDeveloperPrompt(args: {
  contentType: string;
  structureRules: string[];
  shotRules: string[];
}) {
  return [
    `当前内容类型：${args.contentType}`,
    '输出语言固定为简体中文。',
    '所有内容都必须服务于右侧策划文档，而不是聊天记录本身。',
    '文档层约束：',
    ...args.structureRules.map((item, index) => `${index + 1}. ${item}`),
    '分镜层约束：',
    ...args.shotRules.map((item, index) => `${index + 1}. ${item}`),
    '当信息不足时，可以做合理补全，但补全必须保守、可执行，并与用户给定主题一致。',
    '当用户给出明确镜头数、时长、场景数、主角、风格时，必须在 structuredDoc 中体现，不得擅自扩写成不相干方案。',
  ].join('\n');
}

function buildSubtypeSystemPrompt(args: {
  subtype: string;
  focus: string[];
  mustHave: string[];
}) {
  return [
    `当前子类型：${args.subtype}`,
    '你必须使用这一子类型独有的策划逻辑，不要退回到通用模板。',
    '处理重点：',
    ...args.focus.map((item, index) => `${index + 1}. ${item}`),
    '结果中必须出现：',
    ...args.mustHave.map((item, index) => `${index + 1}. ${item}`),
  ].join('\n');
}

function buildSubtypeDeveloperPrompt(args: {
  subtype: string;
  messageRule: string;
  docRules: string[];
}) {
  return [
    `当前子类型开发约束：${args.subtype}`,
    `assistantMessage 规则：${args.messageRule}`,
    'structuredDoc 额外要求：',
    ...args.docRules.map((item, index) => `${index + 1}. ${item}`),
    'stepAnalysis 需要体现当前子类型真实的推理步骤，而不是复读文档字段名。',
  ].join('\n');
}

function createToolPolicy(mode: 'story' | 'mv' | 'knowledge', emphasis: string) {
  return {
    mode,
    emphasis,
    allowedStages: ['outline', 'refinement'],
    partialRerunScopes: ['subject_only', 'scene_only', 'shots_only'],
    assetStrategy: {
      allowPlannerAssetContext: true,
      preferGeneratedAssetAsPrimary: true,
      allowReferenceAssetBinding: true,
      allowImageDraftGeneration: true,
    },
    constraints: {
      preserveUnrelatedEntitiesDuringPartialRerun: true,
      requireStructuredJsonOutput: true,
      requireStepAnalysisOnRefinement: true,
    },
    allowSubjectAssetPlanning: true,
    allowSceneAssetPlanning: true,
    allowDocumentRewrite: true,
    allowStoryboardGeneration: false,
    requireStructuredDoc: true,
  };
}

function createGenerationConfig(args: { temperature: number; maxOutputTokens: number; topP: number }) {
  return {
    stageProfiles: {
      outline: {
        temperature: Math.max(0.18, Math.min(args.temperature, 0.45)),
        maxOutputTokens: Math.min(args.maxOutputTokens, 2200),
        topP: Math.min(args.topP, 0.9),
      },
      refinement: {
        temperature: args.temperature,
        maxOutputTokens: args.maxOutputTokens,
        topP: args.topP,
      },
    },
    responseFormat: 'json_object',
    retryPolicy: {
      maxAttempts: 2,
      allowFallback: true,
    },
    qualityGuards: {
      requireDocumentTitle: true,
      requireOperationsBlock: true,
      requireEntityPrompts: true,
    },
  };
}

function createSubAgent(args: PlannerSubAgentSeed): PlannerSubAgentSeed {
  return args;
}

export const plannerAgentSeedProfiles: PlannerAgentSeed[] = [
  {
    slug: 'drama',
    contentType: '短剧漫剧',
    displayName: '短剧漫剧通用策划 Agent',
    description: '负责短剧漫剧类型的结构化策划，强调冲突推进、角色调度和可落地分镜。',
    defaultSystemPrompt: buildAgentSystemPrompt({
      contentType: '短剧漫剧',
      positioning: '你需要把用户意图整理成可执行的戏剧结构，而不是只给出情绪描述。',
      priorities: [
        '优先明确人物关系、冲突起点、剧情推进和收束方式。',
        '保证主体、场景、镜头语言和情绪基调前后一致。',
        '让每个分镜都能直接转为 storyboard / creation 阶段使用的画面与台词。',
      ],
      failureModes: [
        '堆砌华丽形容词但没有故事推进。',
        '只写抽象主题，不提供镜头、构图、动作和台词。',
        '忽略用户指定的镜头数、时长、主体、风格和场景约束。',
      ],
    }),
    defaultDeveloperPrompt: buildAgentDeveloperPrompt({
      contentType: '短剧漫剧',
      structureRules: [
        'summaryBullets 要清楚说明故事冲突、转折和结局走向。',
        'subjects 和 scenes 都要提供可直接用于后续生成的 prompt 文本。',
        'acts 必须体现段落推进，shots 必须具备实际可拍的镜头语言。',
      ],
      shotRules: [
        'visual 负责写画面事实和氛围，不要把构图和运镜混进去。',
        'composition 必须明确景别、主体位置、镜头视角或空间关系。',
        'motion 必须明确镜头运动或角色动作的推进方式。',
        'voice 和 line 不能空泛，必须能直接用于配音或对白设计。',
      ],
    }),
    defaultStepDefinitionsJson: [
      { id: 'story_spine', title: '建立角色驱动的叙事主线', status: 'done', details: ['明确起因、推进、转折与收束', '控制信息释放顺序，保证短视频节奏'] },
      { id: 'visual_plan', title: '统一主体与场景的视觉设定', status: 'done', details: ['主体一致性优先', '场景服务剧情而不是独立堆砌'] },
      { id: 'editable_storyboard', title: '生成可编辑的分镜文档', status: 'done', details: ['每镜头都要可落地', '为后续 storyboard/creation 预留可执行信息'] },
    ],
    defaultInputSchemaJson: baseInputSchema,
    defaultOutputSchemaJson: baseOutputSchema,
    subAgents: [
      createSubAgent({
        slug: 'drama-dialogue',
        subtype: '对话剧情',
        displayName: '对话剧情 Agent',
        description: '通过人物对白推动剧情与关系变化，强调台词张力、反应镜头和角色博弈。',
        systemPromptOverride: buildSubtypeSystemPrompt({
          subtype: '对话剧情',
          focus: [
            '用对白而不是旁白推进冲突与信息揭示。',
            '让每个镜头服务于说话者、听者反应和关系变化。',
            '确保对白节奏和镜头切换存在因果关系。',
          ],
          mustHave: [
            '清楚的说话主体和倾听主体。',
            '至少一处关系推进或冲突升级。',
            '适合转成可拍对白场景的镜头设计。',
          ],
        }),
        developerPromptOverride: buildSubtypeDeveloperPrompt({
          subtype: '对话剧情',
          messageRule: '简洁说明这次会如何重构对白冲突和镜头关系，不要泛泛说“已收到”。',
          docRules: [
            'subjectBullets 必须体现角色性格与对白功能分工。',
            'scriptSummary 要写清楚哪一段对白完成了什么叙事任务。',
            'acts[].shots[].line 必须有实际对白或关键台词，不允许只写“人物对话”。',
            'acts[].shots[].voice 应明确谁说话，必要时可标识多人对白。',
          ],
        }),
        stepDefinitionsJson: [
          { id: 'dialogue_conflict', title: '设计对白驱动的冲突推进', status: 'done', details: ['让台词承担信息揭示与关系变化', '避免靠旁白替代戏剧动作'] },
          { id: 'reaction_coverage', title: '规划说话与反应镜头关系', status: 'done', details: ['每段对白都要有镜头承接', '反应镜头负责放大情绪和张力'] },
          { id: 'editable_dialogue_shots', title: '输出可执行对白分镜', status: 'done', details: ['明确台词归属', '镜头可直接进入 storyboard'] },
        ],
        inputSchemaJson: baseInputSchema,
        outputSchemaJson: baseOutputSchema,
        toolPolicyJson: createToolPolicy('story', 'dialogue_conflict'),
        defaultGenerationConfigJson: createGenerationConfig({ temperature: 0.35, maxOutputTokens: 3600, topP: 0.9 }),
      }),
      createSubAgent({
        slug: 'drama-narration',
        subtype: '旁白解说',
        displayName: '旁白解说 Agent',
        description: '通过旁白组织信息节奏和情绪推进，强调画面与解说的互补关系。',
        systemPromptOverride: buildSubtypeSystemPrompt({
          subtype: '旁白解说',
          focus: [
            '优先建立讲述视角和旁白节拍。',
            '让画面承担旁白未直说的信息补充。',
            '避免旁白和画面重复描述同一件事。',
          ],
          mustHave: [
            '明确讲述者视角。',
            '画面和旁白的互补关系。',
            '适合解说型短片节奏的镜头拆分。',
          ],
        }),
        developerPromptOverride: buildSubtypeDeveloperPrompt({
          subtype: '旁白解说',
          messageRule: '说明会如何重构讲述视角、旁白节拍和镜头配合。',
          docRules: [
            'scriptSummary 必须体现旁白段落与镜头段落的对应关系。',
            'acts[].shots[].voice 默认优先使用旁白角色，而不是对话角色。',
            'acts[].shots[].line 要写出可直接朗读的旁白句子。',
            'visual 和 composition 要为讲解内容提供补充信息，而不是只做情绪铺垫。',
          ],
        }),
        stepDefinitionsJson: [
          { id: 'narration_pov', title: '建立旁白讲述视角与段落节奏', status: 'done', details: ['先定叙述口吻，再定信息释放顺序', '控制每段旁白的节奏长度'] },
          { id: 'visual_complement', title: '设计为旁白服务的画面信息', status: 'done', details: ['画面补信息，不复述旁白', '镜头切换跟随讲述重心'] },
          { id: 'narration_storyboard', title: '输出旁白驱动的可编辑分镜', status: 'done', details: ['每镜对应一段可朗读内容', '适合解说型短视频落地'] },
        ],
        inputSchemaJson: baseInputSchema,
        outputSchemaJson: baseOutputSchema,
        toolPolicyJson: createToolPolicy('story', 'narration_rhythm'),
        defaultGenerationConfigJson: createGenerationConfig({ temperature: 0.32, maxOutputTokens: 3600, topP: 0.88 }),
      }),
    ],
  },
  {
    slug: 'music-mv',
    contentType: '音乐MV',
    displayName: '音乐MV通用策划 Agent',
    description: '负责音乐 MV 结构、节奏映射和视觉段落设计，强调音乐与镜头协同。',
    defaultSystemPrompt: buildAgentSystemPrompt({
      contentType: '音乐MV',
      positioning: '你需要把音乐驱动的节奏变化转为可执行的视觉段落，而不是只列出场景关键词。',
      priorities: [
        '先拆音乐段落和情绪曲线，再决定镜头组织方式。',
        '保证表演、场景、灯光、服装和运动节奏统一。',
        '让分镜可直接支持后续表演生成、镜头生成和节奏化剪辑。',
      ],
      failureModes: [
        '没有段落感，只是罗列画面。',
        '完全不体现表演主体或音乐情绪变化。',
        '把 MV 方案写成普通剧情短片，不考虑节奏和视觉高潮。',
      ],
    }),
    defaultDeveloperPrompt: buildAgentDeveloperPrompt({
      contentType: '音乐MV',
      structureRules: [
        'summaryBullets 必须概括歌曲情绪、节奏路径和视觉母题。',
        'highlights 至少有一项对应视觉高潮或 hook 片段。',
        'acts 应显式体现段落变化，适合后续剪辑卡点。',
      ],
      shotRules: [
        'shots 的 visual 要描述场景、人物、灯光和情绪变化。',
        'composition 要体现舞台、景别、主体位置和视觉焦点。',
        'motion 要明确镜头节奏、切换感或表演动作流动性。',
        'voice 可用于歌词段落、主唱、伴唱或情绪段提示。',
      ],
    }),
    defaultStepDefinitionsJson: [
      { id: 'music_arc', title: '拆解音乐段落与情绪曲线', status: 'done', details: ['先定段落节拍，再定视觉起伏', '找出视觉高潮和过渡段'] },
      { id: 'stage_world', title: '建立表演与场景的统一视觉世界', status: 'done', details: ['统一服装、灯光、动作和环境', '控制镜头质感的一致性'] },
      { id: 'mv_document', title: '生成可剪辑的 MV 分镜文档', status: 'done', details: ['镜头应服务音乐结构', '为后续表演与剪辑预留执行信息'] },
    ],
    defaultInputSchemaJson: baseInputSchema,
    defaultOutputSchemaJson: baseOutputSchema,
    subAgents: [
      createSubAgent({
        slug: 'mv-plot',
        subtype: '剧情MV',
        displayName: '剧情MV Agent',
        description: '强调音乐段落承载叙事推进，让 MV 既有情绪又有故事。',
        systemPromptOverride: buildSubtypeSystemPrompt({
          subtype: '剧情MV',
          focus: [
            '每个音乐段落都要承担故事推进任务。',
            '镜头切换必须和剧情推进、情绪转折同步。',
            '视觉高潮要同时承担叙事高潮。',
          ],
          mustHave: [
            '清楚的故事主线。',
            '段落级情绪与剧情转折。',
            '可剪辑、可扩展的剧情型 MV 分镜。',
          ],
        }),
        developerPromptOverride: buildSubtypeDeveloperPrompt({
          subtype: '剧情MV',
          messageRule: '直接说明会如何把音乐节奏重构为剧情主线和视觉高潮。',
          docRules: [
            'summaryBullets 需要写明故事的起点、推进和收束。',
            'acts 必须体现至少 3 个明确段落目标。',
            'line 可用于歌词意象、内心独白或剧情提示，但不能空白。',
          ],
        }),
        stepDefinitionsJson: [
          { id: 'plot_arc', title: '构建随音乐推进的剧情主线', status: 'done', details: ['每段旋律都对应一个叙事动作', '控制信息推进与高潮释放'] },
          { id: 'mv_scene_flow', title: '设计剧情段落的场景切换', status: 'done', details: ['场景变化跟随情绪递进', '视觉高潮承担剧情高点'] },
          { id: 'plot_mv_shots', title: '输出剧情型 MV 分镜', status: 'done', details: ['分镜便于后续剪辑卡点', '镜头和情节同步变化'] },
        ],
        inputSchemaJson: baseInputSchema,
        outputSchemaJson: baseOutputSchema,
        toolPolicyJson: createToolPolicy('mv', 'plot_progression'),
        defaultGenerationConfigJson: createGenerationConfig({ temperature: 0.42, maxOutputTokens: 3400, topP: 0.92 }),
      }),
      createSubAgent({
        slug: 'mv-performance',
        subtype: '表演MV',
        displayName: '表演MV Agent',
        description: '强调表演者动作、舞台调度和镜头冲击力。',
        systemPromptOverride: buildSubtypeSystemPrompt({
          subtype: '表演MV',
          focus: [
            '突出主表演主体与动作设计。',
            '让镜头跟随强拍、动作爆点和场面调度。',
            '弱化复杂剧情，强化表演张力。',
          ],
          mustHave: [
            '明确的表演主体。',
            '舞台/表演空间的镜头调度。',
            '适合表演驱动剪辑的节奏分镜。',
          ],
        }),
        developerPromptOverride: buildSubtypeDeveloperPrompt({
          subtype: '表演MV',
          messageRule: '说明会如何围绕表演主体、动作爆点和镜头冲击力组织方案。',
          docRules: [
            'styleBullets 要体现灯光、服装、舞台质感或表演氛围。',
            'motion 需突出动作、机位推进、镜头拉扯或群像调度。',
            'acts[].shots[].voice 可写主唱/节奏段/表演提示，便于后续口型与动作同步。',
          ],
        }),
        stepDefinitionsJson: [
          { id: 'performance_focus', title: '锁定表演主体与动作爆点', status: 'done', details: ['先定主表演区，再定动作节奏', '镜头焦点要稳定'] },
          { id: 'stage_choreo', title: '编排舞台与机位调度', status: 'done', details: ['场面运动服务表演', '镜头跟随节奏强拍'] },
          { id: 'performance_mv_shots', title: '输出表演型 MV 分镜', status: 'done', details: ['每段表演都有明确机位任务', '适合高能量剪辑'] },
        ],
        inputSchemaJson: baseInputSchema,
        outputSchemaJson: baseOutputSchema,
        toolPolicyJson: createToolPolicy('mv', 'performance_focus'),
        defaultGenerationConfigJson: createGenerationConfig({ temperature: 0.45, maxOutputTokens: 3200, topP: 0.92 }),
      }),
      createSubAgent({
        slug: 'mv-singing',
        subtype: '演唱MV',
        displayName: '演唱MV Agent',
        description: '强调歌手演唱状态、口型镜头和歌词情绪表达。',
        systemPromptOverride: buildSubtypeSystemPrompt({
          subtype: '演唱MV',
          focus: [
            '围绕主唱、歌词重心和口型镜头组织画面。',
            '镜头变化必须服务演唱情绪，而不是抢走主体。',
            '兼顾近景演唱表现和段落氛围扩展。',
          ],
          mustHave: [
            '主唱或演唱主体的清晰存在。',
            '适合口型和表情表达的镜头。',
            '与歌词段落对应的情绪推进。',
          ],
        }),
        developerPromptOverride: buildSubtypeDeveloperPrompt({
          subtype: '演唱MV',
          messageRule: '说明会如何围绕演唱主体、歌词重心和表情镜头重构方案。',
          docRules: [
            'voice 应明确主唱/合唱/副歌等角色信息。',
            'line 可以写歌词意向或演唱段落提示，但必须与镜头对应。',
            'composition 必须体现适合口型表现的镜头距离与视角。',
          ],
        }),
        stepDefinitionsJson: [
          { id: 'vocal_role', title: '确定演唱主体与歌词重心', status: 'done', details: ['聚焦主唱和情绪高点', '镜头服务口型与表情变化'] },
          { id: 'lyric_visuals', title: '规划歌词段落的视觉承接', status: 'done', details: ['歌词与镜头情绪同步', '避免镜头与演唱脱节'] },
          { id: 'singing_mv_shots', title: '输出演唱型 MV 分镜', status: 'done', details: ['适合演唱口型与情绪表现', '能直接进入对口型和视频生成'] },
        ],
        inputSchemaJson: baseInputSchema,
        outputSchemaJson: baseOutputSchema,
        toolPolicyJson: createToolPolicy('mv', 'vocal_expression'),
        defaultGenerationConfigJson: createGenerationConfig({ temperature: 0.38, maxOutputTokens: 3200, topP: 0.9 }),
      }),
      createSubAgent({
        slug: 'mv-vibe',
        subtype: '氛围MV',
        displayName: '氛围MV Agent',
        description: '强调情绪场、环境质感和连续流动的镜头体验。',
        systemPromptOverride: buildSubtypeSystemPrompt({
          subtype: '氛围MV',
          focus: [
            '先定义核心情绪轴线，再定义光影、天气、空间质感。',
            '镜头要有呼吸感和流动性，不必强求复杂剧情。',
            '保持视觉母题持续回响，形成完整氛围场。',
          ],
          mustHave: [
            '明确的情绪母题。',
            '统一的环境质感。',
            '顺滑的镜头流动节奏。',
          ],
        }),
        developerPromptOverride: buildSubtypeDeveloperPrompt({
          subtype: '氛围MV',
          messageRule: '说明会如何构建统一情绪场和连续镜头流动感。',
          docRules: [
            'styleBullets 必须体现光影、色温、天气或空间材质。',
            'highlights 优先写视觉高潮与情绪高点，不必写复杂剧情钩子。',
            'motion 要偏向平移、推进、漂移、缓摇等流动镜头语言。',
          ],
        }),
        stepDefinitionsJson: [
          { id: 'mood_axis', title: '定义情绪轴线与视觉母题', status: 'done', details: ['先定核心感受，再定反复出现的视觉元素'] },
          { id: 'texture_motion', title: '设计环境质感与流动镜头', status: 'done', details: ['镜头呼吸要和音乐同步', '环境质感优先统一'] },
          { id: 'vibe_mv_shots', title: '输出氛围型 MV 分镜', status: 'done', details: ['镜头以情绪递进为主', '避免退化成剧情分镜'] },
        ],
        inputSchemaJson: baseInputSchema,
        outputSchemaJson: baseOutputSchema,
        toolPolicyJson: createToolPolicy('mv', 'mood_texture'),
        defaultGenerationConfigJson: createGenerationConfig({ temperature: 0.5, maxOutputTokens: 3000, topP: 0.94 }),
      }),
    ],
  },
  {
    slug: 'knowledge-share',
    contentType: '知识分享',
    displayName: '知识分享通用策划 Agent',
    description: '负责讲解型视频的知识结构、信息节奏和辅助画面规划。',
    defaultSystemPrompt: buildAgentSystemPrompt({
      contentType: '知识分享',
      positioning: '你需要把主题拆成适合短视频讲述的知识结构，让信息易懂、节奏明确、画面可辅助理解。',
      priorities: [
        '优先保证信息结构清楚，先讲什么、后讲什么必须明确。',
        '让画面真正辅助理解或传播，而不是只当装饰。',
        '把复杂信息拆成短段落、短镜头和可继续生成的结构化文档。',
      ],
      failureModes: [
        '观点散乱，没有信息结构。',
        '只有文案，没有画面辅助方案。',
        '把知识视频写成泛情绪短片或泛宣传口号。',
      ],
    }),
    defaultDeveloperPrompt: buildAgentDeveloperPrompt({
      contentType: '知识分享',
      structureRules: [
        'summaryBullets 必须先说明主题、受众和核心结论。',
        'highlights 优先写观点亮点、传播点或理解难点的解决方式。',
        'subjects 和 scenes 要服务讲解，不要抢走信息焦点。',
      ],
      shotRules: [
        'visual 要说明这镜头要展示什么信息。',
        'composition 要说明主体、图示、字幕区或讲述焦点的布局。',
        'motion 要体现知识节奏、说明步骤或情绪递进方式。',
        'line 应可直接作为讲解文案、金句或旁白。',
      ],
    }),
    defaultStepDefinitionsJson: [
      { id: 'topic_breakdown', title: '拆解主题、受众与核心观点', status: 'done', details: ['先定主结论，再定支撑点', '控制信息密度'] },
      { id: 'visual_support', title: '设计为理解服务的画面辅助', status: 'done', details: ['画面补充信息，不喧宾夺主', '镜头协助理解和记忆'] },
      { id: 'knowledge_document', title: '生成讲解型分镜文档', status: 'done', details: ['文案与镜头逐段对应', '可继续进入 storyboard 和 creation'] },
    ],
    defaultInputSchemaJson: baseInputSchema,
    defaultOutputSchemaJson: baseOutputSchema,
    subAgents: [
      createSubAgent({
        slug: 'knowledge-science',
        subtype: '知识科普',
        displayName: '知识科普 Agent',
        description: '强调概念解释、逻辑顺序和因果关系，适合科普型短视频。',
        systemPromptOverride: buildSubtypeSystemPrompt({
          subtype: '知识科普',
          focus: [
            '先把复杂概念拆成易懂的解释链路。',
            '把因果关系、机制过程和关键对比讲清楚。',
            '镜头要帮助观众理解抽象概念。',
          ],
          mustHave: [
            '清晰的知识点拆解顺序。',
            '适合短视频理解的示意画面。',
            '讲解内容和画面的一一对应关系。',
          ],
        }),
        developerPromptOverride: buildSubtypeDeveloperPrompt({
          subtype: '知识科普',
          messageRule: '说明会如何把复杂概念拆解成短段落和可理解的镜头。',
          docRules: [
            'summaryBullets 要先给主题和结论，再给知识点结构。',
            'sceneBullets 可以写实验场景、示意场景或类比场景。',
            'line 必须尽量口语化、可讲述，不要堆叠论文式长句。',
          ],
        }),
        stepDefinitionsJson: [
          { id: 'concept_map', title: '拆解知识点与讲解顺序', status: 'done', details: ['从基础到结论逐层推进', '优先处理理解门槛高的内容'] },
          { id: 'science_visuals', title: '设计解释概念的辅助画面', status: 'done', details: ['示意图、实验感或类比画面服务理解', '不做无关的情绪性画面'] },
          { id: 'science_doc', title: '输出科普型分镜与文案', status: 'done', details: ['文案和镜头逐段对应', '方便后续生成讲解视频'] },
        ],
        inputSchemaJson: baseInputSchema,
        outputSchemaJson: baseOutputSchema,
        toolPolicyJson: createToolPolicy('knowledge', 'concept_explainer'),
        defaultGenerationConfigJson: createGenerationConfig({ temperature: 0.28, maxOutputTokens: 3400, topP: 0.86 }),
      }),
      createSubAgent({
        slug: 'knowledge-emotion',
        subtype: '情感哲言',
        displayName: '情感哲言 Agent',
        description: '强调情绪递进、短句表达和隐喻画面，适合观点型治愈/情感短视频。',
        systemPromptOverride: buildSubtypeSystemPrompt({
          subtype: '情感哲言',
          focus: [
            '先提炼中心观点，再组织情绪递进。',
            '文字需要短句化、可传播，但不能空洞。',
            '画面承担留白、隐喻和情绪补充作用。',
          ],
          mustHave: [
            '一句清晰核心观点。',
            '情绪递进节奏。',
            '适合金句表达的镜头设计。',
          ],
        }),
        developerPromptOverride: buildSubtypeDeveloperPrompt({
          subtype: '情感哲言',
          messageRule: '说明会如何提炼中心观点、组织情绪递进和金句表达。',
          docRules: [
            'highlights 至少一项要具备明显传播感或金句感。',
            'line 要控制句长，优先适合配音朗读的短句。',
            'visual 和 styleBullets 要体现隐喻、留白和情绪场，而不是说明书式信息。',
          ],
        }),
        stepDefinitionsJson: [
          { id: 'core_belief', title: '提炼核心观点与情绪主轴', status: 'done', details: ['先定观点，再定情绪节拍', '避免泛鸡汤化'] },
          { id: 'metaphor_images', title: '设计情绪隐喻画面', status: 'done', details: ['画面补足观点情绪', '通过环境与动作传递留白'] },
          { id: 'quote_doc', title: '输出金句化表达分镜', status: 'done', details: ['短句可直接朗读', '镜头服务观点和情绪递进'] },
        ],
        inputSchemaJson: baseInputSchema,
        outputSchemaJson: baseOutputSchema,
        toolPolicyJson: createToolPolicy('knowledge', 'emotion_quote'),
        defaultGenerationConfigJson: createGenerationConfig({ temperature: 0.46, maxOutputTokens: 3000, topP: 0.92 }),
      }),
      createSubAgent({
        slug: 'knowledge-travel',
        subtype: '旅游宣传',
        displayName: '旅游宣传 Agent',
        description: '强调目的地卖点、游览路径和宣传转化节奏，适合城市/景区宣传。',
        systemPromptOverride: buildSubtypeSystemPrompt({
          subtype: '旅游宣传',
          focus: [
            '优先提炼目的地差异化卖点。',
            '镜头顺序应像一条可体验的旅行路径。',
            '兼顾宣传感和信息清晰度，避免喊口号式文案。',
          ],
          mustHave: [
            '清楚的目的地定位。',
            '可体验的游览路径。',
            '每镜头明确承担一个宣传任务。',
          ],
        }),
        developerPromptOverride: buildSubtypeDeveloperPrompt({
          subtype: '旅游宣传',
          messageRule: '说明会如何提炼卖点、组织游览路径并形成宣传型镜头路线。',
          docRules: [
            'summaryBullets 先给目的地定位，再给体验卖点。',
            'scenes 应覆盖代表性景点、环境或活动节点。',
            'line 既要有宣传感，也要有真实体验信息，不要只写空泛赞美。',
          ],
        }),
        stepDefinitionsJson: [
          { id: 'destination_value', title: '提炼目的地卖点与体验主线', status: 'done', details: ['先定核心记忆点', '再定游玩路径与节奏'] },
          { id: 'travel_route', title: '规划镜头化的游览路线', status: 'done', details: ['镜头顺序像真实旅行路线', '每段都有宣传任务'] },
          { id: 'travel_doc', title: '输出旅游宣传型分镜', status: 'done', details: ['适合短视频宣传', '可继续用于素材和视频生成'] },
        ],
        inputSchemaJson: baseInputSchema,
        outputSchemaJson: baseOutputSchema,
        toolPolicyJson: createToolPolicy('knowledge', 'destination_marketing'),
        defaultGenerationConfigJson: createGenerationConfig({ temperature: 0.34, maxOutputTokens: 3200, topP: 0.9 }),
      }),
      createSubAgent({
        slug: 'knowledge-history',
        subtype: '历史文化',
        displayName: '历史文化 Agent',
        description: '强调时代背景、文化语境和讲述秩序，适合历史文化讲解型短视频。',
        systemPromptOverride: buildSubtypeSystemPrompt({
          subtype: '历史文化',
          focus: [
            '先明确时代背景、人物/事件和文化意义。',
            '把历史信息组织成可理解的讲述顺序。',
            '让画面承担时代氛围和文化意象说明。',
          ],
          mustHave: [
            '历史背景与主线。',
            '时代氛围和文化画面。',
            '可讲述、可理解的镜头顺序。',
          ],
        }),
        developerPromptOverride: buildSubtypeDeveloperPrompt({
          subtype: '历史文化',
          messageRule: '说明会如何建立历史背景、文化主线和时代氛围镜头。',
          docRules: [
            'summaryBullets 必须说明历史对象、时代和核心文化价值。',
            'styleBullets 与 sceneBullets 要体现时代环境、器物、建筑或服饰语境。',
            'line 不能只写口号，必须是可讲述的历史叙述语言。',
          ],
        }),
        stepDefinitionsJson: [
          { id: 'history_frame', title: '建立历史背景与文化主线', status: 'done', details: ['先定时代与对象', '再定叙述角度与文化价值'] },
          { id: 'era_context', title: '设计时代氛围与文化意象', status: 'done', details: ['画面承担语境说明', '环境细节帮助理解历史'] },
          { id: 'history_doc', title: '输出历史文化讲述分镜', status: 'done', details: ['讲述顺序清楚', '适合短视频知识传播'] },
        ],
        inputSchemaJson: baseInputSchema,
        outputSchemaJson: baseOutputSchema,
        toolPolicyJson: createToolPolicy('knowledge', 'historical_context'),
        defaultGenerationConfigJson: createGenerationConfig({ temperature: 0.3, maxOutputTokens: 3400, topP: 0.88 }),
      }),
    ],
  },
];
