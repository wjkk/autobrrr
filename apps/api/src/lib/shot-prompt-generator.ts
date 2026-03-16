import type { VideoModelCapability } from './model-capability.js';

export interface PlannerPromptShotInput {
  id: string;
  sceneId?: string | null;
  sceneName?: string | null;
  actKey: string;
  actTitle: string;
  shotNo?: string | null;
  title: string;
  durationSeconds?: number | null;
  visualDescription: string;
  composition: string;
  cameraMotion: string;
  voiceRole?: string | null;
  dialogue?: string | null;
  soundDesign?: string | null;
  sortOrder?: number | null;
}

export interface ShotPromptOutput {
  groupId: string;
  modelFamilySlug: string;
  shotIds: string[];
  actId: string;
  mode: 'multi-shot' | 'single-shot';
  promptText: string;
  promptPayload: {
    familySlug: string;
    supportsMultiShot: boolean;
    shotCount: number;
    audioDescStyle: VideoModelCapability['audioDescStyle'];
    cameraVocab: VideoModelCapability['cameraVocab'];
  };
}

export interface GenerateShotPromptsInput {
  modelFamilySlug: string;
  capability: VideoModelCapability;
  shots: PlannerPromptShotInput[];
}

const compositionLexicon = [
  ['大特写', 'extreme close-up'],
  ['特写', 'close-up'],
  ['近景', 'close shot'],
  ['中景', 'medium shot'],
  ['全景', 'wide shot'],
] as const;

const cameraLexicon = [
  ['推镜', 'dolly in'],
  ['拉镜', 'dolly out'],
  ['移镜', 'tracking shot'],
  ['跟拍', 'follow shot'],
  ['摇镜', 'pan shot'],
  ['俯拍', 'top-down shot'],
  ['仰拍', 'low-angle shot'],
  ['环绕', 'orbit shot'],
  ['升镜', 'crane up'],
  ['降镜', 'crane down'],
] as const;

function normalizeText(value: string | null | undefined) {
  return typeof value === 'string' ? value.trim() : '';
}

function toEnglishCinematic(text: string) {
  let next = text;
  for (const [source, target] of compositionLexicon) {
    next = next.replaceAll(source, target);
  }
  for (const [source, target] of cameraLexicon) {
    next = next.replaceAll(source, target);
  }
  return next;
}

function formatComposition(text: string, capability: VideoModelCapability) {
  if (capability.cameraVocab === 'english-cinematic') {
    return toEnglishCinematic(text);
  }
  return text;
}

function formatCameraMotion(text: string, capability: VideoModelCapability) {
  if (capability.cameraVocab === 'english-cinematic') {
    return toEnglishCinematic(text);
  }
  return text;
}

function formatAudioHint(shot: PlannerPromptShotInput, capability: VideoModelCapability) {
  if (capability.audioDescStyle !== 'inline') {
    return '';
  }
  return normalizeText(shot.soundDesign);
}

function sortShots(shots: PlannerPromptShotInput[]) {
  return shots
    .slice()
    .sort((left, right) => {
      const sortOrderDiff = (left.sortOrder ?? Number.MAX_SAFE_INTEGER) - (right.sortOrder ?? Number.MAX_SAFE_INTEGER);
      if (sortOrderDiff !== 0) {
        return sortOrderDiff;
      }
      return left.id.localeCompare(right.id);
    });
}

export function groupShotsForMultiShotModel(args: {
  shots: PlannerPromptShotInput[];
  maxShotsPerGeneration: number;
}) {
  const normalizedShots = sortShots(args.shots);
  const groups: PlannerPromptShotInput[][] = [];
  let currentActKey: string | null = null;
  let currentGroup: PlannerPromptShotInput[] = [];

  for (const shot of normalizedShots) {
    const shouldFlush =
      currentGroup.length > 0
      && (currentActKey !== shot.actKey || currentGroup.length >= args.maxShotsPerGeneration);

    if (shouldFlush) {
      groups.push(currentGroup);
      currentGroup = [];
    }

    currentGroup.push(shot);
    currentActKey = shot.actKey;
  }

  if (currentGroup.length > 0) {
    groups.push(currentGroup);
  }

  return groups;
}

function buildShotSentence(shot: PlannerPromptShotInput, capability: VideoModelCapability) {
  const visual = normalizeText(shot.visualDescription);
  const composition = formatComposition(normalizeText(shot.composition), capability);
  const motion = formatCameraMotion(normalizeText(shot.cameraMotion), capability);
  const dialogue = normalizeText(shot.dialogue);
  const audioHint = formatAudioHint(shot, capability);

  return [
    composition,
    visual,
    motion,
    audioHint,
    dialogue ? `对白/旁白：${dialogue}` : '',
  ]
    .filter(Boolean)
    .join('，')
    .trim();
}

export function formatPromptForNarrativeModel(args: {
  shots: PlannerPromptShotInput[];
  capability: VideoModelCapability;
}) {
  return args.shots
    .map((shot, index) => {
      const prefix = index === 0 ? '开场' : `镜头${index + 1}`;
      const sceneName = normalizeText(shot.sceneName);
      const duration = typeof shot.durationSeconds === 'number' && shot.durationSeconds > 0 ? `时长约 ${shot.durationSeconds} 秒` : '';
      return [prefix, sceneName, duration, buildShotSentence(shot, args.capability)].filter(Boolean).join('，');
    })
    .join('。') + '。';
}

export function formatPromptForSingleShotModel(args: {
  shot: PlannerPromptShotInput;
  capability: VideoModelCapability;
}) {
  const sceneName = normalizeText(args.shot.sceneName);
  return [sceneName, buildShotSentence(args.shot, args.capability)]
    .filter(Boolean)
    .join('，')
    .trim() + '。';
}

export function generateShotPrompts(input: GenerateShotPromptsInput): ShotPromptOutput[] {
  const shots = sortShots(input.shots);
  if (shots.length === 0) {
    return [];
  }

  if (!input.capability.supportsMultiShot || input.capability.promptStyle === 'single-shot') {
    return shots.map((shot) => ({
      groupId: `${shot.actKey}:${shot.id}`,
      modelFamilySlug: input.modelFamilySlug,
      shotIds: [shot.id],
      actId: shot.actKey,
      mode: 'single-shot',
      promptText: formatPromptForSingleShotModel({
        shot,
        capability: input.capability,
      }),
      promptPayload: {
        familySlug: input.modelFamilySlug,
        supportsMultiShot: false,
        shotCount: 1,
        audioDescStyle: input.capability.audioDescStyle,
        cameraVocab: input.capability.cameraVocab,
      },
    }));
  }

  return groupShotsForMultiShotModel({
    shots,
    maxShotsPerGeneration: input.capability.maxShotsPerGeneration,
  }).map((group, index) => ({
    groupId: `${group[0]?.actKey ?? 'act'}:group-${index + 1}`,
    modelFamilySlug: input.modelFamilySlug,
    shotIds: group.map((shot) => shot.id),
    actId: group[0]?.actKey ?? 'act',
    mode: 'multi-shot',
    promptText: formatPromptForNarrativeModel({
      shots: group,
      capability: input.capability,
    }),
    promptPayload: {
      familySlug: input.modelFamilySlug,
      supportsMultiShot: true,
      shotCount: group.length,
      audioDescStyle: input.capability.audioDescStyle,
      cameraVocab: input.capability.cameraVocab,
    },
  }));
}
