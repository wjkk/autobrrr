export type ContentTab = '短剧漫剧' | '音乐MV' | '知识分享';

export type ExploreSidebarNav = 'home' | 'projects' | 'avatar' | 'voice';

export type ExplorePopover = 'character' | 'model' | 'imageModel' | null;

export type ExploreCatalogScope = 'all' | 'public' | 'personal';
export type ExploreSubjectGenderFilter = 'all' | 'female' | 'male' | 'none';
export type ExploreSubjectAgeFilter = 'all' | 'child' | 'teenager' | 'young_adult' | 'middle_aged' | 'elderly' | 'none';
export type ExploreSubjectSourceType = 'all' | 'character' | 'scene';

export interface ExploreSubjectMetadata {
  sourceCatalog?: string;
  sourceId?: string;
  sourceSeq?: number;
  sourceType?: string;
  sourceGender?: string;
  sourceAgeGroup?: string;
  sourceVisionStyleId?: number;
  sourceIdentity?: string;
  sourceCollectedFlag?: boolean;
  sourceCreateTime?: number;
}

export interface ExploreCharacterOption {
  id: string;
  slug: string;
  name: string;
  imageUrl: string;
  visibility: 'public' | 'personal';
  subjectType: 'human' | 'animal' | 'creature' | 'object';
  genderTag: 'unknown' | 'female' | 'male' | 'child';
  description?: string | null;
  promptTemplate?: string | null;
  negativePrompt?: string | null;
  tags?: unknown;
  metadata?: ExploreSubjectMetadata | null;
  enabled?: boolean;
  sortOrder?: number;
  ownerUserId?: string | null;
}

export interface ExploreStyleOption {
  id: string;
  slug: string;
  name: string;
  imageUrl: string;
  visibility: 'public' | 'personal';
  description?: string | null;
  promptTemplate?: string | null;
  negativePrompt?: string | null;
  tags?: unknown;
  metadata?: Record<string, unknown> | null;
  enabled?: boolean;
  sortOrder?: number;
  ownerUserId?: string | null;
}

export interface ExplorePresetCard {
  title: string;
  seedPrompt: string;
  previewUrls: [string, string, string];
}

export type InspirationCard =
  | {
      id: string;
      type: 'work';
      rowSpan: number;
      imageClass: string;
      likeCount: string;
    }
  | {
      id: string;
      type: 'ad';
      rowSpan: number;
      imageClass: string;
      brand: string;
      title: string;
      summary: string;
    };
