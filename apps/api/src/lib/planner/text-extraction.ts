import { readObject } from '../json-helpers.js';

export function findStringDeep(value: unknown, keys: string[]): string | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const record = value as Record<string, unknown>;
  for (const key of keys) {
    const direct = typeof record[key] === 'string' && record[key] ? (record[key] as string) : null;
    if (direct) {
      return direct;
    }
  }

  for (const nested of Object.values(record)) {
    const found = findStringDeep(nested, keys);
    if (found) {
      return found;
    }
  }

  return null;
}

export function extractPlannerText(providerData: unknown, fallbackPrompt: string) {
  const record = readObject(providerData);

  if (typeof record.output_text === 'string' && record.output_text.trim()) {
    return record.output_text.trim();
  }

  const outputs = Array.isArray(record.output) ? record.output : [];
  for (const output of outputs) {
    const content = Array.isArray(readObject(output).content) ? (readObject(output).content as unknown[]) : [];
    for (const item of content) {
      const candidate = readObject(item);
      const text = typeof candidate.text === 'string' ? candidate.text.trim() : '';
      if (text) {
        return text;
      }
    }
  }

  const choices = Array.isArray(record.choices) ? record.choices : [];
  for (const choice of choices) {
    const message = readObject(readObject(choice).message);
    const content = message.content;
    if (typeof content === 'string' && content.trim()) {
      return content.trim();
    }
  }

  const candidates = Array.isArray(record.candidates) ? record.candidates : [];
  for (const candidate of candidates) {
    const content = readObject(readObject(candidate).content);
    const parts = Array.isArray(content.parts) ? content.parts : [];
    const textPart = parts.find((part) => typeof readObject(part).text === 'string');
    const text = textPart ? (readObject(textPart).text as string).trim() : '';
    if (text) {
      return text;
    }
  }

  return `【策划草案】\n主题：${fallbackPrompt}\n\n1. 故事梗概：围绕该主题生成单集短片策划。\n2. 视觉风格：保持角色一致性与镜头节奏。\n3. 分镜方向：先建立场景，再推进动作与情绪变化。`;
}
