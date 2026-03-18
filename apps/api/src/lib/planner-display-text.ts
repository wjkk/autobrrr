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
    return readRecord(JSON.parse(trimmed) as unknown);
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
      const text = summarizePlannerDisplayText(entry);
      return text ? `${key}：${text}` : null;
    })
    .filter((item): item is string => item !== null);

  return parts.length > 0 ? parts.join('；') : null;
}

export function summarizePlannerDisplayText(value: unknown, depth = 0): string | null {
  if (depth > 5) {
    return null;
  }

  const direct = readString(value);
  if (direct) {
    const parsed = parseJsonRecord(direct);
    if (parsed) {
      return summarizePlannerDisplayText(parsed, depth + 1) ?? direct;
    }

    const jsonLike = extractJsonLikeStringValue(direct);
    if (jsonLike) {
      return jsonLike;
    }

    return direct;
  }

  if (Array.isArray(value)) {
    const parts = value
      .map((item) => summarizePlannerDisplayText(item, depth + 1))
      .filter((item): item is string => item !== null);
    return parts.length > 0 ? parts.join('；') : null;
  }

  const record = readRecord(value);
  if (!record) {
    return null;
  }

  const structuredDoc = readRecord(record.structuredDoc);
  const outlineDoc = readRecord(record.outlineDoc);
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
    outlineDoc?.premise,
    outlineDoc?.summary,
    outlineDoc?.['核心主题'],
    outlineDoc?.['故事梗概'],
    joinObjectEntries(record['人物设定']),
    joinObjectEntries(record['三幕主体剧情']),
    joinObjectEntries(record['三幕结构剧情详情']),
    joinObjectEntries(record['三幕结构详情']),
    joinObjectEntries(outlineDoc?.['人物设定']),
    joinObjectEntries(outlineDoc?.['三幕主体剧情']),
    joinObjectEntries(outlineDoc?.['三幕结构剧情详情']),
    joinObjectEntries(outlineDoc?.['三幕结构详情']),
    record.assistantMessage,
    record.title,
  ];

  for (const candidate of candidates) {
    const text = summarizePlannerDisplayText(candidate, depth + 1);
    if (text) {
      return text;
    }
  }

  return null;
}

export function sanitizePlannerDisplayText(value: string) {
  return summarizePlannerDisplayText(value) ?? value;
}
