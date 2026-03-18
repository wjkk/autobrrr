import {
  buildFallbackPlannerOutlineDoc,
  plannerOutlineDocSchema,
  sanitizePlannerOutlineDoc,
} from './planner-outline-doc.js';
import {
  buildFallbackPlannerStructuredDoc,
  plannerStructuredDocSchema,
  sanitizePlannerStructuredDoc,
} from './planner-doc.js';
import type { PlannerStepAnalysisItem } from './planner-agent-package-schemas.js';
import {
  clipText,
  findValueByKeyIncludes,
  normalizeHighlightCandidateList,
  normalizeStringListCandidate,
  readObject,
  readString,
} from './planner-agent-schema-utils.js';

export function normalizePlannerOperationCandidate(value: unknown, stage: 'outline' | 'refinement') {
  const record = readObject(value);
  if (Object.keys(record).length > 0) {
    return {
      replaceDocument: typeof record.replaceDocument === 'boolean' ? record.replaceDocument : stage === 'refinement',
      generateStoryboard: typeof record.generateStoryboard === 'boolean' ? record.generateStoryboard : false,
      confirmOutline: typeof record.confirmOutline === 'boolean' ? record.confirmOutline : stage === 'outline',
    };
  }

  return {
    replaceDocument: stage === 'refinement',
    generateStoryboard: false,
    confirmOutline: stage === 'outline',
  };
}

export function normalizePlannerOutlineDocCandidate(args: {
  value: unknown;
  userPrompt: string;
  projectTitle: string;
  contentType: string;
  subtype: string;
  contentMode?: string | null;
  rawText: string;
}) {
  const direct = plannerOutlineDocSchema.safeParse(args.value);
  if (direct.success) {
    return sanitizePlannerOutlineDoc(direct.data);
  }

  const record = readObject(args.value);
  const fallback = buildFallbackPlannerOutlineDoc({
    userPrompt: args.userPrompt,
    projectTitle: args.projectTitle,
    contentType: args.contentType,
    subtype: args.subtype,
    contentMode: args.contentMode,
    rawText: args.rawText,
  });

  const premise =
    readString(record.premise)
    ?? readString(record.summary)
    ?? readString(record.summaryText)
    ?? readString(record['核心主题'])
    ?? readString(record['故事梗概'])
    ?? fallback.premise;

  const mainCharactersSource = Array.isArray(record.mainCharacters)
    ? record.mainCharacters
    : Object.entries(readObject(record['人物设定'])).map(([name, description]) => ({ name, description }));
  const mainCharacters = mainCharactersSource
    .map((value, index) => {
      const entry = readObject(value);
      const name = readString(entry.name) ?? readString(value) ?? `角色${index + 1}`;
      const role = readString(entry.role) ?? '核心角色';
      const description = readString(entry.description) ?? readString(entry['人物描述']) ?? readString(entry['设定']) ?? name;

      return {
        id: readString(entry.id) ?? `character-${index + 1}`,
        name: clipText(name, 120),
        role: clipText(role, 120),
        description: clipText(description, 1000),
      };
    })
    .filter((item) => item.name.trim().length > 0)
    .slice(0, 12);

  const storyArcSource = Array.isArray(record.storyArc)
    ? record.storyArc
    : Array.isArray(record['三幕结构剧情详情'])
      ? record['三幕结构剧情详情']
      : Object.entries(
          readObject(record['三幕结构剧情详情'] ?? record['三幕结构详情'] ?? record['三幕主体剧情']),
        ).map(([title, summary], index) => ({ title, summary, episodeNo: index + 1 }));
  const storyArc = storyArcSource
    .map((value, index) => {
      const entry = readObject(value);
      const title = readString(entry.title) ?? readString(entry['幕次']) ?? readString(value) ?? `第${index + 1}幕`;
      const summary =
        readString(entry.summary)
        ?? readString(entry['剧情摘要'])
        ?? readString(entry['情节内容'])
        ?? readString(entry['核心目标'])
        ?? title;

      return {
        episodeNo: Number(entry.episodeNo) > 0 ? Number(entry.episodeNo) : index + 1,
        title: clipText(title, 255),
        summary: clipText(summary, 2000),
      };
    })
    .filter((item) => item.title.trim().length > 0)
    .slice(0, 24);

  return sanitizePlannerOutlineDoc(plannerOutlineDocSchema.parse({
    ...fallback,
    genre: clipText(readString(record.genre) ?? readString(record['题材风格']) ?? fallback.genre, 255),
    toneStyle: Array.isArray(record.toneStyle)
      ? record.toneStyle.map((value) => readString(value)).filter((value): value is string => value !== null).slice(0, 12)
      : fallback.toneStyle,
    premise: clipText(premise, 3000),
    mainCharacters: mainCharacters.length > 0 ? mainCharacters : fallback.mainCharacters,
    storyArc: storyArc.length > 0 ? storyArc : fallback.storyArc,
  }));
}

