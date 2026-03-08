import type {
  ContinueProjectCard,
  CreationWorkspace,
  MockStudioScenarioId,
  PlannerWorkspace,
  ProjectSummary,
  Shot,
  ShotVersion,
  StudioFixture,
} from '@aiv/domain';

import { brandTokens } from '../brand';
import { creationCopy, plannerCopy, publishCopy } from '../copy';

const baseFeeds: StudioFixture['explore']['feeds'] = [
  { id: 'feed-1', title: '雨夜橘猫的治愈 10 秒', author: brandTokens.creatorName, stats: '12.4k', category: '短剧漫剧' },
  { id: 'feed-2', title: '城市夜景镜头语言笔记', author: 'Editorial Lab', stats: '8.1k', category: '知识分享' },
  { id: 'feed-3', title: '情绪向短 MV 分镜样例', author: 'Motion Row', stats: '14.8k', category: '音乐MV' },
  { id: 'feed-4', title: '多剧集创作工作区 mock 预览', author: 'AIV Notes', stats: '6.0k', category: '短剧漫剧' },
];

const historyWorks: StudioFixture['historyWorks'] = [
  {
    id: 'work-1',
    title: '旧城雾灯纪事',
    intro: '一个关于城市旧巷与灯光回忆的短篇。',
    script: '低饱和、慢镜头、夜景、潮湿砖墙。',
    coverLabel: '旧城雾灯',
    category: '知识分享',
    durationLabel: '00:18',
  },
  {
    id: 'work-2',
    title: '霓虹河岸片段',
    intro: '快节奏霓虹街景与河岸追光。',
    script: '高反差霓虹、反射、轻雾。',
    coverLabel: '霓虹河岸',
    category: '音乐MV',
    durationLabel: '00:12',
  },
  {
    id: 'work-3',
    title: '玻璃庭院',
    intro: '白色温室与人物静默对视的情绪短片。',
    script: '透明玻璃、逆光、缓慢推近。',
    coverLabel: '玻璃庭院',
    category: '短剧漫剧',
    durationLabel: '00:10',
  },
];

const projectCatalog: Record<MockStudioScenarioId, ProjectSummary & { scenarioLabel: string; stageLabel: ContinueProjectCard['stageLabel'] }> = {
  empty: {
    id: 'proj-empty-dawn',
    title: '空白起步计划',
    brief: '尚未生成文档与分镜，适合验证初始空状态。',
    contentMode: 'single',
    executionMode: 'review_required',
    aspectRatio: '9:16',
    status: 'draft',
    scenarioLabel: '空项目',
    stageLabel: '策划',
  },
  awaiting_review: {
    id: 'proj-fog-station',
    title: '海雾车站',
    brief: '策划文档正在收尾，仍处在审核前状态。',
    contentMode: 'single',
    executionMode: 'review_required',
    aspectRatio: '9:16',
    status: 'planning',
    scenarioLabel: '策划待确认',
    stageLabel: '策划',
  },
  partial_failed: {
    id: 'proj-rain-cat',
    title: '雨夜街头的橘色微光',
    brief: '一个三镜头治愈短片，从雨夜躲雨到暖意递来的瞬间。',
    contentMode: 'single',
    executionMode: 'review_required',
    aspectRatio: '9:16',
    status: 'creating',
    scenarioLabel: '分镜部分失败',
    stageLabel: '分片生成',
  },
  publish_ready: {
    id: 'proj-glass-garden',
    title: '玻璃庭院',
    brief: '成片已导出，正在补齐发布信息。',
    contentMode: 'single',
    executionMode: 'review_required',
    aspectRatio: '9:16',
    status: 'export_ready',
    scenarioLabel: '待发布',
    stageLabel: '发布',
  },
  published: {
    id: 'proj-neon-river',
    title: '霓虹河岸片段',
    brief: '项目已发布，用于验证发布完成态。',
    contentMode: 'single',
    executionMode: 'auto',
    aspectRatio: '9:16',
    status: 'published',
    scenarioLabel: '已发布',
    stageLabel: '发布',
  },
};

