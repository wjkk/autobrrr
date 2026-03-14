export type CatalogVisibility = 'public' | 'personal';
export type SubjectType = 'human' | 'animal' | 'creature' | 'object';
export type SubjectGenderTag = 'unknown' | 'female' | 'male' | 'child';
export type CatalogTab = 'subjects' | 'styles';

export interface CatalogSubjectItem {
  id: string;
  slug: string;
  name: string;
  visibility: CatalogVisibility;
  subjectType: SubjectType;
  genderTag: SubjectGenderTag;
  imageUrl: string;
  referenceImageUrl?: string | null;
  description?: string | null;
  promptTemplate?: string | null;
  negativePrompt?: string | null;
  tags?: unknown;
  metadata?: Record<string, unknown> | null;
  enabled?: boolean;
  sortOrder?: number;
  ownerUserId?: string | null;
}

export interface CatalogStyleItem {
  id: string;
  slug: string;
  name: string;
  visibility: CatalogVisibility;
  imageUrl: string;
  description?: string | null;
  promptTemplate?: string | null;
  negativePrompt?: string | null;
  tags?: unknown;
  metadata?: Record<string, unknown> | null;
  enabled?: boolean;
  sortOrder?: number;
  ownerUserId?: string | null;
}

export interface SettingsAuthUser {
  id: string;
  email: string;
  displayName: string | null;
}
