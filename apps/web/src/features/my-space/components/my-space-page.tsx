'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import styles from './my-space-page.module.css';

import type { MySpaceProjectItem } from '../lib/my-space-api.server';
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

export function MySpacePage(props: { projects: MySpaceProjectItem[]; error?: string | null }) {
  const router = useRouter();
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

  const plannerCount = props.projects.filter((project) => resolveProjectStage(project.status as Parameters<typeof resolveProjectStage>[0]) === 'planner').length;
  const creationCount = props.projects.filter((project) => resolveProjectStage(project.status as Parameters<typeof resolveProjectStage>[0]) === 'creation').length;
  const publishCount = props.projects.filter((project) => resolveProjectStage(project.status as Parameters<typeof resolveProjectStage>[0]) === 'publish').length;

  return (
    <div className={styles.page}>
      <aside className={styles.globalSidebar}>
        <div className={styles.sidebarGroup}>
          <div className={styles.brandMark} onClick={() => router.push('/explore')}>
            <span className={styles.brandLetter}>S</span>
          </div>
          <button className={styles.navBtn} aria-label="首页" title="首页" onClick={() => router.push('/explore')}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 10L12 3l9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><line x1="12" y1="12" x2="12" y2="18"></line></svg>
          </button>
          <button className={`${styles.navBtn} ${styles.navBtnActive}`} aria-label="我的空间" title="我的空间" onClick={() => router.push('/my-space')}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path><line x1="9" y1="14" x2="15" y2="14"></line></svg>
          </button>
          <button className={styles.navBtn} aria-label="资产" title="数字分身" onClick={() => router.push('/settings/catalogs')}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" /><path d="M4 21v-2a4 4 0 0 1 4-4h4" /><path d="M19 6l1-1 1 1-1 1-1-1z" /><path d="M16 3l.5-.5.5.5-.5.5-.5-.5z" /></svg>
          </button>
          <button className={styles.navBtn} aria-label="社区" title="声音克隆" onClick={() => router.push('/settings/providers')}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" /><path d="M4 21v-2a4 4 0 0 1 4-4h4" /><line x1="16" y1="16" x2="16" y2="20" /><line x1="19" y1="15" x2="19" y2="21" /><line x1="22" y1="17" x2="22" y2="19" /></svg>
          </button>
        </div>

        <div className={styles.sidebarGroup}>
          <button className={styles.vipBadge} onClick={() => router.push('/explore')}>
            <strong>{props.projects.length}</strong>
            <span>继续创作</span>
          </button>
          <button className={styles.utilBtn} aria-label="Profile" onClick={() => router.push('/profile')}>
            <div className={styles.avatar}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" /></svg>
            </div>
          </button>
          <button className={styles.utilBtn} aria-label="Notifications" onClick={() => router.push('/notifications')}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
          </button>
          <button className={styles.utilBtn} aria-label="Feedback" onClick={() => router.push('/feedback')}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path><circle cx="9" cy="10" r="1.5" fill="currentColor"></circle><circle cx="12" cy="10" r="1.5" fill="currentColor"></circle><circle cx="15" cy="10" r="1.5" fill="currentColor"></circle></svg>
          </button>
        </div>
      </aside>

      <header className={styles.topBar}>
        <div className={styles.topBarLeft}>
          <span className={styles.brandTitle}>AIV Studio</span>
          <span className={styles.divider}>/</span>
          <span className={styles.pageTitle}>我的空间</span>
        </div>
        <div className={styles.topBarRight}>
          <button className={styles.publishBtn} onClick={() => router.push('/settings/providers')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3v6m0 6v6M3 12h6m6 0h6" /></svg>
            接口配置
          </button>
          <button className={styles.publishBtn} onClick={() => router.push('/settings/catalogs')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg>
            管理目录
          </button>
        </div>
      </header>

      <div className={styles.pageScrollContainer}>
        <div className={styles.contentShell}>
          <section className={styles.headerArea}>
            <div className={styles.headerIdentity}>
              <div className={styles.headerEyebrow}>My Space</div>
              <h1 className={styles.headerTitle}>继续你已经开始的项目</h1>
              <p className={styles.headerSubtitle}>更接近作品空间，而不是后台列表。先筛选，再从卡片直接回到策划或分片生成。</p>
            </div>
            <div className={styles.headerMeta}>
              <div className={styles.metricCard}><span>策划</span><strong>{plannerCount}</strong></div>
              <div className={styles.metricCard}><span>分片生成</span><strong>{creationCount}</strong></div>
              <div className={styles.metricCard}><span>发布</span><strong>{publishCount}</strong></div>
            </div>
          </section>

          {props.error ? <div className={styles.errorPanel}>{props.error}</div> : null}

          {!props.error ? (
            <>
              <section className={styles.controlBar}>
                <div className={styles.contentTabs}>
                  {contentFilters.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={`${styles.contentTab} ${contentFilter === item.id ? styles.contentTabActive : ''}`}
                      onClick={() => setContentFilter(item.id)}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                <div className={styles.searchWrap}>
                  <svg className={styles.searchIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7"></circle><path d="m20 20-3.5-3.5"></path></svg>
                  <input
                    className={styles.searchInput}
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="输入策划案名称或子类型搜索"
                  />
                </div>
              </section>

              <section className={styles.subControlBar}>
                <div className={styles.stageFilters}>
                  {stageFilters.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={`${styles.stageFilter} ${stageFilter === item.id ? styles.stageFilterActive : ''}`}
                      onClick={() => setStageFilter(item.id)}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
                <div className={styles.resultsMeta}>{`已展示 ${filteredProjects.length} / ${props.projects.length}`}</div>
              </section>
            </>
          ) : null}

          {!props.error && props.projects.length === 0 ? (
            <section className={styles.emptyPanel}>
              <h2 className={styles.emptyTitle}>你的空间里还没有项目</h2>
              <p className={styles.emptyDescription}>从创作广场开始第一个项目，创建后它会自动出现在这里，方便你继续策划或进入分片生成。</p>
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
                      {project.previewAsset?.sourceUrl ? (
                        <img
                          src={project.previewAsset.sourceUrl}
                          alt={project.title}
                          className={styles.coverImage}
                        />
                      ) : null}
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
        </div>
      </div>
    </div>
  );
}
