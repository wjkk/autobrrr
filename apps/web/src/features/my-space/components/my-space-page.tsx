'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

import styles from './my-space-page.module.css';

import type { MySpaceProjectItem } from '../lib/my-space-api.server';
import { AuthRequiredPanel } from '../../shared/components/auth-required-panel';
import { CollectionCardMedia } from '../../shared/components/collection-card-media';
import {
  CollectionToolbar,
  CollectionToolbarChips,
  CollectionToolbarGroup,
  CollectionToolbarMeta,
  CollectionToolbarPill,
  CollectionToolbarSearch,
} from '../../shared/components/collection-toolbar';
import { SystemShell } from '../../shared/components/system-shell';
import { buildUserShellNavItems } from '../../shared/lib/user-shell-nav';
import { resolveProjectStage } from '../../shared/lib/project-stage';

type StageFilter = 'all' | 'planner' | 'creation' | 'publish';
type ContentFilter = 'all' | '短剧漫剧' | '音乐MV' | '知识分享' | '未分类';

function formatRelativeTime(value: string) {
  const target = new Date(value).getTime();
  const delta = Date.now() - target;
  const hour = 60 * 60 * 1000;
  const day = 24 * hour;

  if (delta < hour) {
    return '刚刚更新';
  }
  if (delta < day) {
    return `${Math.max(1, Math.floor(delta / hour))} 小时前更新`;
  }
  return `${Math.max(1, Math.floor(delta / day))} 天前更新`;
}

function statusLabel(status: string) {
  switch (status) {
    case 'planning':
      return '策划中';
    case 'ready_for_storyboard':
      return '待生成';
    case 'creating':
      return '生成中';
    case 'export_ready':
      return '待发布';
    case 'exported':
      return '已导出';
    case 'published':
      return '已发布';
    case 'failed':
      return '异常';
    case 'archived':
      return '已归档';
    default:
      return '草稿';
  }
}

function stageLabel(stage: 'planner' | 'creation' | 'publish') {
  switch (stage) {
    case 'creation':
      return '分片生成';
    case 'publish':
      return '发布';
    default:
      return '策划';
  }
}

function modeLabel(mode: 'single' | 'series') {
  return mode === 'series' ? '多集' : '单集';
}

function contentTypeValue(project: MySpaceProjectItem): ContentFilter {
  return (project.creationConfig?.selectedTab ?? '未分类') as ContentFilter;
}

function contentTypeLabel(project: MySpaceProjectItem) {
  const tab = contentTypeValue(project);
  return project.creationConfig?.selectedSubtype ? `${tab} / ${project.creationConfig.selectedSubtype}` : tab;
}

function searchIndex(project: MySpaceProjectItem) {
  return [
    project.title,
    project.brief ?? '',
    project.currentEpisode?.title ?? '',
    project.creationConfig?.selectedTab ?? '',
    project.creationConfig?.selectedSubtype ?? '',
  ].join(' ').toLowerCase();
}

function coverTone(project: MySpaceProjectItem) {
  const stage = resolveProjectStage(project.status as Parameters<typeof resolveProjectStage>[0]);
  const contentType = contentTypeValue(project);

  if (contentType === '音乐MV') {
    return stage === 'creation' ? styles.coverToneMvCreation : stage === 'publish' ? styles.coverToneMvPublish : styles.coverToneMv;
  }
  if (contentType === '知识分享') {
    return stage === 'creation' ? styles.coverToneKnowledgeCreation : stage === 'publish' ? styles.coverToneKnowledgePublish : styles.coverToneKnowledge;
  }
  return stage === 'creation' ? styles.coverToneDramaCreation : stage === 'publish' ? styles.coverToneDramaPublish : styles.coverToneDrama;
}

function cardPattern(stage: 'planner' | 'creation' | 'publish') {
  switch (stage) {
    case 'creation':
      return styles.coverPatternFrames;
    case 'publish':
      return styles.coverPatternSpotlight;
    default:
      return styles.coverPatternStoryboard;
  }
}

