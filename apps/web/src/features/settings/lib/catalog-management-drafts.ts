import type {
  CatalogStyleItem,
  CatalogSubjectItem,
  CatalogVisibility,
} from './catalog-management-api';
import type { StyleDraft, SubjectDraft } from '../components/catalog-management-editor-types';
import { parseMetadata, parseTags, stringifyJson } from '../components/catalog-management-page-helpers';

export interface CatalogSubjectPayload {
  slug: string;
  name: string;
  visibility: CatalogVisibility;
  subjectType: SubjectDraft['subjectType'];
  genderTag: SubjectDraft['genderTag'];
  previewImageUrl: string;
  referenceImageUrl?: string;
  description?: string;
  promptTemplate?: string;
  negativePrompt?: string;
  tags: string[];
  metadata?: Record<string, unknown>;
  enabled: boolean;
  sortOrder: number;
}

export interface CatalogStylePayload {
  slug: string;
  name: string;
  visibility: CatalogVisibility;
  previewImageUrl: string;
  description?: string;
  promptTemplate?: string;
  negativePrompt?: string;
  tags: string[];
  metadata?: Record<string, unknown>;
  enabled: boolean;
  sortOrder: number;
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

export function toCatalogSubjectPayload(draft: SubjectDraft, publicOnly: boolean): CatalogSubjectPayload {
  return {
    slug: draft.slug.trim(),
    name: draft.name.trim(),
    visibility: publicOnly ? 'public' : draft.visibility,
    subjectType: draft.subjectType,
    genderTag: draft.genderTag,
    previewImageUrl: draft.imageUrl.trim(),
    referenceImageUrl: draft.referenceImageUrl.trim() || undefined,
    description: draft.description.trim() || undefined,
    promptTemplate: draft.promptTemplate.trim() || undefined,
    negativePrompt: draft.negativePrompt.trim() || undefined,
    tags: parseTags(draft.tags),
    metadata: parseMetadata(draft.metadata),
    enabled: draft.enabled,
    sortOrder: draft.sortOrder,
  };
}

export function toCatalogStylePayload(draft: StyleDraft, publicOnly: boolean): CatalogStylePayload {
  return {
    slug: draft.slug.trim(),
    name: draft.name.trim(),
    visibility: publicOnly ? 'public' : draft.visibility,
    previewImageUrl: draft.imageUrl.trim(),
    description: draft.description.trim() || undefined,
    promptTemplate: draft.promptTemplate.trim() || undefined,
    negativePrompt: draft.negativePrompt.trim() || undefined,
    tags: parseTags(draft.tags),
    metadata: parseMetadata(draft.metadata),
    enabled: draft.enabled,
    sortOrder: draft.sortOrder,
  };
}
