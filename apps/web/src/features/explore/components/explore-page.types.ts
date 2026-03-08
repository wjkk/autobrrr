export type ContentTab = '短剧漫剧' | '音乐MV' | '知识分享';

export type ExploreSidebarNav = 'home' | 'projects' | 'avatar' | 'voice';

export type ExplorePopover = 'character' | 'model' | 'imageModel' | null;

export interface ExploreCharacterOption {
  name: string;
  imageUrl: string;
}

export interface ExploreStyleOption {
  name: string;
  imageUrl: string;
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
