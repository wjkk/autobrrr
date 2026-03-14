import type {
  ContentTab,
  ExplorePresetCard,
  InspirationCard,
} from './explore-page.types';

export const CONTENT_TABS: Array<{ id: ContentTab; beta?: boolean }> = [
  { id: '短剧漫剧' },
  { id: '音乐MV' },
  { id: '知识分享' },
];

export const TAB_PLACEHOLDERS: Record<ContentTab, string> = {
  短剧漫剧: '输入你的灵感，AI 会为你自动策划内容生成视频',
  音乐MV: '上传音乐，AI 会帮你自动生成MV剧本',
  知识分享: '输入你的主题，AI 会为你自动策划内容生成视频',
};

export const TAB_PREFIX_CLASS_SUFFIX: Record<ContentTab, 'drama' | 'mv' | 'edu'> = {
  短剧漫剧: 'drama',
  音乐MV: 'mv',
  知识分享: 'edu',
};

const DRAMA_PRESETS: ExplorePresetCard[] = [
  {
    title: '对话剧情',
    seedPrompt: '对话剧情：',
    previewUrls: [
      '/seko-explore-presets/drama/dialogue-1.png',
      '/seko-explore-presets/drama/dialogue-2.png',
      '/seko-explore-presets/drama/dialogue-3.png',
    ],
  },
  {
    title: '旁白解说',
    seedPrompt: '旁白解说：',
    previewUrls: [
      '/seko-explore-presets/drama/narration-1.png',
      '/seko-explore-presets/drama/narration-2.png',
      '/seko-explore-presets/drama/narration-3.png',
    ],
  },
];

const MV_PRESETS: ExplorePresetCard[] = [
  {
    title: '剧情MV',
    seedPrompt: '剧情MV：',
    previewUrls: [
      '/seko-explore-presets/mv/plot-1.png',
      '/seko-explore-presets/mv/plot-2.png',
      '/seko-explore-presets/mv/plot-3.png',
    ],
  },
  {
    title: '表演MV',
    seedPrompt: '表演MV：',
    previewUrls: [
      '/seko-explore-presets/mv/show-1.png',
      '/seko-explore-presets/mv/show-2.png',
      '/seko-explore-presets/mv/show-3.png',
    ],
  },
  {
    title: '演唱MV',
    seedPrompt: '演唱MV：',
    previewUrls: [
      '/seko-explore-presets/mv/sing-1.png',
      '/seko-explore-presets/mv/sing-2.png',
      '/seko-explore-presets/mv/sing-3.png',
    ],
  },
  {
    title: '氛围MV',
    seedPrompt: '氛围MV：',
    previewUrls: [
      '/seko-explore-presets/mv/view-1.png',
      '/seko-explore-presets/mv/view-2.png',
      '/seko-explore-presets/mv/view-3.png',
    ],
  },
];

const EDUCATION_PRESETS: ExplorePresetCard[] = [
  {
    title: '知识科普',
    seedPrompt: '知识科普：',
    previewUrls: [
      '/seko-explore-presets/knowledge/science-1.png',
      '/seko-explore-presets/knowledge/science-2.png',
      '/seko-explore-presets/knowledge/science-3.png',
    ],
  },
  {
    title: '情感哲言',
    seedPrompt: '情感哲言：',
    previewUrls: [
      '/seko-explore-presets/knowledge/emotion-1.png',
      '/seko-explore-presets/knowledge/emotion-2.png',
      '/seko-explore-presets/knowledge/emotion-3.png',
    ],
  },
  {
    title: '旅游宣传',
    seedPrompt: '旅游宣传：',
    previewUrls: [
      '/seko-explore-presets/knowledge/travel-1.png',
      '/seko-explore-presets/knowledge/travel-2.png',
      '/seko-explore-presets/knowledge/travel-3.png',
    ],
  },
  {
    title: '历史文化',
    seedPrompt: '历史文化：',
    previewUrls: [
      '/seko-explore-presets/knowledge/history-1.png',
      '/seko-explore-presets/knowledge/history-2.png',
      '/seko-explore-presets/knowledge/history-3.png',
    ],
  },
];

export const PRESET_LIBRARY: Record<ContentTab, ExplorePresetCard[]> = {
  短剧漫剧: DRAMA_PRESETS,
  音乐MV: MV_PRESETS,
  知识分享: EDUCATION_PRESETS,
};

export const INSPIRATION_CARDS: InspirationCard[] = [
  { id: 'work-1', type: 'work', rowSpan: 20, imageClass: 'mockImgAnime1', likeCount: '7' },
  {
    id: 'ad-model-new',
    type: 'ad',
    rowSpan: 32,
    imageClass: 'mockImgReal1',
    brand: 'AutoBrrr',
    title: '模型上新',
    summary: '一致性模型3.0 / seedream2.0',
  },
  { id: 'work-2', type: 'work', rowSpan: 16, imageClass: 'mockImgFilm1', likeCount: '117' },
  { id: 'work-3', type: 'work', rowSpan: 22, imageClass: 'mockImgSci1', likeCount: '3' },
  { id: 'work-4', type: 'work', rowSpan: 18, imageClass: 'mockImgAnime2', likeCount: '20' },
  { id: 'work-5', type: 'work', rowSpan: 28, imageClass: 'mockImgReal2', likeCount: '4' },
];