const continueProjects: ContinueProjectCard[] = (Object.keys(projectCatalog) as MockStudioScenarioId[]).map((scenarioId) => {
  const item = projectCatalog[scenarioId];

  return {
    id: item.id,
    title: item.title,
    brief: item.brief,
    aspectRatio: item.aspectRatio,
    status: item.status,
    stageLabel: item.stageLabel,
  };
});

function makeVersion(id: string, label: string, modelId: string, status: ShotVersion['status'], mediaKind: ShotVersion['mediaKind'] = 'video'): ShotVersion {
  return {
    id,
    label,
    modelId,
    status,
    mediaKind,
    createdAt: '刚刚',
  };
}

function makeShot(seed: Partial<Shot> & Pick<Shot, 'id' | 'title' | 'subtitleText' | 'narrationText' | 'imagePrompt' | 'motionPrompt' | 'preferredModel' | 'resolution' | 'durationMode' | 'durationSeconds' | 'cropToVoice' | 'status'>): Shot {
  const versions = seed.versions ?? [];
  const activeVersionId = seed.activeVersionId ?? versions.find((item) => item.status === 'active')?.id ?? '';
  const selectedVersionId = seed.selectedVersionId ?? activeVersionId ?? null;
  const pendingApplyVersionId = seed.pendingApplyVersionId ?? versions.find((item) => item.status === 'pending_apply')?.id ?? null;

  return {
    ...seed,
    versions,
    activeVersionId,
    selectedVersionId,
    pendingApplyVersionId,
    materials: seed.materials ?? [],
    activeMaterialId: seed.activeMaterialId ?? seed.materials?.[0]?.id ?? null,
    canvasTransform: seed.canvasTransform ?? {
      ratio: '9:16',
      zoom: 100,
      offsetX: 0,
      offsetY: 0,
    },
    lastError: seed.lastError ?? '',
  };
}

function basePlanner(requirement: string): PlannerWorkspace {
  return {
    input: `重置当前策划并改为新需求：${requirement}`,
    submittedRequirement: requirement,
    status: 'ready',
    docProgressPercent: 100,
    pointCost: 64,
    sections: [
      { id: 'summary', title: '故事梗概', open: true },
      { id: 'style', title: '美术风格', open: true },
      { id: 'subjects', title: '主体列表', open: true },
      { id: 'storyboards', title: '分镜草稿', open: true },
    ],
    steps: [
      { id: 'step-1', title: '确认叙事主线与情绪基调', status: 'done' },
      { id: 'step-2', title: '拆分镜头节奏与转场', status: 'done' },
      { id: 'step-3', title: '定义材质、灯光与色彩风格', status: 'done' },
      { id: 'step-4', title: '补全景别、构图与动作细节', status: 'done' },
    ],
    messages: [
      { id: 'msg-1', role: 'assistant', content: plannerCopy.assistantInitial },
      { id: 'msg-2', role: 'user', content: requirement },
      { id: 'msg-3', role: 'assistant', content: plannerCopy.assistantReady },
    ],
    references: [
      { id: 'ref-1', title: '橘猫-雨夜躲雨态', prompt: '橘猫湿透蜷缩在路边，毛发贴紧身体。', modelId: brandTokens.visionModels[0], variantLabel: '变体 01' },
      { id: 'ref-2', title: '透明雨伞与路灯', prompt: '透明雨伞与暖黄色路灯形成冷暖对比。', modelId: brandTokens.visionModels[0], variantLabel: '变体 02' },
      { id: 'ref-3', title: '奶碗与手部特写', prompt: '热气腾腾的白瓷奶碗被轻轻推向前景。', modelId: brandTokens.visionModels[1], variantLabel: '变体 03' },
    ],
    storyboards: [
      { id: 'sb-1', title: '分镜 01', visualPrompt: '橘猫在雨夜街头蜷缩。', compositionPrompt: '中景，微俯视。', motionPrompt: '缓慢前推。' },
      { id: 'sb-2', title: '分镜 02', visualPrompt: '透明雨伞从上方落下。', compositionPrompt: '中景，平视。', motionPrompt: '伞面稳定下落。' },
      { id: 'sb-3', title: '分镜 03', visualPrompt: '白瓷奶碗被轻轻推到猫咪前。', compositionPrompt: '中近景，正面。', motionPrompt: '手部轻推后定格。' },
    ],
  };
}

