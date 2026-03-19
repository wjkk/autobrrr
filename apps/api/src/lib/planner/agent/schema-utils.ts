import { readObject, readStringCoerce as readString } from '../../json-helpers.js';

export { readObject, readString };

export function clipText(text: string, max: number) {
  if (text.length <= max) {
    return text;
  }

  return `${text.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}

export function normalizeStringListCandidate(value: unknown, maxItems: number, maxLength: number) {
  const values = Array.isArray(value)
    ? value
    : readString(value)
      ? [value]
      : [];

  return values
    .map((item) => readString(item))
    .filter((item): item is string => item !== null)
    .map((item) => clipText(item, maxLength))
    .slice(0, maxItems);
}

export function normalizeHighlightCandidateList(value: unknown) {
  const values = Array.isArray(value) ? value : [];
  return values
    .map((item, index) => {
      const record = readObject(item);
      const title = readString(record.title) ?? readString(record.name) ?? `亮点${index + 1}`;
      const description =
        readString(record.description)
        ?? readString(record.summary)
        ?? readString(record.detail)
        ?? title;

      return {
        title: clipText(title, 255),
        description: clipText(description, 2000),
      };
    })
    .filter((item) => item.title.trim().length > 0)
    .slice(0, 6);
}

export function findValueByKeyIncludes(record: Record<string, unknown>, fragments: string[]) {
  const entry = Object.entries(record).find(([key]) => fragments.some((fragment) => key.includes(fragment)));
  return entry?.[1];
}
