import type { PlannerOutlineDoc } from './planner-outline-doc';
import type { PlannerStructuredDoc } from './planner-structured-doc';

function readRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function parseJsonRecord(value: string): Record<string, unknown> | null {
  const trimmed = value.trim();
  if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) {
    return null;
  }

  try {
    const parsed = JSON.parse(trimmed) as unknown;
    return readRecord(parsed);
  } catch {
    return null;
  }
}

function decodeJsonStringValue(value: string) {
  try {
    return JSON.parse(`"${value}"`) as string;
  } catch {
    return value.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
  }
}

function extractJsonLikeStringValue(text: string) {
  const patterns = [
    /"summaryBullets"\s*:\s*\[\s*"((?:\\.|[^"\\])+)"/,
    /"scriptSummary"\s*:\s*\[\s*"((?:\\.|[^"\\])+)"/,
    /"premise"\s*:\s*"((?:\\.|[^"\\])+)"/,
    /"summaryText"\s*:\s*"((?:\\.|[^"\\])+)"/,
    /"summary"\s*:\s*"((?:\\.|[^"\\])+)"/,
    /"故事梗概"\s*:\s*"((?:\\.|[^"\\])+)"/,
    /"核心主题"\s*:\s*"((?:\\.|[^"\\])+)"/,
    /"description"\s*:\s*"((?:\\.|[^"\\])+)"/,
    /"line"\s*:\s*"((?:\\.|[^"\\])+)"/,
    /"assistantMessage"\s*:\s*"((?:\\.|[^"\\])+)"/,
  ];

  for (const pattern of patterns) {
    const match = pattern.exec(text);
    if (match?.[1]) {
      return decodeJsonStringValue(match[1]).trim();
    }
  }

  return null;
}

function joinObjectEntries(value: unknown) {
  const record = readRecord(value);
  if (!record) {
    return null;
  }

  const parts = Object.entries(record)
    .map(([key, entry]) => {
      const text = extractDisplayText(entry);
      return text ? `${key}：${text}` : null;
    })
    .filter((item): item is string => item !== null);

  return parts.length > 0 ? parts.join('；') : null;
}

function extractDisplayText(value: unknown, depth = 0): string | null {
  if (depth > 5) {
    return null;
  }

  const direct = readString(value);
  if (direct) {
    const parsed = parseJsonRecord(direct);
    if (parsed) {
      return extractDisplayText(parsed, depth + 1) ?? direct;
    }

    const jsonLike = extractJsonLikeStringValue(direct);
    if (jsonLike) {
      return jsonLike;
    }

    return direct;
  }

  if (Array.isArray(value)) {
    const parts = value
      .map((item) => extractDisplayText(item, depth + 1))
      .filter((item): item is string => item !== null);

    return parts.length > 0 ? parts.join('；') : null;
  }

  const record = readRecord(value);
  if (!record) {
    return null;
  }

  const structuredDoc = readRecord(record.structuredDoc);
  const outlineDoc = record.outlineDoc;
  const outlineDocRecord = readRecord(outlineDoc);

  const candidates: unknown[] = [
    record.premise,
    record.summary,
    record.summaryText,
    record.description,
    record.line,
    record['故事梗概'],
    record['核心主题'],
    record['剧情摘要'],
    record['情节内容'],
    structuredDoc?.summaryBullets,
    structuredDoc?.scriptSummary,
    outlineDocRecord?.premise,
    outlineDocRecord?.summary,
    outlineDocRecord?.['核心主题'],
    outlineDocRecord?.['故事梗概'],
    joinObjectEntries(record['人物设定']),
    joinObjectEntries(record['三幕主体剧情']),
    joinObjectEntries(record['三幕结构剧情详情']),
    joinObjectEntries(record['三幕结构详情']),
    joinObjectEntries(outlineDocRecord?.['人物设定']),
    joinObjectEntries(outlineDocRecord?.['三幕主体剧情']),
    joinObjectEntries(outlineDocRecord?.['三幕结构剧情详情']),
    joinObjectEntries(outlineDocRecord?.['三幕结构详情']),
    outlineDoc,
    record.assistantMessage,
    record.title,
  ];

  for (const candidate of candidates) {
    const text = extractDisplayText(candidate, depth + 1);
    if (text) {
      return text;
    }
  }

  return null;
}

function sanitizeDisplayText(value: string) {
  return extractDisplayText(value) ?? value;
}

export function sanitizePlannerOutlineDoc(outline: PlannerOutlineDoc): PlannerOutlineDoc {
  return {
    ...outline,
    premise: sanitizeDisplayText(outline.premise),
    mainCharacters: outline.mainCharacters.map((character) => ({
      ...character,
      description: sanitizeDisplayText(character.description),
    })),
    storyArc: outline.storyArc.map((arc) => ({
      ...arc,
      summary: sanitizeDisplayText(arc.summary),
    })),
    constraints: outline.constraints.map(sanitizeDisplayText),
    openQuestions: outline.openQuestions.map(sanitizeDisplayText),
  };
}

export function sanitizePlannerStructuredDoc(doc: PlannerStructuredDoc): PlannerStructuredDoc {
  return {
    ...doc,
    summaryBullets: doc.summaryBullets.map(sanitizeDisplayText),
    highlights: doc.highlights.map((item) => ({
      ...item,
      title: sanitizeDisplayText(item.title),
      description: sanitizeDisplayText(item.description),
    })),
    styleBullets: doc.styleBullets.map(sanitizeDisplayText),
    subjectBullets: doc.subjectBullets.map(sanitizeDisplayText),
    subjects: doc.subjects.map((subject) => ({
      ...subject,
      title: sanitizeDisplayText(subject.title),
      prompt: sanitizeDisplayText(subject.prompt),
    })),
    sceneBullets: doc.sceneBullets.map(sanitizeDisplayText),
    scenes: doc.scenes.map((scene) => ({
      ...scene,
      title: sanitizeDisplayText(scene.title),
      prompt: sanitizeDisplayText(scene.prompt),
    })),
    scriptSummary: doc.scriptSummary.map(sanitizeDisplayText),
    acts: doc.acts.map((act) => ({
      ...act,
      title: sanitizeDisplayText(act.title),
      time: sanitizeDisplayText(act.time),
      location: sanitizeDisplayText(act.location),
      shots: act.shots.map((shot) => ({
        ...shot,
        title: sanitizeDisplayText(shot.title),
        visual: sanitizeDisplayText(shot.visual),
        composition: sanitizeDisplayText(shot.composition),
        motion: sanitizeDisplayText(shot.motion),
        voice: sanitizeDisplayText(shot.voice),
        line: sanitizeDisplayText(shot.line),
      })),
    })),
  };
}

export function summarizePlannerDisplayText(value: unknown, fallback = '') {
  return extractDisplayText(value) ?? fallback;
}