function baseCreation(shots: Shot[], selectedShotId: string, viewMode: CreationWorkspace['viewMode'] = 'storyboard'): CreationWorkspace {
  return {
    selectedShotId,
    activeTrack: 'visual',
    viewMode,
    points: 133,
    shots,
    playback: {
      currentSecond: 0,
      totalSecond: shots.reduce((sum, item) => sum + item.durationSeconds, 0),
      playing: false,
      subtitleVisible: true,
    },
    voice: {
      voiceName: '旁白女声 A',
      emotion: '沉稳',
      volume: 72,
      speed: 1,
    },
    music: {
      mode: 'ai',
      prompt: '克制、治愈、带微弱雨夜氛围的钢琴与氛围垫。',
      trackName: 'Rain Street Theme',
      progress: '00:12 / 00:12',
      volume: 40,
      generating: false,
      applied: true,
    },
    lipSync: {
      mode: 'single',
      inputMode: 'text',
      baseShotId: selectedShotId,
      audioName: '',
      dialogues: [{ id: 'lip-1', speaker: '角色 A', text: '它终于等到了一点暖意。' }],
      voiceModel: brandTokens.syncModels[0],
      emotion: '温暖',
      volume: 68,
      speed: 1,
    },
  };
}

function buildCommonFixture(scenarioId: MockStudioScenarioId, planner: PlannerWorkspace, creation: CreationWorkspace, publish: StudioFixture['publish']): StudioFixture {
  const project = projectCatalog[scenarioId];

  return {
    brandName: brandTokens.productName,
    assistantName: brandTokens.assistantName,
    scenarioId,
    scenarioLabel: project.scenarioLabel,
    project,
    episodes: [
      {
        id: 'ep-1',
        title: '第 1 集',
        summary: project.brief,
        sequence: 1,
        status: project.status,
      },
    ],
    explore: {
      categories: ['全部', '短剧漫剧', '音乐MV', '知识分享'],
      feeds: baseFeeds,
      continueProjects,
      defaults: {
        prompt: '做一个雨夜街头救助橘猫的三镜头短片。',
        model: brandTokens.visionModels[0],
        ratio: '9:16',
        mode: '视频模式',
      },
    },
    planner,
    creation,
    publish,
    historyWorks,
  };
}

