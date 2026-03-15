import type { CatalogVisibility, SubjectGenderTag, SubjectType } from '../lib/catalog-management-api';

export interface SubjectDraft {
  id: string | null;
  slug: string;
  name: string;
  visibility: CatalogVisibility;
  subjectType: SubjectType;
  genderTag: SubjectGenderTag;
  imageUrl: string;
  referenceImageUrl: string;
  description: string;
  promptTemplate: string;
  negativePrompt: string;
  tags: string;
  metadata: string;
  enabled: boolean;
  sortOrder: number;
}

export interface StyleDraft {
  id: string | null;
  slug: string;
  name: string;
  visibility: CatalogVisibility;
  imageUrl: string;
  description: string;
  promptTemplate: string;
  negativePrompt: string;
  tags: string;
  metadata: string;
  enabled: boolean;
  sortOrder: number;
}
