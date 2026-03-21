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
  {
    id: 'work-1',
    type: 'work',
    title: '午夜对白',
    category: '短剧漫剧',
    author: 'Seko Studio',
    metric: '2.4k 播放',
    accent: '对白张力',
    rowSpan: 20,
    imageUrl: '/seko-explore-presets/drama/dialogue-1.png',
    likeCount: '7',
  },
  {
    id: 'ad-model-new',
    type: 'ad',
    rowSpan: 32,
    imageUrl: '/seko-explore-presets/knowledge/science-2.png',
    brand: 'AutoBrrr',
    title: '模型上新',
    summary: '一致性模型3.0 / seedream2.0',
  },
  {
    id: 'work-2',
    type: 'work',
    title: '镜前独白',
    category: '音乐 MV',
    author: 'Neon Frame',
    metric: '18k 播放',
    accent: '人物表演',
    rowSpan: 16,
    imageUrl: '/seko-explore-presets/mv/show-2.png',
    likeCount: '117',
  },
  {
    id: 'work-3',
    type: 'work',
    title: '行星课堂',
    category: '知识分享',
    author: 'Orbit Lab',
    metric: '1.2k 收藏',
    accent: '科学可视化',
    rowSpan: 22,
    imageUrl: '/seko-explore-presets/knowledge/science-1.png',
    likeCount: '3',
  },
  {
    id: 'work-4',
    type: 'work',
    title: '海岸情绪',
    category: '旅游宣传',
    author: 'Blue Road',
    metric: '6.7k 播放',
    accent: '氛围转场',
    rowSpan: 18,
    imageUrl: '/seko-explore-presets/knowledge/travel-2.png',
    likeCount: '20',
  },
  {
    id: 'work-5',
    type: 'work',
    title: '古城回声',
    category: '历史文化',
    author: 'Archive Motion',
    metric: '4.1k 播放',
    accent: '古风叙事',
    rowSpan: 28,
    imageUrl: '/seko-explore-presets/knowledge/history-3.png',
    likeCount: '4',
  },
];
