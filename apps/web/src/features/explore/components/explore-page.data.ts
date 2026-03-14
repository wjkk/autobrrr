import type {
  ContentTab,
  ExplorePresetCard,
  InspirationCard,
} from './explore-page.types';

export const CONTENT_TABS: Array<{ id: ContentTab; beta?: boolean }> = [
  { id: '短剧漫剧' },
  { id: '音乐MV', beta: true },
  { id: '知识分享' },
];

export const TAB_PLACEHOLDERS: Record<ContentTab, string> = {
  短剧漫剧: '输入你的灵感，AI 会为你自动策划内容生成视频',
  音乐MV: '上传音乐, AI会帮你自动生成MV剧本',
  知识分享: '输入你的主题, AI 会为你自动策划内容生成视频',
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
      'https://images.unsplash.com/photo-1542204165-65bf26472b9b?auto=format&fit=crop&q=80&w=200',
      'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80&w=200',
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
    ],
  },
  {
    title: '旁白解说',
    seedPrompt: '旁白解说：',
    previewUrls: [
      'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&q=80&w=200',
      'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80&w=200',
      'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&q=80&w=200',
    ],
  },
];

const MV_PRESETS: ExplorePresetCard[] = [
  {
    title: '剧情MV',
    seedPrompt: '剧情MV：',
    previewUrls: [
      'https://images.unsplash.com/photo-1516280440502-a2f011ba228b?auto=format&fit=crop&q=80&w=200',
      'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&q=80&w=200',
      'https://images.unsplash.com/photo-1506157786151-b8491531f063?auto=format&fit=crop&q=80&w=200',
    ],
  },
  {
    title: '表演MV',
    seedPrompt: '表演MV：',
    previewUrls: [
      'https://images.unsplash.com/photo-1493225457124-b1f4862dc96f?auto=format&fit=crop&q=80&w=200',
      'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&q=80&w=200',
      'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?auto=format&fit=crop&q=80&w=200',
    ],
  },
];

const EDUCATION_PRESETS: ExplorePresetCard[] = [
  {
    title: '知识科普',
    seedPrompt: '知识科普：',
    previewUrls: [
      'https://images.unsplash.com/photo-1518364538176-bfddf9dafeaf?auto=format&fit=crop&q=80&w=200',
      'https://images.unsplash.com/photo-1473091534298-04dcbce3278c?auto=format&fit=crop&q=80&w=200',
      'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=200',
    ],
  },
  {
    title: '情感哲言',
    seedPrompt: '情感哲言：',
    previewUrls: [
      'https://images.unsplash.com/photo-1499209974431-9dddcece7f88?auto=format&fit=crop&q=80&w=200',
      'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&q=80&w=200',
      'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=200',
    ],
  },
  {
    title: '旅游宣传',
    seedPrompt: '旅游宣传：',
    previewUrls: [
      'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&q=80&w=200',
      'https://images.unsplash.com/photo-1504280650505-89f929388f6c?auto=format&fit=crop&q=80&w=200',
      'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&q=80&w=200',
    ],
  },
  {
    title: '历史文化',
    seedPrompt: '历史文化：',
    previewUrls: [
      'https://images.unsplash.com/photo-1590856029826-c7a73142bbf1?auto=format&fit=crop&q=80&w=200',
      'https://images.unsplash.com/photo-1518998053401-b20fbfbc76a4?auto=format&fit=crop&q=80&w=200',
      'https://images.unsplash.com/photo-1520037130009-ebcc652a92c3?auto=format&fit=crop&q=80&w=200',
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
