'use client';

import type { PublishDraft } from '@aiv/domain';
import { Badge, Button, Panel, StudioFrame, cx } from '@aiv/ui';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { Dialog } from '@/features/shared/components/dialog';
import { StageLinks } from '@/features/shared/components/stage-links';
import { publishCopy } from '@/lib/copy';

import type { ApiPublishWorkspace, PublishRuntimeApiContext, PublishSubmitResult } from '../lib/publish-api';
import {
  applyPublishHistoryBinding,
  buildPublishMetricSummary,
  filterPublishHistoryWorks,
  listPublishHistoryCategories,
  resolveInitialPublishHistoryId,
  type PublishHistoryCategory,
} from '../lib/publish-page-helpers';
import type { PublishPageData } from '../lib/publish-page-data';
import styles from './publish-page.module.css';

interface PublishPageProps {
  studio: PublishPageData;
  runtimeApi?: PublishRuntimeApiContext;
  initialPublishWorkspace?: ApiPublishWorkspace | null;
}

export function PublishPage({ studio, runtimeApi, initialPublishWorkspace }: PublishPageProps) {
  const router = useRouter();
  const initialHistoryId = resolveInitialPublishHistoryId(studio);
  const [draft, setDraft] = useState<PublishDraft>(studio.publish.draft);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(initialHistoryId);
  const [historyPickerOpen, setHistoryPickerOpen] = useState(false);
  const [pickerSelectionId, setPickerSelectionId] = useState<string | null>(initialHistoryId);
  const [activeCategory, setActiveCategory] = useState<PublishHistoryCategory>('全部');
  const [notice, setNotice] = useState<string | null>(null);
  const [successOpen, setSuccessOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const filteredHistoryWorks = useMemo(() => filterPublishHistoryWorks(studio, activeCategory), [activeCategory, studio]);

  const selectedHistory = studio.historyWorks.find((item) => item.id === selectedHistoryId) ?? null;
  const pickerSelection = studio.historyWorks.find((item) => item.id === pickerSelectionId) ?? null;
  const publishSummary = initialPublishWorkspace?.summary ?? null;

  const metricSummary = useMemo(
    () => buildPublishMetricSummary({ studio, selectedHistory, publishSummary, draft }),
    [draft, publishSummary, selectedHistory, studio],
  );

  const applyHistoryBinding = (historyId: string) => {
    const result = applyPublishHistoryBinding({
      historyWorks: studio.historyWorks,
      draft,
      historyId,
    });
    if (!result) {
      return;
    }

    setSelectedHistoryId(result.selectedHistoryId);
    setPickerSelectionId(result.selectedHistoryId);
    setDraft(result.draft);
    setNotice(result.notice);
  };

  const openHistoryPicker = () => {
    setPickerSelectionId(selectedHistoryId);
    setHistoryPickerOpen(true);
  };

  const applySelectedHistoryWork = () => {
    if (!pickerSelectionId) {
      setNotice('请先选择一个历史作品。');
      return;
    }

    applyHistoryBinding(pickerSelectionId);
    setHistoryPickerOpen(false);
  };

  const submitPublish = async () => {
    if (!draft.title.trim() || !draft.intro.trim()) {
      setNotice('标题和简介未完成，暂不能发布。');
      return;
    }

    if (runtimeApi) {
      setSubmitting(true);
      try {
        const response = await fetch(`/api/publish/projects/${encodeURIComponent(runtimeApi.projectId)}/submit`, {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            episodeId: runtimeApi.episodeId,
            title: draft.title,
            intro: draft.intro,
            script: draft.script,
            tag: draft.tag,
            sourceHistoryId: selectedHistoryId,
          }),
        });
        const payload = (await response.json()) as { ok: boolean; data?: PublishSubmitResult; error?: { message?: string } };
        if (!response.ok || !payload.ok) {
          throw new Error(payload.error?.message ?? '发布失败，请稍后重试。');
        }
        setDraft((current) => ({ ...current, status: 'submitted' }));
        setSuccessOpen(true);
        setNotice(null);
      } catch (error) {
        setNotice(error instanceof Error ? error.message : '发布失败，请稍后重试。');
      } finally {
        setSubmitting(false);
      }
      return;
    }

    setDraft((current) => ({ ...current, status: 'submitted' }));
    setSuccessOpen(true);
    setNotice(null);
  };

  const resetDraft = () => {
    setDraft(studio.publish.draft);
    setSelectedHistoryId(initialHistoryId);
    setPickerSelectionId(initialHistoryId);
    setNotice('已重置为当前项目默认发布草稿。');
  };

  const closeSuccess = () => {
    setSuccessOpen(false);
  };

  return (
    <>
      <div className={styles.page}>
        <StudioFrame
          brandName={studio.brandName}
          eyebrow="Publish"
          pageTitle={studio.project.title}
          pageDescription="补齐发布文案、绑定历史作品并提交审核。"
          statusLabel={draft.status === 'submitted' ? '已提交发布' : '待发布'}
          actions={
            <>
              <StageLinks projectId={studio.project.id} activeStage="publish" />
              <Button variant="secondary" onClick={openHistoryPicker}>
                选择历史
              </Button>
              <Button onClick={submitPublish} disabled={submitting}>{submitting ? '发布中...' : '发布作品'}</Button>
            </>
          }
        >
          <div className={styles.metricStrip}>
            {metricSummary.map((item) => (
              <article key={item.label} className={styles.metricCard}>
                <small>{item.label}</small>
                <strong>{item.value}</strong>
                <span>{item.meta}</span>
              </article>
            ))}
          </div>

          <div className={styles.workspaceGrid}>
            <section className={styles.publishShell}>
              <div className={styles.publishShellHead}>
                <div>
                  <span className={styles.sectionEyebrow}>发布作品</span>
                  <h2 className={styles.publishShellTitle}>成片、文案与历史来源绑定</h2>
                </div>
                <Badge tone={draft.status === 'submitted' ? 'success' : 'warning'}>{draft.status === 'submitted' ? '审核中' : '待提交'}</Badge>
              </div>

              <div className={styles.publishShellBody}>
                <div className={styles.posterColumn}>
                  <button type="button" className={styles.posterCard} onClick={openHistoryPicker}>
                    <div className={styles.posterFrame}>
                      <div className={styles.posterSurface}>
                        <small>Poster Preview</small>
                        <strong>{draft.title || studio.project.title}</strong>
                        <p>{draft.intro || '点击从历史作品中选择一条记录，自动回填发布表单。'}</p>
                      </div>
                      <div className={styles.posterOverlay}>
                        <span>点击从历史作品中选择</span>
                      </div>
                    </div>
                    <div className={styles.posterMeta}>
                      <div>
                        <small>当前绑定来源</small>
                        <strong>{selectedHistory?.title ?? '未绑定历史作品'}</strong>
                      </div>
                      <Badge>{selectedHistory?.category ?? '待选择'}</Badge>
                    </div>
                  </button>

                  <div className={styles.posterActionRow}>
                    <Button variant="secondary">替换封面</Button>
                    <Button variant="secondary">导出成片</Button>
                  </div>

                  <button type="button" className={styles.historyTrigger} onClick={openHistoryPicker}>
                    从历史创作中选择
                  </button>
                </div>

                <div className={styles.formColumn}>
                  <div className={styles.fieldStack}>
                    <label className={styles.fieldBlock}>
                      <span>标题*</span>
                      <input
                        className={styles.fieldInput}
                        value={draft.title}
                        maxLength={26}
                        onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
                      />
                      <small className={styles.counter}>{draft.title.length}/26</small>
                    </label>

                    <label className={styles.fieldBlock}>
                      <span>作品简介</span>
                      <textarea
                        className={styles.fieldTextarea}
                        value={draft.intro}
                        maxLength={500}
                        onChange={(event) => setDraft((current) => ({ ...current, intro: event.target.value }))}
                        placeholder={publishCopy.introPlaceholder}
                      />
                      <small className={styles.counter}>{draft.intro.length}/500</small>
                    </label>

                    <label className={styles.fieldBlock}>
                      <span>剧本描述</span>
                      <textarea
                        className={styles.fieldTextarea}
                        value={draft.script}
                        onChange={(event) => setDraft((current) => ({ ...current, script: event.target.value }))}
                        placeholder={publishCopy.scriptPlaceholder}
                      />
                    </label>

                    <label className={styles.fieldBlock}>
                      <span>活动标签</span>
                      <input className={styles.fieldInput} value={draft.tag} onChange={(event) => setDraft((current) => ({ ...current, tag: event.target.value }))} />
                    </label>

                    <div className={styles.sourceSummary}>
                      <div>
                        <small>已绑定来源</small>
                        <strong>{selectedHistory?.title ?? '未选择历史作品'}</strong>
                      </div>
                      <div className={styles.sourceMetaRow}>
                        <Badge>{selectedHistory?.category ?? '待选择'}</Badge>
                        <Badge>{selectedHistory?.durationLabel ?? '--:--'}</Badge>
                      </div>
                    </div>

                    {notice ? <div className={styles.notice}>{notice}</div> : null}

                    <div className={styles.formFooter}>
                      <Button variant="secondary" onClick={resetDraft}>
                        重置草稿
                      </Button>
                      <Button onClick={submitPublish} disabled={submitting}>{submitting ? '发布中...' : '发布作品'}</Button>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <div className={styles.sideRail}>
              <Panel eyebrow="当前来源" title="历史作品绑定结果" className={styles.sidePanel}>
                <div className={styles.boundCard}>
                  <div className={styles.boundCover}>
                    <span>{selectedHistory?.coverLabel ?? '未选择'}</span>
                    <i>{selectedHistory?.durationLabel ?? '--:--'}</i>
                  </div>
                  <strong>{selectedHistory?.title ?? '未选择历史作品'}</strong>
                  <small>{selectedHistory?.intro ?? '点击“从历史创作中选择”后，会把标题、简介和剧本描述回填到发布表单。'}</small>
                  {runtimeApi && publishSummary ? (
                    <small>{`后端发布摘要：${publishSummary.publishableShotCount}/${publishSummary.totalShots} 分镜可发布`}</small>
                  ) : null}
                  <Button variant="secondary" onClick={openHistoryPicker}>
                    切换来源
                  </Button>
                </div>
              </Panel>

              <Panel eyebrow="发布检查" title="当前提交前校验" className={styles.sidePanel}>
                <div className={styles.checkList}>
                  <article className={styles.checkItem}>
                    <strong>标题必填</strong>
                    <small>{draft.title.trim() ? '已填写，可继续发布。' : '标题为空时会阻止发布。'}</small>
                  </article>
                  <article className={styles.checkItem}>
                    <strong>简介回填</strong>
                    <small>{draft.intro.trim() ? '作品简介已存在，可继续精修。' : '建议先从历史作品回填简介。'}</small>
                  </article>
                  <article className={styles.checkItem}>
                    <strong>审核反馈</strong>
                    <small>发布成功后，当前稿件会进入审核流程，并在通过后进入灵感广场。</small>
                  </article>
                </div>
              </Panel>
            </div>
          </div>
        </StudioFrame>
      </div>

      <Dialog
        open={historyPickerOpen}
        title="从历史创作中选择"
        description="先选择历史作品，再将标题、简介和剧本描述回填到发布表单。"
        size="wide"
        onClose={() => setHistoryPickerOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setHistoryPickerOpen(false)}>
              取消
            </Button>
            <Button onClick={applySelectedHistoryWork}>选择作品</Button>
          </>
        }
      >
        <div className={styles.historyPickerBody}>
          <div className={styles.historyCategoryRow}>
            {listPublishHistoryCategories().map((item) => (
              <button
                key={item}
                type="button"
                className={cx(styles.categoryChip, activeCategory === item && styles.categoryChipActive)}
                onClick={() => setActiveCategory(item)}
              >
                {item}
              </button>
            ))}
          </div>

          <div className={styles.historyPickerGrid}>
            {filteredHistoryWorks.map((item) => (
              <button
                key={item.id}
                type="button"
                className={cx(styles.pickerCard, pickerSelectionId === item.id && styles.pickerCardActive)}
                onClick={() => setPickerSelectionId(item.id)}
              >
                <div className={styles.pickerCardCover}>
                  <span>{item.coverLabel}</span>
                  <small>{item.durationLabel}</small>
                </div>
                <div className={styles.pickerCardMeta}>
                  <em>{item.category}</em>
                  <strong>{item.title}</strong>
                  <small>{item.intro}</small>
                </div>
              </button>
            ))}
          </div>

          <div className={styles.pickerSummary}>
            <div>
              <small>当前选中</small>
              <strong>{pickerSelection?.title ?? '尚未选择作品'}</strong>
            </div>
            <div className={styles.sourceMetaRow}>
              <Badge>{pickerSelection?.category ?? '待选择'}</Badge>
              <Badge>{pickerSelection?.durationLabel ?? '--:--'}</Badge>
            </div>
          </div>
        </div>
      </Dialog>

      <Dialog
        open={successOpen}
        title="发布作品"
        description="发布成功后，后台审核通过后将在灵感广场可见。"
        onClose={closeSuccess}
        footer={
          <>
            <Button variant="secondary" onClick={closeSuccess}>
              关闭
            </Button>
            <Button onClick={() => router.push('/explore')}>返回广场</Button>
          </>
        }
      >
        <div className={styles.successCard}>
          <div className={styles.successIcon}>✓</div>
          <strong>发布成功，后台审核后将在灵感广场可见。</strong>
          <p>{studio.publish.successMessage}</p>
          <div className={styles.successMetaRow}>
            <span>{draft.title}</span>
            <span>{selectedHistory?.category ?? '未分类'}</span>
            <span>{selectedHistory?.durationLabel ?? '--:--'}</span>
          </div>
        </div>
      </Dialog>
    </>
  );
}