function cardInitials(title: string) {
  const trimmed = title.trim();
  if (!trimmed) {
    return 'A';
  }

  const ascii = trimmed
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  return ascii || trimmed.slice(0, 2).toUpperCase();
}

const stageFilters: Array<{ id: StageFilter; label: string }> = [
  { id: 'all', label: '全部阶段' },
  { id: 'planner', label: '策划' },
  { id: 'creation', label: '分片生成' },
  { id: 'publish', label: '发布' },
];

export function MySpacePage(props: { projects: MySpaceProjectItem[]; error?: string | null; authRequired?: boolean }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [stageFilter, setStageFilter] = useState<StageFilter>('all');
  const [contentFilter, setContentFilter] = useState<ContentFilter>('all');

  const contentFilters = useMemo<Array<{ id: ContentFilter; label: string }>>(() => {
    const values = Array.from(new Set(props.projects.map((project) => contentTypeValue(project)))) as ContentFilter[];
    return [{ id: 'all', label: '全部' }, ...values.map((value) => ({ id: value, label: value }))];
  }, [props.projects]);

  const filteredProjects = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    return props.projects.filter((project) => {
      const stage = resolveProjectStage(project.status as Parameters<typeof resolveProjectStage>[0]);
      if (stageFilter !== 'all' && stage !== stageFilter) {
        return false;
      }

      const contentType = contentTypeValue(project);
      if (contentFilter !== 'all' && contentType !== contentFilter) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      return searchIndex(project).includes(normalizedSearch);
    });
  }, [contentFilter, props.projects, searchTerm, stageFilter]);

  return (
    <SystemShell
      pageTitle="我的空间"
      navItems={buildUserShellNavItems('projects')}
      topActions={[
        { key: 'providers', label: '接口配置', href: '/settings/providers', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3v6m0 6v6M3 12h6m6 0h6" /></svg> },
        { key: 'catalogs', label: '管理目录', href: '/settings/catalogs', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg> },
      ]}
    >
        <div className={styles.contentShell}>
          {props.authRequired ? (
            <AuthRequiredPanel
              eyebrow="My Space"
              title="先登录，再进入你的项目空间"
              description="登录后这里会展示你创建过的全部项目，并可直接继续策划、分片生成或发布。"
            />
          ) : null}

          {!props.authRequired ? (
            <>
          {props.error ? <div className={styles.errorPanel}>{props.error}</div> : null}

          {!props.error ? (
            <>
              <CollectionToolbar>
                <CollectionToolbarGroup nowrap>
                  <CollectionToolbarChips>
                    {contentFilters.map((item) => (
                      <CollectionToolbarPill
                        key={item.id}
                        active={contentFilter === item.id}
                        activeTone="dark"
                        inactiveStyle="plain"
                        onClick={() => setContentFilter(item.id)}
                      >
                        {item.label}
                      </CollectionToolbarPill>
                    ))}
                  </CollectionToolbarChips>

                  <CollectionToolbarChips>
                    {stageFilters.map((item) => (
                      <CollectionToolbarPill
                        key={item.id}
                        active={stageFilter === item.id}
                        activeTone="warm"
                        inactiveStyle="outlined"
                        onClick={() => setStageFilter(item.id)}
                      >
                        {item.label}
                      </CollectionToolbarPill>
                    ))}
                  </CollectionToolbarChips>

                  <CollectionToolbarSearch
                    width={300}
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="输入策划案名称或子类型搜索"
                  />
                </CollectionToolbarGroup>

                <CollectionToolbarGroup align="end" nowrap>
                  <CollectionToolbarMeta>{`已展示 ${filteredProjects.length} / ${props.projects.length}`}</CollectionToolbarMeta>
                </CollectionToolbarGroup>
              </CollectionToolbar>
            </>
          ) : null}

          {!props.error && props.projects.length === 0 ? (
            <section className={styles.emptyPanel}>
              <h2 className={styles.emptyTitle}>你的空间里还没有项目</h2>
              <p className={styles.emptyDescription}>这里会按作品卡片的方式展示你已经创建过的项目。现在还没有内容时，建议先从创作广场开始一个短剧、MV 或知识分享项目。</p>
              <div className={styles.emptyPreviewRow}>
                <div className={`${styles.emptyPreviewCard} ${styles.emptyPreviewWarm}`}></div>
                <div className={`${styles.emptyPreviewCard} ${styles.emptyPreviewCool}`}></div>
                <div className={`${styles.emptyPreviewCard} ${styles.emptyPreviewNeutral}`}></div>
              </div>
              <div className={styles.emptyActions}>
                <Link href="/explore" className={styles.primaryAction}>去创建第一个项目</Link>
              </div>
            </section>
          ) : null}

          {!props.error && props.projects.length > 0 && filteredProjects.length === 0 ? (
            <section className={styles.emptyPanel}>
              <h2 className={styles.emptyTitle}>没有匹配的项目</h2>
              <p className={styles.emptyDescription}>换个关键词，或者切回“全部阶段 / 全部类型”再看看。</p>
              <div className={styles.emptyActions}>
                <button type="button" className={styles.secondaryAction} onClick={() => { setSearchTerm(''); setStageFilter('all'); setContentFilter('all'); }}>
                  清空筛选
                </button>
              </div>
            </section>
          ) : null}

          {!props.error && filteredProjects.length > 0 ? (
            <section className={styles.grid}>
              {filteredProjects.map((project) => {
                const stage = resolveProjectStage(project.status as Parameters<typeof resolveProjectStage>[0]);
                const stageHref = `/projects/${project.id}/${stage}`;
                const plannerHref = `/projects/${project.id}/planner`;
                const creationHref = `/projects/${project.id}/creation`;

                return (
                  <article key={project.id} className={styles.card}>
                    <Link href={stageHref} className={styles.cardOverlay} aria-label={`打开项目 ${project.title}`} />

                    <div className={`${styles.cardCover} ${coverTone(project)}`}>
                      <CollectionCardMedia
                        imageUrl={project.previewAsset?.sourceUrl ?? null}
                        alt={project.title}
                        aspectRatio="1.08 / 1"
                        className={styles.coverMedia}
                        imageClassName={styles.coverImage}
                        hoverScale="parent"
                      />
                      <div className={styles.coverGlass} />
                      <div className={`${styles.coverPattern} ${cardPattern(stage)}`} />
                      <div className={styles.coverHeader}>
                        <span className={styles.coverBadge}>{stageLabel(stage)}</span>
                        <span className={styles.coverType}>{project.creationConfig?.selectedTab ?? '未分类'}</span>
                      </div>
                      <div className={styles.coverCenter}>{cardInitials(project.title)}</div>
                      <div className={styles.coverFooter}>
                        <span>{project.currentEpisode?.title ?? '第 1 集'}</span>
                        <span>{modeLabel(project.contentMode)}</span>
                      </div>
                    </div>

                    <div className={styles.cardBody}>
                      <div className={styles.cardTags}>
                        <span className={styles.statusPill}>{statusLabel(project.status)}</span>
                        <span className={styles.typePill}>{contentTypeLabel(project)}</span>
                      </div>

                      <div className={styles.cardTitle}>{project.title}</div>
                      <div className={styles.cardDesc}>{project.brief?.trim() || '这个项目还没有摘要，点击进入后继续完善策划内容。'}</div>

                      <div className={styles.cardInfoRow}>
                        <div className={styles.cardInfo}><span>当前剧集</span><strong>{project.currentEpisode?.title ?? '第 1 集'}</strong></div>
                        <div className={styles.cardInfo}><span>项目规模</span><strong>{project.episodeCount} 集 / {modeLabel(project.contentMode)}</strong></div>
                      </div>

                      <div className={styles.cardBottom}>
                        <div className={styles.cardTime}>{formatRelativeTime(project.updatedAt)}</div>
                        <div className={styles.cardActions}>
                          <Link href={plannerHref} className={styles.cardAction}>继续策划</Link>
                          <Link href={creationHref} className={`${styles.cardAction} ${styles.cardActionPrimary}`}>进入分片生成</Link>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </section>
          ) : null}
            </>
          ) : null}
        </div>
    </SystemShell>
  );
}
