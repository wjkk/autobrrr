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

export interface PlannerEntityDebugItem {
  key: string;
  title: string;
  prompt: string;
  bindings: string[];
}

export interface PlannerEntityDebugLayer {
  subjects: PlannerEntityDebugItem[];
  scenes: PlannerEntityDebugItem[];
  shots: PlannerEntityDebugItem[];
}

export interface PlannerEntityDebugView {
  raw: PlannerEntityDebugLayer;
  normalized: PlannerEntityDebugLayer;
  final: PlannerEntityDebugLayer;
  corrections: string[];
}

export interface PlannerResultSummary {
  stage: string;
  documentTitle: string;
  assistantMessage: string;
  outputKeys: string[];
  stepTitles: string[];
  stepCount: number;
  subjectCount: number;
  sceneCount: number;
  shotCount: number;
  operationsCount: number;
  completenessScore: number;
  missingFields: string[];
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

function emptyEntityLayer(): PlannerEntityDebugLayer {
  return {
    subjects: [],
    scenes: [],
    shots: [],
  };
}

function readStructuredEntityLayer(value: unknown): PlannerEntityDebugLayer {
  const root = readObject(value);
  const structuredDoc = readObject(root.structuredDoc);
  const source = Object.keys(structuredDoc).length > 0 ? structuredDoc : root;

  const subjects = Array.isArray(source.subjects)
    ? source.subjects.map((subject, index) => {
        const record = readObject(subject);
        return {
          key: typeof record.entityKey === 'string' ? record.entityKey : `subject-${index + 1}`,
          title: typeof record.title === 'string' ? record.title : `主体 ${index + 1}`,
          prompt: typeof record.prompt === 'string' ? record.prompt : '',
          bindings: [],
        } satisfies PlannerEntityDebugItem;
      })
    : [];

  const scenes = Array.isArray(source.scenes)
    ? source.scenes.map((scene, index) => {
        const record = readObject(scene);
        return {
          key: typeof record.entityKey === 'string' ? record.entityKey : `scene-${index + 1}`,
          title: typeof record.title === 'string' ? record.title : `场景 ${index + 1}`,
          prompt: typeof record.prompt === 'string' ? record.prompt : '',
          bindings: [],
        } satisfies PlannerEntityDebugItem;
      })
    : [];

  const shots = Array.isArray(source.acts)
    ? source.acts.flatMap((act, actIndex) => {
        const actRecord = readObject(act);
        const actTitle = typeof actRecord.title === 'string' ? actRecord.title : `幕 ${actIndex + 1}`;
        const rawShots = Array.isArray(actRecord.shots) ? actRecord.shots : [];
        return rawShots.map((shot, shotIndex) => {
          const record = readObject(shot);
          return {
            key: typeof record.entityKey === 'string' ? record.entityKey : `${actTitle}-shot-${shotIndex + 1}`,
            title: typeof record.title === 'string' ? record.title : `分镜 ${shotIndex + 1}`,
            prompt: typeof record.visual === 'string' ? record.visual : '',
            bindings: readStringArray(record.subjectBindings),
          } satisfies PlannerEntityDebugItem;
        });
      })
    : [];

  return {
    subjects,
    scenes,
    shots,
  };
}

function compareLayerCounts(label: string, rawCount: number, normalizedCount: number, finalCount: number) {
  return rawCount !== normalizedCount || normalizedCount !== finalCount
    ? `${label}数量：raw ${rawCount} -> normalized ${normalizedCount} -> final ${finalCount}`
    : `${label}数量稳定：${finalCount}`;
}

function countBindingChanges(left: PlannerEntityDebugLayer, right: PlannerEntityDebugLayer) {
  const total = Math.max(left.shots.length, right.shots.length);
  let changed = 0;

  for (let index = 0; index < total; index += 1) {
    const leftBindings = left.shots[index]?.bindings ?? [];
    const rightBindings = right.shots[index]?.bindings ?? [];
    if (leftBindings.join('|') !== rightBindings.join('|')) {
      changed += 1;
    }
  }

  return changed;
}

export function buildPlannerEntityDebugView(input: unknown, assistantPackage: unknown): PlannerEntityDebugView {
  const inspection = readObject(readObject(input).assistantPackageInspection);
  const raw = inspection.rawCandidate ? readStructuredEntityLayer(inspection.rawCandidate) : emptyEntityLayer();
  const normalized = inspection.normalizedCandidate ? readStructuredEntityLayer(inspection.normalizedCandidate) : emptyEntityLayer();
  const final = readStructuredEntityLayer(assistantPackage);

  return {
    raw,
    normalized,
    final,
    corrections: [
      compareLayerCounts('主体', raw.subjects.length, normalized.subjects.length, final.subjects.length),
      compareLayerCounts('场景', raw.scenes.length, normalized.scenes.length, final.scenes.length),
      compareLayerCounts('分镜', raw.shots.length, normalized.shots.length, final.shots.length),
      `shot 绑定调整：raw -> normalized ${countBindingChanges(raw, normalized)} 处，normalized -> final ${countBindingChanges(normalized, final)} 处。`,
    ],
  };
}

export function summarizePlannerEntityLayerDiff(leftInput: unknown, leftAssistantPackage: unknown, rightInput: unknown, rightAssistantPackage: unknown) {
  const left = buildPlannerEntityDebugView(leftInput, leftAssistantPackage);
  const right = buildPlannerEntityDebugView(rightInput, rightAssistantPackage);

  return `实体纠偏：A 主体 ${left.raw.subjects.length}/${left.normalized.subjects.length}/${left.final.subjects.length}，场景 ${left.raw.scenes.length}/${left.normalized.scenes.length}/${left.final.scenes.length}；B 主体 ${right.raw.subjects.length}/${right.normalized.subjects.length}/${right.final.subjects.length}，场景 ${right.raw.scenes.length}/${right.normalized.scenes.length}/${right.final.scenes.length}。`;
}

export function buildPlannerResultSummary(assistantPackage: unknown): PlannerResultSummary {
  const record = readObject(assistantPackage);
  const structuredDoc = readObject(record.structuredDoc);
  const acts = Array.isArray(structuredDoc.acts) ? structuredDoc.acts : [];
  const stepAnalysis = Array.isArray(record.stepAnalysis) ? record.stepAnalysis : [];
  const shotCount = acts.reduce((total, act) => {
    const shots = readObject(act).shots;
    return total + (Array.isArray(shots) ? shots.length : 0);
  }, 0);
  const operations = readObject(record.operations);
  const requiredPackageFields = record.stage === 'outline'
    ? ['stage', 'assistantMessage', 'documentTitle', 'outlineDoc', 'operations']
    : ['stage', 'assistantMessage', 'stepAnalysis', 'documentTitle', 'structuredDoc', 'operations'];
  const requiredStructuredDocFields =
    record.stage === 'outline'
      ? []
      : ['projectTitle', 'episodeTitle', 'summaryBullets', 'highlights', 'styleBullets', 'subjectBullets', 'subjects', 'sceneBullets', 'scenes', 'scriptSummary', 'acts'];
  const requiredShotFields = ['title', 'visual', 'composition', 'motion', 'voice', 'line'];
  const missingFields: string[] = [];
  let totalChecks = 0;
  let passedChecks = 0;

  for (const field of requiredPackageFields) {
    totalChecks += 1;
    const value = record[field];
    const present = Array.isArray(value) ? value.length > 0 : value !== undefined && value !== null && value !== '';
    if (present) {
      passedChecks += 1;
    } else {
      missingFields.push(field);
    }
  }

  for (const field of requiredStructuredDocFields) {
    totalChecks += 1;
    const value = structuredDoc[field];
    const present = Array.isArray(value) ? value.length > 0 : value !== undefined && value !== null && value !== '';
    if (present) {
      passedChecks += 1;
    } else {
      missingFields.push(`structuredDoc.${field}`);
    }
  }

  for (const [actIndex, act] of acts.entries()) {
    const shots = Array.isArray(readObject(act).shots) ? (readObject(act).shots as unknown[]) : [];
    for (const [shotIndex, shot] of shots.entries()) {
      const shotRecord = readObject(shot);
      for (const field of requiredShotFields) {
        totalChecks += 1;
        const value = shotRecord[field];
        const present = typeof value === 'string' ? value.trim().length > 0 : value !== undefined && value !== null;
        if (present) {
          passedChecks += 1;
        } else {
          missingFields.push(`acts[${actIndex}].shots[${shotIndex}].${field}`);
        }
      }
    }
  }

  return {
    stage: typeof record.stage === 'string' ? record.stage : '-',
    documentTitle: typeof record.documentTitle === 'string' ? record.documentTitle : '-',
    assistantMessage: typeof record.assistantMessage === 'string' ? record.assistantMessage : '',
    outputKeys: Object.keys(record),
    stepTitles: stepAnalysis
      .map((item, index) => {
        const next = readObject(item);
        return typeof next.title === 'string' && next.title.trim().length > 0 ? next.title : `步骤 ${index + 1}`;
      }),
    stepCount: stepAnalysis.length,
    subjectCount: Array.isArray(structuredDoc.subjects) ? structuredDoc.subjects.length : 0,
    sceneCount: Array.isArray(structuredDoc.scenes) ? structuredDoc.scenes.length : 0,
    shotCount,
    operationsCount: Object.keys(operations).length,
    completenessScore: totalChecks > 0 ? Math.round((passedChecks / totalChecks) * 100) : 100,
    missingFields,
  };
}

export function summarizePrompt(prompt: string) {
  return {
    charCount: prompt.length,
    lineCount: prompt ? prompt.split(/\r?\n/).length : 0,
  };
}