const partialFailedShots: Shot[] = [
  makeShot({
    id: 'shot-1',
    title: '分镜 1',
    subtitleText: '雨夜街头',
    narrationText: '雨水拍打街面，它在冷夜里等待一束温暖。',
    imagePrompt: '橘猫湿透蜷缩在雨夜街头，霓虹倒影落在积水里。',
    motionPrompt: '镜头缓慢推进并轻微抬升。',
    preferredModel: brandTokens.visionModels[0],
    resolution: '1080P',
    durationMode: '智能',
    durationSeconds: 4,
    cropToVoice: true,
    status: 'success',
    versions: [
      makeVersion('shot-1-v1', '版本 1', brandTokens.visionModels[0], 'active'),
      makeVersion('shot-1-v2', '版本 2', brandTokens.visionModels[1], 'pending_apply'),
    ],
    selectedVersionId: 'shot-1-v2',
    pendingApplyVersionId: 'shot-1-v2',
    materials: [
      { id: 'asset-1', label: '雨夜街头路面贴图', source: 'history', kind: 'image' },
      { id: 'asset-2', label: '橘猫毛发参考', source: 'local', kind: 'image' },
    ],
    activeMaterialId: 'asset-1',
  }),
  makeShot({
    id: 'shot-2',
    title: '分镜 2',
    subtitleText: '暖意靠近',
    narrationText: '冷雨被隔开，暖光开始落在它的背上。',
    imagePrompt: '透明雨伞缓缓落下覆盖橘猫，路灯照亮伞面。',
    motionPrompt: '固定镜头，伞面下移。',
    preferredModel: brandTokens.visionModels[0],
    resolution: '1080P',
    durationMode: '4s',
    durationSeconds: 4,
    cropToVoice: true,
    status: 'failed',
    versions: [makeVersion('shot-2-v1', '版本 1', brandTokens.visionModels[0], 'active')],
    lastError: '主体动作过僵，建议重试或切换模型。',
  }),
  makeShot({
    id: 'shot-3',
    title: '分镜 3',
    subtitleText: '一碗暖意',
    narrationText: '一只手把热气腾腾的奶碗推向它。',
    imagePrompt: '白瓷奶碗与手部从前景轻轻入画。',
    motionPrompt: '手部推进，镜头微收后定格。',
    preferredModel: brandTokens.visionModels[1],
    resolution: '720P',
    durationMode: '智能',
    durationSeconds: 4,
    cropToVoice: false,
    status: 'pending',
    versions: [makeVersion('shot-3-v1', '版本 1', brandTokens.visionModels[1], 'active', 'image')],
    activeMaterialId: null,
  }),
];

const publishReadyShots: Shot[] = partialFailedShots.map((shot, index) =>
  makeShot({
    ...shot,
    id: `publish-shot-${index + 1}`,
    status: 'success',
    versions: [
      makeVersion(`publish-shot-${index + 1}-v1`, '版本 1', shot.preferredModel, 'active'),
      makeVersion(`publish-shot-${index + 1}-v2`, '版本 2', brandTokens.visionModels[0], 'archived'),
    ],
    selectedVersionId: `publish-shot-${index + 1}-v1`,
    activeVersionId: `publish-shot-${index + 1}-v1`,
    pendingApplyVersionId: null,
    lastError: '',
  }),
);

const emptyShots: Shot[] = [
  makeShot({
    id: 'empty-shot-1',
    title: '分镜 1',
    subtitleText: '待生成',
    narrationText: '尚未补充旁白。',
    imagePrompt: '等待输入图像提示词。',
    motionPrompt: '等待输入运镜提示词。',
    preferredModel: brandTokens.visionModels[0],
    resolution: '1080P',
    durationMode: '智能',
    durationSeconds: 4,
    cropToVoice: true,
    status: 'pending',
    versions: [],
  }),
  makeShot({
    id: 'empty-shot-2',
    title: '分镜 2',
    subtitleText: '待生成',
    narrationText: '尚未补充旁白。',
    imagePrompt: '等待输入图像提示词。',
    motionPrompt: '等待输入运镜提示词。',
    preferredModel: brandTokens.visionModels[0],
    resolution: '1080P',
    durationMode: '智能',
    durationSeconds: 4,
    cropToVoice: true,
    status: 'pending',
    versions: [],
  }),
];