export function normalizePlannerStepAnalysisCandidate(value: unknown, defaultSteps: PlannerStepAnalysisItem[]) {
  const values = Array.isArray(value) ? value : Object.keys(readObject(value)).length > 0 ? [value] : [];
  const items = values
    .map((item, index) => {
      const record = readObject(item);
      const id = readString(record.id) ?? readString(record.stepId) ?? defaultSteps[index]?.id ?? `step-${index + 1}`;
      const title = readString(record.title) ?? defaultSteps[index]?.title ?? `步骤 ${index + 1}`;
      const status = readString(record.status);
      const details =
        Array.isArray(record.details)
          ? record.details
              .map((detail) => readString(detail))
              .filter((detail): detail is string => detail !== null)
              .map((detail) => clipText(detail, 500))
              .slice(0, 8)
          : [];

      return {
        id,
        title,
        status: status === 'pending' || status === 'running' || status === 'failed' ? status : 'done',
        details,
      } satisfies PlannerStepAnalysisItem;
    })
    .filter((item) => item.title.trim().length > 0);

  return items.length > 0 ? items : defaultSteps;
}

export function normalizePlannerStructuredDocCandidate(args: {
  value: unknown;
  userPrompt: string;
  projectTitle: string;
  episodeTitle: string;
  rawText: string;
}) {
  const direct = plannerStructuredDocSchema.safeParse(args.value);
  if (direct.success) {
    return sanitizePlannerStructuredDoc(direct.data);
  }

  const record = readObject(args.value);
  const fallback = buildFallbackPlannerStructuredDoc({
    userPrompt: args.userPrompt,
    projectTitle: args.projectTitle,
    episodeTitle: args.episodeTitle,
    rawText: args.rawText,
  });

  const nativeSummaryBullets = normalizeStringListCandidate(record.summaryBullets, 8, 2000);
  const summary =
    nativeSummaryBullets[0]
    ?? readString(record['故事梗概'])
    ?? readString(record.summary)
    ?? readString(record.summaryText)
    ?? fallback.summaryBullets[0];

  const nativeHighlights = normalizeHighlightCandidateList(record.highlights);
  const narrativeRecord = readObject(
    findValueByKeyIncludes(record, ['三幕主体剧情', '主体剧情'])
      ?? record.story
      ?? record.storyBeats,
  );
  const highlightEntries = Object.entries(narrativeRecord)
    .map(([title, description]) => {
      const text = readString(description);
      if (!text) {
        return null;
      }

      return {
        title: clipText(title, 255),
        description: clipText(text, 2000),
      };
    })
    .filter((item): item is { title: string; description: string } => item !== null)
    .slice(0, 6);

  const nativeStyleBullets = normalizeStringListCandidate(record.styleBullets, 8, 2000);
  const sceneConfigValue = findValueByKeyIncludes(record, ['场景设定']);
  const sceneValues = Array.isArray(sceneConfigValue)
    ? sceneConfigValue
    : Array.isArray(record.scenes)
      ? record.scenes
      : [];
  const scenes = sceneValues
    .map((value, index) => {
      if (typeof value === 'string' && value.trim()) {
        const title = clipText(value.trim(), 120);
        return {
          entityType: 'scene' as const,
          title,
          prompt: clipText(value.trim(), 2000),
        };
      }

      const sceneRecord = readObject(value);
      const title = readString(sceneRecord.title) ?? readString(sceneRecord['场景名称']) ?? `场景${index + 1}`;
      const prompt =
        readString(sceneRecord.prompt)
        ?? readString(sceneRecord.description)
        ?? readString(sceneRecord['场景描述'])
        ?? title;

      return {
        entityType: 'scene' as const,
        title: clipText(title, 120),
        prompt: clipText(prompt, 2000),
      };
    })
    .slice(0, 8);

  const subjectSource = Array.isArray(record.subjects)
    ? record.subjects
    : Array.isArray(record['人物设定'])
      ? record['人物设定']
      : Object.entries(readObject(record['人物设定']))
          .map(([title, description]) => ({ title, description }));
  const subjects = subjectSource
    .map((value, index) => {
      const subjectRecord = readObject(value);
      const title = readString(subjectRecord.title) ?? readString(subjectRecord.name) ?? readString(value) ?? `主体${index + 1}`;
      const prompt =
        readString(subjectRecord.prompt)
        ?? readString(subjectRecord.description)
        ?? readString(subjectRecord.appearance)
        ?? readString(subjectRecord.role)
        ?? title;

      return {
        entityType: 'subject' as const,
        title: clipText(title, 120),
        prompt: clipText(prompt, 2000),
      };
    })
    .filter((item) => item.title.trim().length > 0)
    .slice(0, 8);

  const nativeSubjectBullets = normalizeStringListCandidate(record.subjectBullets, 12, 2000);
  const nativeSceneBullets = normalizeStringListCandidate(record.sceneBullets, 12, 2000);
  const nativeScriptSummary = normalizeStringListCandidate(record.scriptSummary, 8, 500);
  const storyboardValue = findValueByKeyIncludes(record, ['分镜剧本']);
  const actGroups = Array.isArray(storyboardValue)
    ? storyboardValue
    : Array.isArray(record['分镜剧本'])
      ? record['分镜剧本']
      : Array.isArray(record.acts)
        ? record.acts
        : [];
  const acts = actGroups
    .map((group, groupIndex) => {
      const groupRecord = readObject(group);
      const shotGroupValue = findValueByKeyIncludes(groupRecord, ['分镜内容']);
      const shotValues = Array.isArray(shotGroupValue)
        ? shotGroupValue
        : Array.isArray(groupRecord.shots)
          ? groupRecord.shots
          : [];
      const shots = shotValues
        .map((shot, shotIndex) => {
          const shotRecord = readObject(shot);
          const visual =
            readString(shotRecord.visual)
            ?? readString(shotRecord['画面'])
            ?? readString(shotRecord['画面内容'])
            ?? args.userPrompt;
          const composition =
            readString(shotRecord.composition)
            ?? readString(shotRecord['构图'])
            ?? readString(shotRecord['构图设计'])
            ?? '中景，主体明确，空间关系清晰。';
          const motion =
            readString(shotRecord.motion)
            ?? readString(shotRecord['运镜'])
            ?? readString(shotRecord['镜头语言'])
            ?? '缓慢推进，建立氛围。';
          const voice =
            readString(shotRecord.voice)
            ?? readString(shotRecord['配音'])
            ?? readString(shotRecord['配音角色'])
            ?? '旁白';
          const line =
            readString(shotRecord.line)
            ?? readString(shotRecord['台词'])
            ?? readString(shotRecord['台词内容'])
            ?? readString(shotRecord['音效'])
            ?? '无对白，以动作和氛围推进。';

          return {
            title: clipText(
              readString(shotRecord.title)
                ?? readString(shotRecord['镜头序号'])
                ?? readString(shotRecord['分镜序号'])
                ?? `分镜${groupIndex + 1}-${shotIndex + 1}`,
              120,
            ),
            visual: clipText(visual, 2000),
            composition: clipText(composition, 1000),
            motion: clipText(motion, 1000),
            voice: clipText(voice, 120),
            line: clipText(line, 1000),
          };
        })
        .filter((shot) => shot.title.trim().length > 0)
        .slice(0, 12);

      if (shots.length === 0) {
        return null;
      }

      return {
        title: clipText(readString(groupRecord.title) ?? readString(groupRecord['幕数']) ?? `第${groupIndex + 1}幕`, 120),
        time: clipText(readString(groupRecord.time) ?? readString(groupRecord['分镜组时长']) ?? fallback.acts[0]?.time ?? '', 120),
        location: clipText(
          readString(groupRecord.location)
            ?? readString(groupRecord['场景'])
            ?? scenes[groupIndex]?.title
            ?? fallback.acts[0]?.location
            ?? '',
          120,
        ),
        shots,
      };
    })
    .filter((act): act is NonNullable<typeof act> => act !== null)
    .slice(0, 8);

  return sanitizePlannerStructuredDoc(plannerStructuredDocSchema.parse({
    ...fallback,
    projectTitle: clipText(readString(record.projectTitle) ?? fallback.projectTitle, 255),
    episodeTitle: clipText(readString(record.episodeTitle) ?? fallback.episodeTitle, 255),
    episodeCount: Number(record.episodeCount) > 0 ? Number(record.episodeCount) : fallback.episodeCount,
    pointCost: Number(record.pointCost) >= 0 ? Math.min(999, Math.floor(Number(record.pointCost))) : fallback.pointCost,
    summaryBullets: nativeSummaryBullets.length > 0 ? nativeSummaryBullets : [clipText(summary, 2000)],
    highlights: nativeHighlights.length > 0 ? nativeHighlights : highlightEntries.length > 0 ? highlightEntries : fallback.highlights,
    styleBullets: nativeStyleBullets.length > 0 ? nativeStyleBullets : fallback.styleBullets,
    subjectBullets:
      nativeSubjectBullets.length > 0
        ? nativeSubjectBullets
        : subjects.length > 0
          ? subjects.map((subject) => clipText(`${subject.title}：${subject.prompt}`, 2000))
          : fallback.subjectBullets,
    subjects: subjects.length > 0 ? subjects : fallback.subjects,
    sceneBullets:
      nativeSceneBullets.length > 0
        ? nativeSceneBullets
        : scenes.length > 0
          ? scenes.map((scene) => clipText(scene.title, 2000))
          : fallback.sceneBullets,
    scenes: scenes.length > 0 ? scenes : fallback.scenes,
    scriptSummary:
      nativeScriptSummary.length > 0
        ? nativeScriptSummary
        : highlightEntries.length > 0
          ? highlightEntries.map((item) => clipText(`${item.title}：${item.description}`, 500)).slice(0, 8)
          : fallback.scriptSummary,
    acts: acts.length > 0 ? acts : fallback.acts,
  }));
}

