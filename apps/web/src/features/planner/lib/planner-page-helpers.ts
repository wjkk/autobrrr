import type { ApiPlannerDebugApplySource, ApiPlannerWorkspace } from './planner-api';
import type { PlannerThreadMessage } from './planner-thread';
import { sekoPlanData } from './seko-plan-data';
import { findPlannerVideoModelOption, PLANNER_VIDEO_MODEL_OPTIONS } from './planner-video-model-options';

export type PlannerMode = 'single' | 'series';
export type PlannerAssetRatio = '16:9' | '9:16' | '4:3' | '3:4';

export interface PlannerEpisodeDraft {
  id: string;
  label: string;
  title: string;
  summary: string;
  styleId: number;
  shotCount: number;
}

export interface PlannerHistoryVersionView {
  debugApplySource?: ApiPlannerDebugApplySource | null;
  id: string;
  versionNumber: number;
  trigger: string;
  status: 'running' | 'ready' | 'failed';
  createdAt: number;
}

export interface PlannerRuntimeAssetOption {
  id: string;
  sourceUrl: string | null;
  fileName: string;
  mediaKind: string;
  sourceKind: string;
  createdAt: string;
}

export interface PlannerAssetThumbCandidate {
  key: string;
  image: string;
  assetId: string | null;
  label: string;
  sourceKind: string | null;
  createdAt?: string;
}

export const STYLE_LIBRARY = [
  { id: 54, name: '韩漫二次元', tone: '高对比、硬描边、动势夸张' },
  { id: 56, name: '3D古风', tone: '三维体积光、玉石材质、大场景' },
  { id: 60, name: '岩井俊二电影', tone: '柔焦逆光、青春颗粒、空镜节奏' },
  { id: 61, name: '复古DV质感', tone: '手持晃动、磁带噪点、冷暖漂移' },
  { id: 76, name: '未来主义', tone: '冷色金属、霓虹反射、高速运镜' },
] as const;

export const DOC_TOC: Array<{ id: string; title: string }> = [
  { id: 'doc-summary', title: '故事梗概' },
  { id: 'doc-style', title: '美术风格' },
  { id: 'doc-subjects', title: '主体列表' },
  { id: 'doc-scenes', title: '场景列表' },
  { id: 'doc-script', title: '分镜剧本' },
];

export const ASPECT_RATIO_OPTIONS: PlannerAssetRatio[] = ['16:9', '9:16', '4:3', '3:4'];

export const SUBJECT_IMAGE_POOL = sekoPlanData.subjects.map((item) => item.image);
export const SCENE_IMAGE_POOL = sekoPlanData.scenes.map((item) => item.image);
export const SUBJECT_TONE_LABEL = '不羁青年';
export const SUBJECT_TONE_META = '男性/青年/普通话';

function plannerAssetSourceLabel(sourceKind: string | undefined) {
  switch ((sourceKind ?? '').toLowerCase()) {
    case 'generated':
      return 'AI生成';
    case 'reference':
      return '参考图';
    case 'imported':
      return '导入素材';
    case 'upload':
      return '本地上传';
    default:
      return '项目素材';
  }
}

function plannerAssetSortWeight(sourceKind: string | null) {
  switch ((sourceKind ?? '').toLowerCase()) {
    case 'generated':
      return 0;
    case 'upload':
      return 1;
    case 'reference':
      return 2;
    case 'imported':
      return 3;
    default:
      return 4;
  }
}

