'use client';

import type { PublishDraft, StudioFixture } from '@aiv/domain';
import { Badge, Button, Panel, StudioFrame, cx } from '@aiv/ui';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { Dialog } from '@/features/shared/components/dialog';
import { StageLinks } from '@/features/shared/components/stage-links';
import { publishCopy } from '@/lib/copy';

import styles from './publish-page.module.css';

interface PublishPageProps {
  studio: StudioFixture;
}

const HISTORY_CATEGORIES = ['全部', '短剧漫剧', '音乐MV', '知识分享'] as const;

function resolveInitialHistoryId(studio: StudioFixture) {
  return studio.historyWorks.find((item) => item.title === studio.publish.draft.title)?.id ?? studio.historyWorks[0]?.id ?? null;
}

export function PublishPage({ studio }: PublishPageProps) {
  const router = useRouter();
  const initialHistoryId = resolveInitialHistoryId(studio);
  const [draft, setDraft] = useState<PublishDraft>(studio.publish.draft);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(initialHistoryId);
  const [historyPickerOpen, setHistoryPickerOpen] = useState(false);
  const [pickerSelectionId, setPickerSelectionId] = useState<string | null>(initialHistoryId);
  const [activeCategory, setActiveCategory] = useState<(typeof HISTORY_CATEGORIES)[number]>('全部');
  const [notice, setNotice] = useState<string | null>(null);
  const [successOpen, setSuccessOpen] = useState(false);

  const filteredHistoryWorks = useMemo(() => {
    if (activeCategory === '全部') {
      return studio.historyWorks;
    }

    return studio.historyWorks.filter((item) => item.category === activeCategory);
  }, [activeCategory, studio.historyWorks]);

  const selectedHistory = studio.historyWorks.find((item) => item.id === selectedHistoryId) ?? null;
  const pickerSelection = studio.historyWorks.find((item) => item.id === pickerSelectionId) ?? null;

  const metricSummary = useMemo(
    () => [
      { label: '当前项目', value: studio.project.title, meta: `${studio.project.aspectRatio} · 待发布` },
      { label: '历史作品', value: String(studio.historyWorks.length), meta: selectedHistory?.category ?? '未绑定' },
      { label: '当前来源', value: selectedHistory?.title ?? '未选择', meta: selectedHistory?.durationLabel ?? '--:--' },
      { label: '发布状态', value: draft.status === 'submitted' ? 'Submitted' : 'Draft', meta: '提交后进入审核队列' },
    ],
    [draft.status, selectedHistory, studio.historyWorks.length, studio.project.aspectRatio, studio.project.title],
  );

  const applyHistoryBinding = (historyId: string) => {
    const target = studio.historyWorks.find((item) => item.id === historyId);

    if (!target) {
      return;
    }

    setSelectedHistoryId(historyId);
    setPickerSelectionId(historyId);
    setDraft((current) => ({
      ...current,
      title: target.title,
      intro: target.intro,
      script: target.script,
    }));
    setNotice('已从历史作品回填标题、简介与剧本描述。');
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

  const submitPublish = () => {
    if (!draft.title.trim() || !draft.intro.trim()) {
      setNotice('标题和简介未完成，暂不能发布。');
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
              <Button onClick={submitPublish}>发布作品</Button>
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
                      <Button onClick={submitPublish}>发布作品</Button>
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
            {HISTORY_CATEGORIES.map((item) => (
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