export const studioFixturesByScenario: Record<MockStudioScenarioId, StudioFixture> = {
  empty: buildCommonFixture(
    'empty',
    {
      ...basePlanner('为一个全新项目建立三段式叙事分镜。'),
      status: 'idle',
      docProgressPercent: 0,
      pointCost: 0,
      steps: [
        { id: 'step-1', title: '确认创作需求', status: 'waiting' },
        { id: 'step-2', title: '产出叙事结构', status: 'waiting' },
        { id: 'step-3', title: '补全风格和主体', status: 'waiting' },
        { id: 'step-4', title: '生成分镜草稿', status: 'waiting' },
      ],
      messages: [{ id: 'msg-empty', role: 'assistant', content: '请输入需求后开始策划。' }],
      references: [],
      storyboards: [],
    },
    baseCreation(emptyShots, 'empty-shot-1', 'storyboard'),
    {
      draft: {
        title: '',
        intro: '',
        script: '',
        tag: '',
        status: 'draft',
      },
      successMessage: publishCopy.success,
    },
  ),
  awaiting_review: buildCommonFixture(
    'awaiting_review',
    {
      ...basePlanner('海雾中的旧站台，一次短暂错过后的回望。'),
      status: 'updating',
      docProgressPercent: 78,
      steps: [
        { id: 'step-1', title: '确认海雾车站的情绪主线', status: 'done' },
        { id: 'step-2', title: '拆分角色视线和回望镜头', status: 'done' },
        { id: 'step-3', title: '沉淀海雾、铁轨和冷色光感', status: 'running' },
        { id: 'step-4', title: '补全分镜草稿与动作节奏', status: 'waiting' },
      ],
      messages: [
        { id: 'msg-await-1', role: 'assistant', content: plannerCopy.assistantInitial },
        { id: 'msg-await-2', role: 'user', content: '海雾中的旧站台，一次短暂错过后的回望。' },
        { id: 'msg-await-3', role: 'assistant', content: plannerCopy.assistantWorking },
      ],
    },
    baseCreation(emptyShots, 'empty-shot-1', 'storyboard'),
    {
      draft: {
        title: '海雾车站',
        intro: '一段未说出口的站台告别。',
        script: '旧站台、雾气、回望。',
        tag: 'Awaiting Review',
        status: 'draft',
      },
      successMessage: publishCopy.success,
    },
  ),
  partial_failed: buildCommonFixture(
    'partial_failed',
    basePlanner('做一个雨夜街头救助橘猫的三镜头短片。'),
    baseCreation(partialFailedShots, 'shot-1', 'default'),
    {
      draft: {
        title: '雨夜街头的橘色微光',
        intro: '一个关于躲雨、暖光与被轻轻接住的短片。',
        script: '三镜头短片，雨夜街头，流浪橘猫，透明雨伞，热奶碗。',
        tag: 'AIV Mock Studio',
        status: 'draft',
      },
      successMessage: publishCopy.success,
    },
  ),
  publish_ready: buildCommonFixture(
    'publish_ready',
    basePlanner('玻璃庭院中，一次安静对视后的情绪升温。'),
    baseCreation(publishReadyShots, 'publish-shot-1', 'default'),
    {
      draft: {
        title: '玻璃庭院',
        intro: '透明温室里的短暂停顿，被逆光和呼吸声放大。',
        script: '玻璃、逆光、慢镜头、人物停顿与回望。',
        tag: 'Publish Ready',
        status: 'draft',
      },
      successMessage: publishCopy.success,
    },
  ),
  published: buildCommonFixture(
    'published',
    basePlanner('霓虹河岸边，一次追光与回身的节奏片段。'),
    {
      ...baseCreation(publishReadyShots, 'publish-shot-1', 'default'),
      points: 256,
    },
    {
      draft: {
        title: '霓虹河岸片段',
        intro: '在高反差河岸霓虹里完成一次追光回身。',
        script: '霓虹、反射、潮湿河岸、节奏追光。',
        tag: 'Published',
        status: 'submitted',
      },
      successMessage: '该作品已完成发布，当前页面为已发布回看态。',
    },
  ),
};

const fixturesByProjectId = Object.values(studioFixturesByScenario).reduce<Record<string, StudioFixture>>((accumulator, fixture) => {
  accumulator[fixture.project.id] = fixture;
  return accumulator;
}, {});

export function getStudioFixtureByProjectId(projectId: string): StudioFixture | null {
  return fixturesByProjectId[projectId] ? structuredClone(fixturesByProjectId[projectId]) : null;
}

export function getStudioFixtureByScenario(scenarioId: MockStudioScenarioId): StudioFixture {
  return structuredClone(studioFixturesByScenario[scenarioId]);
}

export function listStudioFixtureProjects(): ContinueProjectCard[] {
  return structuredClone(continueProjects);
}