export function buildPlannerAssetThumbCandidates(args: {
  linkedAssets?: Array<{ id: string; sourceUrl: string | null; fileName: string; sourceKind?: string; createdAt?: string }>;
  availableAssets: PlannerRuntimeAssetOption[];
  fallbackImages: string[];
  activeImage: string | null;
  fallbackPrefix: string;
}) {
  const seenAssetIds = new Set<string>();
  const seenImages = new Set<string>();
  const items: PlannerAssetThumbCandidate[] = [];

  const pushCandidate = (candidate: PlannerAssetThumbCandidate) => {
    if (!candidate.image) {
      return;
    }
    if (candidate.assetId) {
      if (seenAssetIds.has(candidate.assetId)) {
        return;
      }
      seenAssetIds.add(candidate.assetId);
    }
    if (seenImages.has(candidate.image)) {
      return;
    }
    seenImages.add(candidate.image);
    items.push(candidate);
  };

  for (const asset of args.linkedAssets ?? []) {
    pushCandidate({
      key: `linked-${asset.id}`,
      image: asset.sourceUrl ?? '',
      assetId: asset.id,
      label: `${plannerAssetSourceLabel(asset.sourceKind)} · ${asset.fileName || '关联素材'}`,
      sourceKind: asset.sourceKind ?? null,
      createdAt: asset.createdAt,
    });
  }

  for (const asset of args.availableAssets) {
    pushCandidate({
      key: `asset-${asset.id}`,
      image: asset.sourceUrl ?? '',
      assetId: asset.id,
      label: `${plannerAssetSourceLabel(asset.sourceKind)} · ${asset.fileName || '项目素材'}`,
      sourceKind: asset.sourceKind,
      createdAt: asset.createdAt,
    });
  }

  for (const [index, image] of args.fallbackImages.entries()) {
    pushCandidate({
      key: `${args.fallbackPrefix}-${index}`,
      image,
      assetId: null,
      label: '本地占位图',
      sourceKind: null,
    });
  }

  if (args.activeImage && !seenImages.has(args.activeImage)) {
    items.unshift({
      key: `${args.fallbackPrefix}-active`,
      image: args.activeImage,
      assetId: null,
      label: '当前预览',
      sourceKind: null,
    });
  }

  return items
    .slice()
    .sort((left, right) => {
      const weightDiff = plannerAssetSortWeight(left.sourceKind) - plannerAssetSortWeight(right.sourceKind);
      if (weightDiff !== 0) {
        return weightDiff;
      }

      const leftTime = left.createdAt ? new Date(left.createdAt).getTime() : 0;
      const rightTime = right.createdAt ? new Date(right.createdAt).getTime() : 0;
      return rightTime - leftTime;
    })
    .slice(0, 10);
}

function readMessageText(content: Record<string, unknown> | null | undefined) {
  return content && typeof content.text === 'string' ? content.text : '';
}

function readMessageNotice(content: Record<string, unknown> | null | undefined) {
  if (!content) {
    return '';
  }

  if (typeof content.message === 'string') {
    return content.message;
  }

  if (typeof content.text === 'string') {
    return content.text;
  }

  return '';
}

function readStepSummary(content: Record<string, unknown> | null | undefined) {
  if (!content) {
    return '';
  }

  const steps = Array.isArray(content.steps) ? content.steps : [];
  const firstStep = steps[0];
  if (firstStep && typeof firstStep === 'object' && !Array.isArray(firstStep)) {
    const stepTitle = (firstStep as Record<string, unknown>).title;
    if (typeof stepTitle === 'string') {
      return stepTitle;
    }
  }

  return '';
}

function readOutlineSummary(content: Record<string, unknown> | null | undefined) {
  if (!content) {
    return '';
  }

  if (typeof content.text === 'string' && content.text.trim()) {
    return content.text;
  }

  const documentTitle = typeof content.documentTitle === 'string' ? content.documentTitle : '';
  if (documentTitle) {
    return `已生成剧本大纲：${documentTitle}`;
  }

  const outlineDoc =
    content.outlineDoc && typeof content.outlineDoc === 'object' && !Array.isArray(content.outlineDoc)
      ? (content.outlineDoc as Record<string, unknown>)
      : null;
  if (outlineDoc && typeof outlineDoc.projectTitle === 'string') {
    return `已生成剧本大纲：${outlineDoc.projectTitle}`;
  }

  return '已生成剧本大纲';
}

function normaliseHistoryTrigger(triggerType: string) {
  return triggerType.toLowerCase();
}

function normaliseHistoryStatus(status: string): 'running' | 'ready' | 'failed' {
  if (status === 'running' || status === 'ready' || status === 'failed') {
    return status;
  }

  return 'ready';
}

export function formatPlannerDebugRunLabel(debugRunId: string | null | undefined) {
  const normalized = typeof debugRunId === 'string' ? debugRunId.trim() : '';
  if (!normalized) {
    return 'Debug Run';
  }

  return `Debug Run ${normalized.slice(-8)}`;
}

export function mapWorkspaceMessagesToThread(
  messages: NonNullable<ApiPlannerWorkspace['messages']> | undefined,
): PlannerThreadMessage[] {
  if (!messages?.length) {
    return [];
  }

  return messages
    .map((message) => ({
      id: message.id,
      role: (message.role === 'user' ? 'user' : 'assistant') as PlannerThreadMessage['role'],
      messageType: message.messageType,
      content:
        message.messageType === 'assistant_outline_card'
          ? readOutlineSummary(message.content)
          : message.messageType === 'assistant_steps'
            ? readStepSummary(message.content)
            : message.messageType === 'assistant_document_receipt'
              ? readMessageNotice(message.content)
              : readMessageText(message.content),
      rawContent: message.content,
      createdAt: message.createdAt,
    }))
    .filter((message) => message.messageType === 'assistant_steps' || message.content.trim().length > 0);
}

