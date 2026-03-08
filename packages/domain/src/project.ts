import type { ExecutionMode, ProjectContentMode, ProjectStatus } from './shared';

export interface ProjectSummary {
  id: string;
  title: string;
  brief: string;
  contentMode: ProjectContentMode;
  executionMode: ExecutionMode;
  aspectRatio: '9:16' | '16:9' | '1:1';
  status: ProjectStatus;
}

export interface EpisodeSummary {
  id: string;
  title: string;
  summary: string;
  sequence: number;
  status: ProjectStatus;
}

export interface ExploreFeedItem {
  id: string;
  title: string;
  author: string;
  stats: string;
  category: '全部' | '短剧漫剧' | '音乐MV' | '知识分享';
}

export interface ContinueProjectCard {
  id: string;
  title: string;
  brief: string;
  aspectRatio: '9:16' | '16:9' | '1:1';
  status: ProjectStatus;
  stageLabel: '策划' | '分片生成' | '发布';
}

export interface HistoryWork {
  id: string;
  title: string;
  intro: string;
  script: string;
  coverLabel: string;
  category: '短剧漫剧' | '音乐MV' | '知识分享';
  durationLabel: string;
}
