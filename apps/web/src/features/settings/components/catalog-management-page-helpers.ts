import type {
  CatalogStyleItem,
  CatalogSubjectItem,
} from '../lib/catalog-management-api';
import type { StyleDraft, SubjectDraft } from './catalog-management-editor-types';

export type ApiEnvelope<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code?: string; message?: string } };

export function parseApiEnvelope<T>(payload: unknown): ApiEnvelope<T> {
  return payload as ApiEnvelope<T>;
}

export function stringifyJson(value: unknown) {
  if (!value) {
    return '';
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return '';
  }
}

export function parseTags(input: string) {
  return input
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

export function parseMetadata(input: string) {
  const normalized = input.trim();
  if (!normalized) {
    return undefined;
  }

  return JSON.parse(normalized) as Record<string, unknown>;
}

export function makeEmptySubjectDraft(): SubjectDraft {
  return {
    id: null,
    slug: '',
    name: '',
    visibility: 'personal',
    subjectType: 'human',
    genderTag: 'unknown',
    imageUrl: '',
    referenceImageUrl: '',
    description: '',
    promptTemplate: '',
    negativePrompt: '',
    tags: '',
    metadata: '',
    enabled: true,
    sortOrder: 100,
  };
}

export function makeEmptyStyleDraft(): StyleDraft {
  return {
    id: null,
    slug: '',
    name: '',
    visibility: 'personal',
    imageUrl: '',
    description: '',
    promptTemplate: '',
    negativePrompt: '',
    tags: '',
    metadata: '',
    enabled: true,
    sortOrder: 100,
  };
}

export function subjectToDraft(subject: CatalogSubjectItem): SubjectDraft {
  return {
    id: subject.id,
    slug: subject.slug,
    name: subject.name,
    visibility: subject.visibility,
    subjectType: subject.subjectType,
    genderTag: subject.genderTag,
    imageUrl: subject.imageUrl,
    referenceImageUrl: subject.referenceImageUrl ?? '',
    description: subject.description ?? '',
    promptTemplate: subject.promptTemplate ?? '',
    negativePrompt: subject.negativePrompt ?? '',
    tags: Array.isArray(subject.tags) ? subject.tags.join(', ') : '',
    metadata: stringifyJson(subject.metadata),
    enabled: subject.enabled ?? true,
    sortOrder: subject.sortOrder ?? 100,
  };
}

export function styleToDraft(style: CatalogStyleItem): StyleDraft {
  return {
    id: style.id,
    slug: style.slug,
    name: style.name,
    visibility: style.visibility,
    imageUrl: style.imageUrl,
    description: style.description ?? '',
    promptTemplate: style.promptTemplate ?? '',
    negativePrompt: style.negativePrompt ?? '',
    tags: Array.isArray(style.tags) ? style.tags.join(', ') : '',
    metadata: stringifyJson(style.metadata),
    enabled: style.enabled ?? true,
    sortOrder: style.sortOrder ?? 100,
  };
}

export function nextImageFeedbackTone(message: string, isError: boolean): 'idle' | 'pending' | 'success' | 'error' {
  if (!message) {
    return 'idle';
  }
  if (isError) {
    return 'error';
  }
  if (message.includes('正在') || message.includes('中…')) {
    return 'pending';
  }
  return 'success';
}