export function nextLocalId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

export function styleById(styleId: number) {
  return STYLE_LIBRARY.find((item) => item.id === styleId) ?? STYLE_LIBRARY[0];
}

export function buildPlannerEpisodes(title: string, mode: PlannerMode, brief: string, episodeCount: number, shotTotal: number): PlannerEpisodeDraft[] {
  const baseTitle = title.slice(0, 18) || '霓虹代码：神秘U盘';

  if (mode === 'single') {
    return [
      {
        id: 'episode-1',
        label: 'EP 01',
        title: baseTitle,
        summary: brief || '单片模式，全部分镜围绕一条主线推进。',
        styleId: 61,
        shotCount: shotTotal,
      },
    ];
  }

  return Array.from({ length: episodeCount }, (_item, index) => ({
    id: `episode-${index + 1}`,
    label: `EP ${String(index + 1).padStart(2, '0')}`,
    title: index === 0 ? baseTitle : `${baseTitle}·待策划`,
    summary: index === 0 ? brief || '负责开场设定与情绪入场。' : '待补充当前集剧情摘要。',
    styleId: index === 0 ? 61 : 56,
    shotCount: index === 0 ? shotTotal : 0,
  }));
}

export function plannerModeLabel(mode: PlannerMode) {
  return mode === 'series' ? '多剧集模式' : '单片模式';
}

export function ratioToCssValue(ratio: PlannerAssetRatio) {
  if (ratio === '16:9') {
    return '16 / 9';
  }

  if (ratio === '9:16') {
    return '9 / 16';
  }

  if (ratio === '4:3') {
    return '4 / 3';
  }

  return '3 / 4';
}

export function ratioCardWidth(ratio: PlannerAssetRatio) {
  if (ratio === '16:9') {
    return 196;
  }

  if (ratio === '9:16') {
    return 132;
  }

  if (ratio === '4:3') {
    return 182;
  }

  return 150;
}

export function readPreferredStoryboardModelId(workspace: ApiPlannerWorkspace | null | undefined) {
  const preferredFromShots = workspace?.activeRefinement?.shotScripts?.find((shot) => typeof shot.targetModelFamilySlug === 'string' && shot.targetModelFamilySlug.length > 0)
    ?.targetModelFamilySlug;

  if (preferredFromShots && findPlannerVideoModelOption(preferredFromShots)) {
    return preferredFromShots;
  }

  return PLANNER_VIDEO_MODEL_OPTIONS[0]?.id ?? 'ark-seedance-2-video';
}

export function toHistoryVersions(args: {
  runtimeActiveRefinement: ApiPlannerWorkspace['activeRefinement'];
  runtimeActiveOutline: ApiPlannerWorkspace['activeOutline'];
  runtimeWorkspace: ApiPlannerWorkspace | null;
  localVersions: Array<{
    id: string;
    versionNumber: number;
    trigger: string;
    status: 'running' | 'ready' | 'failed';
    createdAt: number;
  }>;
}) {
  if (args.runtimeActiveRefinement) {
    return (args.runtimeWorkspace?.refinementVersions ?? [])
      .slice()
      .sort((left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime())
      .map((version) => ({
        ...(version.debugApplySource ? { debugApplySource: version.debugApplySource } : {}),
        id: version.id,
        versionNumber: version.versionNumber,
        trigger: normaliseHistoryTrigger(version.triggerType),
        status: normaliseHistoryStatus(version.status),
        createdAt: new Date(version.createdAt).getTime(),
      })) satisfies PlannerHistoryVersionView[];
  }

  if (args.runtimeActiveOutline) {
    return (args.runtimeWorkspace?.outlineVersions ?? [])
      .slice()
      .sort((left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime())
      .map((version) => ({
        id: version.id,
        versionNumber: version.versionNumber,
        trigger: normaliseHistoryTrigger(version.triggerType),
        status: normaliseHistoryStatus(version.status),
        createdAt: new Date(version.createdAt).getTime(),
      })) satisfies PlannerHistoryVersionView[];
  }

  return args.localVersions;
}