export function normalizePlannerAssistantPackageCandidate(args: {
  parsed: unknown;
  userPrompt: string;
  projectTitle: string;
  episodeTitle: string;
  defaultSteps: PlannerStepAnalysisItem[];
  contentType: string;
  subtype: string;
  contentMode?: string | null;
  rawText: string;
}) {
  const record = readObject(args.parsed);
  const stage = readString(record.stage) === 'outline' ? 'outline' : 'refinement';

  if (stage === 'outline') {
    return {
      stage,
      assistantMessage: readString(record.assistantMessage) ?? '已根据当前需求生成可确认的大纲版本。',
      documentTitle: readString(record.documentTitle) ?? undefined,
      outlineDoc: normalizePlannerOutlineDocCandidate({
        value: record.outlineDoc,
        userPrompt: args.userPrompt,
        projectTitle: args.projectTitle,
        contentType: args.contentType,
        subtype: args.subtype,
        contentMode: args.contentMode,
        rawText: args.rawText,
      }),
      operations: normalizePlannerOperationCandidate(record.operations, 'outline'),
    };
  }

  return {
    stage,
    assistantMessage: readString(record.assistantMessage) ?? `已按${args.contentType} / ${args.subtype}的逻辑完成细化。`,
    stepAnalysis: normalizePlannerStepAnalysisCandidate(record.stepAnalysis, args.defaultSteps),
    documentTitle: readString(record.documentTitle) ?? undefined,
    structuredDoc: normalizePlannerStructuredDocCandidate({
      value: record.structuredDoc,
      userPrompt: args.userPrompt,
      projectTitle: args.projectTitle,
      episodeTitle: args.episodeTitle,
      rawText: args.rawText,
    }),
    operations: normalizePlannerOperationCandidate(record.operations, 'refinement'),
  };
}
