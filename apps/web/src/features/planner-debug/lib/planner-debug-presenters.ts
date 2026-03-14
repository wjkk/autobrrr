import { choosePlannerAssetUrl } from '../../planner/lib/planner-structured-doc';

interface PlannerAssetLike {
  id: string;
  fileName?: string;
  sourceUrl?: string | null;
  sourceKind?: string;
  createdAt?: string;
}

export interface PlannerPreviewCardItem {
  key: string;
  title: string;
  prompt: string;
  imageUrl: string | null;
}

export interface PlannerResultPreview {
  subjects: PlannerPreviewCardItem[];
  scenes: PlannerPreviewCardItem[];
  shots: PlannerPreviewCardItem[];
}

export interface PlannerResultSummary {
  stage: string;
  documentTitle: string;
  assistantMessage: string;
  outputKeys: string[];
  subjectCount: number;
  sceneCount: number;
  shotCount: number;
  operationsCount: number;
}

export function readObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

export function readStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.length > 0) : [];
}

function assetPreviewMap(assets: PlannerAssetLike[]) {
  const byId = new Map<string, PlannerAssetLike>();
  for (const asset of assets) {
    byId.set(asset.id, asset);
  }
  return byId;
}

function choosePreviewFromIds(args: {
  referenceAssetIds?: string[];
  generatedAssetIds?: string[];
  assetsById: Map<string, PlannerAssetLike>;
}) {
  const resolvedAssets = [...(args.generatedAssetIds ?? []), ...(args.referenceAssetIds ?? [])]
    .map((id) => args.assetsById.get(id))
    .filter((asset): asset is PlannerAssetLike => Boolean(asset));

  return choosePlannerAssetUrl(
    resolvedAssets.map((asset) => ({
      sourceUrl: asset.sourceUrl ?? null,
      sourceKind: asset.sourceKind,
      createdAt: asset.createdAt,
    })),
  );
}

function readPreviewAssets(input: unknown) {
  return Array.isArray(readObject(input).plannerAssets)
    ? (readObject(input).plannerAssets as unknown[]).filter(
        (item): item is PlannerAssetLike =>
          Boolean(item) && typeof item === 'object' && !Array.isArray(item) && typeof (item as { id?: unknown }).id === 'string',
      )
    : [];
}

export function buildPlannerResultPreview(input: unknown, assistantPackage: unknown): PlannerResultPreview {
  const structuredDoc = readObject(readObject(assistantPackage).structuredDoc);
  const assetsById = assetPreviewMap(readPreviewAssets(input));

  const subjects = Array.isArray(structuredDoc.subjects)
    ? structuredDoc.subjects
        .map((subject, index) => {
          const record = readObject(subject);
          return {
            key: `subject-${index + 1}`,
            title: typeof record.title === 'string' ? record.title : `主体 ${index + 1}`,
            prompt: typeof record.prompt === 'string' ? record.prompt : '',
            imageUrl: choosePreviewFromIds({
              generatedAssetIds: readStringArray(record.generatedAssetIds),
              referenceAssetIds: readStringArray(record.referenceAssetIds),
              assetsById,
            }),
          } satisfies PlannerPreviewCardItem;
        })
        .slice(0, 4)
    : [];

  const scenes = Array.isArray(structuredDoc.scenes)
    ? structuredDoc.scenes
        .map((scene, index) => {
          const record = readObject(scene);
          return {
            key: `scene-${index + 1}`,
            title: typeof record.title === 'string' ? record.title : `场景 ${index + 1}`,
            prompt: typeof record.prompt === 'string' ? record.prompt : '',
            imageUrl: choosePreviewFromIds({
              generatedAssetIds: readStringArray(record.generatedAssetIds),
              referenceAssetIds: readStringArray(record.referenceAssetIds),
              assetsById,
            }),
          } satisfies PlannerPreviewCardItem;
        })
        .slice(0, 4)
    : [];

  const shots = Array.isArray(structuredDoc.acts)
    ? structuredDoc.acts
        .flatMap((act) => {
          const actRecord = readObject(act);
          return Array.isArray(actRecord.shots) ? actRecord.shots : [];
        })
        .map((shot, index) => {
          const record = readObject(shot);
          return {
            key: `shot-${index + 1}`,
            title: typeof record.title === 'string' ? record.title : `分镜 ${index + 1}`,
            prompt: typeof record.visual === 'string' ? record.visual : '',
            imageUrl: choosePreviewFromIds({
              generatedAssetIds: readStringArray(record.generatedAssetIds),
              referenceAssetIds: readStringArray(record.referenceAssetIds),
              assetsById,
            }),
          } satisfies PlannerPreviewCardItem;
        })
        .slice(0, 6)
    : [];

  return { subjects, scenes, shots };
}

export function buildPlannerResultSummary(assistantPackage: unknown): PlannerResultSummary {
  const record = readObject(assistantPackage);
  const structuredDoc = readObject(record.structuredDoc);
  const acts = Array.isArray(structuredDoc.acts) ? structuredDoc.acts : [];
  const shotCount = acts.reduce((total, act) => {
    const shots = readObject(act).shots;
    return total + (Array.isArray(shots) ? shots.length : 0);
  }, 0);
  const operations = Array.isArray(record.operations) ? record.operations : [];

  return {
    stage: typeof record.stage === 'string' ? record.stage : '-',
    documentTitle: typeof record.documentTitle === 'string' ? record.documentTitle : '-',
    assistantMessage: typeof record.assistantMessage === 'string' ? record.assistantMessage : '',
    outputKeys: Object.keys(record),
    subjectCount: Array.isArray(structuredDoc.subjects) ? structuredDoc.subjects.length : 0,
    sceneCount: Array.isArray(structuredDoc.scenes) ? structuredDoc.scenes.length : 0,
    shotCount,
    operationsCount: operations.length,
  };
}

export function summarizePrompt(prompt: string) {
  return {
    charCount: prompt.length,
    lineCount: prompt ? prompt.split(/\r?\n/).length : 0,
  };
}
