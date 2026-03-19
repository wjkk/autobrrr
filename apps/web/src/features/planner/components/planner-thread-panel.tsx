'use client';

import Link from 'next/link';
import type { PlannerStepStatus } from '@aiv/domain';
import { cx } from '@aiv/ui';

import { sanitizePlannerOutlineDoc } from '../lib/planner-display-normalization';
import { formatPlannerDebugRunLabel } from '../lib/planner-page-helpers';
import { usePlannerPageContext } from '../lib/planner-page-context';
import { sekoPlanThreadData } from '@aiv/mock-data';
import styles from './planner-page.module.css';

interface PlannerRefinementStepView {
  title: string;
  status: PlannerStepStatus;
  tags: string[];
}

const SEKO_ASSISTANT_NAME = 'Seko';

export function PlannerThreadPanel() {
  const state = usePlannerPageContext();
  const showConfirmOutlinePrompt = Boolean(state.usingRuntimePlanner && state.runtimeActiveOutline && !state.outlineConfirmed);
  const showActiveDebugApplyNotice = state.runtimeActiveRefinement?.triggerType?.toLowerCase() === 'debug_apply';
  const activeDebugRunId = state.activeDebugApplySource?.debugRunId ?? null;

  return (
    <div className={styles.commandColumn}>
      <div className={styles.messageScroll}>
        {showActiveDebugApplyNotice ? (
          <article className={styles.threadNoticeCard}>
            <strong>当前工作区版本来自 Planner Debug 调试应用</strong>
            <p>
              {state.activeDebugApplySource?.debugRunId
                ? `来源 ${formatPlannerDebugRunLabel(state.activeDebugApplySource.debugRunId)}，已同步为主流程可编辑版本。`
                : '该版本已由调试结果同步为主流程可编辑版本。'}
            </p>
            {activeDebugRunId ? (
              <button type="button" className={styles.threadNoticeAction} onClick={() => state.openDebugRun(activeDebugRunId)}>
                查看调试 Run
              </button>
            ) : null}
          </article>
        ) : null}
        {state.usingRuntimePlanner && state.messages.length > 0 ? (
          <>
            {state.messages.map((item) => {
              const isUser = item.role === 'user';
              const stepItems =
                item.messageType === 'assistant_steps' && Array.isArray(item.rawContent?.steps)
                  ? item.rawContent.steps
                      .map((step) => (step && typeof step === 'object' && !Array.isArray(step) ? (step as Record<string, unknown>) : null))
                      .filter((step): step is Record<string, unknown> => step !== null)
                  : [];
              const receiptTitle =
                item.messageType === 'assistant_document_receipt' && typeof item.rawContent?.documentTitle === 'string'
                  ? item.rawContent.documentTitle
                  : (state.runtimeActiveRefinement?.documentTitle ?? state.runtimeActiveOutline?.documentTitle ?? null);
              const outlineDoc =
                item.messageType === 'assistant_outline_card'
                && item.rawContent?.outlineDoc
                && typeof item.rawContent.outlineDoc === 'object'
                && !Array.isArray(item.rawContent.outlineDoc)
                  ? (item.rawContent.outlineDoc as Record<string, unknown>)
                  : null;

              if (item.messageType === 'assistant_steps') {
                return (
                  <article key={item.id} className={styles.assistantThread}>
                    <header className={styles.messageAgentHeader}>
                      <span className={styles.messageAgentMark}>S</span>
                      <span>{SEKO_ASSISTANT_NAME}</span>
                    </header>

                    <article className={styles.docStepsCard}>
                      {stepItems.map((step, index) => {
                        const title = typeof step.title === 'string' ? step.title : `步骤 ${index + 1}`;
                        const status = typeof step.status === 'string' ? step.status : 'done';
                        const tags =
                          Array.isArray(step.details)
                            ? step.details.filter((detail): detail is string => typeof detail === 'string')
                            : [];

                        return (
                          <div key={`${item.id}-${title}-${index}`} className={styles.docStepItem}>
                            <span
                              className={cx(
                                styles.docStepDot,
                                status === 'done' && styles.docStepDotDone,
                                status === 'running' && styles.docStepDotRunning,
                              )}
                            />
                            {index < stepItems.length - 1 ? <span className={styles.docStepConnector} /> : null}
                            <div className={styles.docStepBody}>
                              <strong>{title}</strong>
                              {tags.length ? (
                                <div className={styles.docStepTags}>
                                  {tags.map((tag) => (
                                    <span key={`${item.id}-${title}-${tag}`} className={styles.docStepTag}>
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              ) : null}
                            </div>
                          </div>
                        );
                      })}
                    </article>
                  </article>
                );
              }

              if (item.messageType === 'assistant_outline_card') {
                const sanitizedOutlineDoc =
                  outlineDoc ? sanitizePlannerOutlineDoc(outlineDoc as unknown as Parameters<typeof sanitizePlannerOutlineDoc>[0]) : null;
                const storyArc =
                  sanitizedOutlineDoc && Array.isArray(sanitizedOutlineDoc.storyArc)
                    ? sanitizedOutlineDoc.storyArc
                        .map((arc) => (arc && typeof arc === 'object' && !Array.isArray(arc) ? (arc as Record<string, unknown>) : null))
                        .filter((arc): arc is Record<string, unknown> => arc !== null)
                    : [];

                return (
                  <article key={item.id} className={styles.assistantThread}>
                    <header className={styles.messageAgentHeader}>
                      <span className={styles.messageAgentMark}>S</span>
                      <span>{SEKO_ASSISTANT_NAME}</span>
                    </header>

                    <article className={styles.outlineCard}>
                      <h4>{typeof sanitizedOutlineDoc?.projectTitle === 'string' ? sanitizedOutlineDoc.projectTitle : '剧本大纲'}</h4>
                      <section className={styles.outlineSection}>
                        <h5>基础信息</h5>
                        <ul>
                          {typeof sanitizedOutlineDoc?.genre === 'string' ? <li>{`题材风格：${sanitizedOutlineDoc.genre}`}</li> : null}
                          {typeof sanitizedOutlineDoc?.format === 'string' ? <li>{`内容形态：${sanitizedOutlineDoc.format === 'series' ? '多剧集' : '单片'}`}</li> : null}
                          {typeof sanitizedOutlineDoc?.episodeCount === 'number' ? <li>{`剧集篇幅：${sanitizedOutlineDoc.episodeCount} 集`}</li> : null}
                          {typeof sanitizedOutlineDoc?.premise === 'string' ? <li>{`剧情简介：${sanitizedOutlineDoc.premise}`}</li> : null}
                        </ul>
                      </section>
                      {storyArc.length > 0 ? (
                        <section className={styles.outlineSection}>
                          <h5>情节概要</h5>
                          <ul>
                            {storyArc.map((arc, index) => {
                              const episodeNo = typeof arc.episodeNo === 'number' ? `第${arc.episodeNo}集` : `第${index + 1}集`;
                              const title = typeof arc.title === 'string' ? arc.title : '未命名';
                              const summary = typeof arc.summary === 'string' ? arc.summary : '';
                              return <li key={`${item.id}-arc-${index}`}>{`${episodeNo} ${title}：${summary}`}</li>;
                            })}
                          </ul>
                        </section>
                      ) : null}
                    </article>
                  </article>
                );
              }

              if (item.messageType === 'assistant_document_receipt') {
                const diffSummary =
                  Array.isArray(item.rawContent?.diffSummary)
                    ? item.rawContent.diffSummary.filter((detail): detail is string => typeof detail === 'string' && detail.trim().length > 0)
                    : [];
                const receiptDebugRunId =
                  typeof item.rawContent?.debugRunId === 'string' && item.rawContent.debugRunId.trim().length > 0
                    ? item.rawContent.debugRunId.trim()
                    : null;
                return (
                  <article key={item.id} className={styles.assistantThread}>
                    <header className={styles.messageAgentHeader}>
                      <span className={styles.messageAgentMark}>S</span>
                      <span>{SEKO_ASSISTANT_NAME}</span>
                    </header>

                    <article className={styles.threadNoticeCard}>
                      <strong>{receiptTitle ? `已更新：${receiptTitle}` : '已更新右侧策划文档'}</strong>
                      <p>{item.content || '策划文档已同步完成，可继续追问或切换版本。'}</p>
                      {diffSummary.length > 0 ? (
                        <ul className={styles.threadNoticeList}>
                          {diffSummary.map((detail) => (
                            <li key={`${item.id}-${detail}`}>{detail}</li>
                          ))}
                        </ul>
                      ) : null}
                      {state.runtimeActiveRefinement?.versionNumber ? (
                        <p>{`当前版本：V${state.runtimeActiveRefinement.versionNumber} · ${state.runtimeActiveRefinement.subAgentProfile?.displayName ?? '未命名子 Agent'}`}</p>
                      ) : null}
                      {showActiveDebugApplyNotice ? (
                        <p>
                          {state.activeDebugApplySource?.debugRunId
                            ? `版本来源：${formatPlannerDebugRunLabel(state.activeDebugApplySource.debugRunId)}`
                            : '版本来源：Planner Debug 调试应用'}
                        </p>
                      ) : null}
                      {receiptDebugRunId ? (
                        <button type="button" className={styles.threadNoticeAction} onClick={() => state.openDebugRun(receiptDebugRunId)}>
                          查看来源调试 Run
                        </button>
                      ) : null}
                    </article>
                  </article>
                );
              }

              return (
                <article key={item.id} className={cx(styles.messageRow, isUser && styles.messageRowUser)}>
                  {!isUser ? <span className={styles.messageAuthor}>{SEKO_ASSISTANT_NAME}</span> : null}
                  <p className={cx(styles.messageBubble, isUser && styles.messageBubbleUser)}>{item.content}</p>
                </article>
              );
            })}

            {showConfirmOutlinePrompt ? (
              <article className={styles.threadNoticeCard}>
                <strong>确认后自动开始细化剧情内容</strong>
                <p>当前大纲已就绪。确认后即可进入剧情细化，并逐步渲染主体、场景和分镜剧本。</p>
                <button type="button" className={styles.confirmOutlineButton} onClick={state.handleConfirmOutline} disabled={state.plannerSubmitting}>
                  确认大纲
                </button>
              </article>
            ) : null}
          </>
        ) : (
          <>
            <article className={cx(styles.messageRow, styles.messageRowUser)}>
              <p className={cx(styles.messageBubble, styles.messageBubbleUser)}>{state.requirement || sekoPlanThreadData.userPrompt}</p>
            </article>

            <article className={styles.assistantThread}>
              <header className={styles.messageAgentHeader}>
                <span className={styles.messageAgentMark}>S</span>
                <span>{SEKO_ASSISTANT_NAME}</span>
              </header>

              <article className={styles.llmStepCard}>
                <div className={styles.threadStepItem}>
                  <span className={styles.threadStepDot}>✓</span>
                  <strong>策划剧本大纲</strong>
                </div>
              </article>

              <article className={styles.outlineCard}>
                <h4>{sekoPlanThreadData.outlineTitle}</h4>
                {sekoPlanThreadData.sections.map((section) => (
                  <section key={section.title} className={styles.outlineSection}>
                    <h5>{section.title}</h5>
                    <ul>
                      {section.lines.map((line, index) => (
                        <li key={`${section.title}-${index}`}>{line}</li>
                      ))}
                    </ul>
                  </section>
                ))}
              </article>

              <p className={styles.messageBubble}>{sekoPlanThreadData.assistantSummary}</p>
              <p className={styles.messageBubble}>{sekoPlanThreadData.assistantPrompt}</p>
              {state.serverPlannerText ? <p className={styles.messageBubble}>{state.serverPlannerText}</p> : null}

              {!state.outlineConfirmed ? (
                <article className={styles.threadNoticeCard}>
                  <strong>确认后自动开始细化剧情内容</strong>
                  <p>右侧文档会按步骤逐步渲染，支持后续局部微调与历史版本切换。</p>
                  <button type="button" className={styles.confirmOutlineButton} onClick={state.handleConfirmOutline} disabled={state.plannerSubmitting}>
                    确认大纲
                  </button>
                </article>
              ) : null}
            </article>

            {state.outlineConfirmed ? (
              <article className={styles.assistantThread}>
                <header className={styles.messageAgentHeader}>
                  <span className={styles.messageAgentMark}>S</span>
                  <span>{SEKO_ASSISTANT_NAME}</span>
                </header>

                <article className={styles.llmStepCard}>
                  <div className={styles.threadStepItem}>
                    <span className={styles.threadStepDot}>✓</span>
                    <strong>细化剧情内容</strong>
                  </div>
                </article>

                <p className={styles.messageBubble}>{sekoPlanThreadData.refinementReply}</p>

                <article className={styles.docStepsCard}>
                  {state.refinementDetailSteps.map((step: PlannerRefinementStepView, index: number) => (
                    <div key={step.title} className={styles.docStepItem}>
                      <span className={cx(styles.docStepDot, step.status === 'done' && styles.docStepDotDone, step.status === 'running' && styles.docStepDotRunning)} />
                      {index < state.refinementDetailSteps.length - 1 ? <span className={styles.docStepConnector} /> : null}
                      <div className={styles.docStepBody}>
                        <strong>{step.title}</strong>
                        {step.tags.length ? (
                          <div className={styles.docStepTags}>
                            {step.tags.map((tag) => (
                              <span key={`${step.title}-${tag}`} className={styles.docStepTag}>
                                {tag}
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </article>

                {state.activeVersion ? (
                  <article className={styles.threadNoticeCard}>
                    <strong>{`当前版本：V${state.activeVersion.versionNumber}`}</strong>
                    <p>
                      {state.activeVersion.status === 'running'
                        ? `细化进行中，进度 ${state.activeVersion.progressPercent}%。`
                        : '当前版本已完成，可在右侧微调内容。'}
                    </p>
                  </article>
                ) : null}
              </article>
            ) : null}

            {state.messages.map((item) => {
              const isUser = item.role === 'user';

              return (
                <article key={item.id} className={cx(styles.messageRow, isUser && styles.messageRowUser)}>
                  {!isUser ? <span className={styles.messageAuthor}>{state.studio.assistantName}</span> : null}
                  <p className={cx(styles.messageBubble, isUser && styles.messageBubbleUser)}>{item.content}</p>
                </article>
              );
            })}
          </>
        )}
      </div>

      <div className={styles.composerWrap}>
        <form
          className={styles.composer}
          onSubmit={(event) => {
            event.preventDefault();
            state.handleComposerSubmit();
          }}
        >
          <textarea
            className={styles.composerTextarea}
            value={state.requirement}
            onChange={(event) => state.setRequirement(event.target.value)}
            placeholder={state.outlineConfirmed ? '输入补充要求，提交后生成新版本' : '输入你的反馈，点击提交开始细化'}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                state.handleComposerSubmit();
              }
            }}
          />

          <div className={styles.composerBottom}>
            <span>按 Enter 提交，Shift+Enter 换行</span>
            <button
              type="submit"
              className={styles.composerSubmitButton}
              disabled={!state.requirement.trim() || state.plannerSubmitting}
              aria-label={state.outlineConfirmed ? '提交并生成新版本' : '提交并开始细化'}
              title={state.outlineConfirmed ? '提交' : '确认并提交'}
            >
              <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M4.75 9.917 10 4.667m0 0 5.25 5.25M10 4.667v10.666" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </form>

        {state.notice ? (
          state.notice.detail || state.notice.action ? (
            <article
              className={cx(
                styles.noticeCard,
                state.notice.tone === 'warning' && styles.noticeCardWarning,
                state.notice.tone === 'error' && styles.noticeCardError,
              )}
            >
              <strong>{state.notice.message}</strong>
              {state.notice.detail ? <p>{state.notice.detail}</p> : null}
              {state.notice.action ? (
                <Link href={state.notice.action.href} className={styles.noticeAction}>
                  {state.notice.action.label}
                </Link>
              ) : null}
            </article>
          ) : (
            <p
              className={cx(
                styles.notice,
                state.notice.tone === 'warning' && styles.noticeWarning,
                state.notice.tone === 'error' && styles.noticeError,
              )}
            >
              {state.notice.message}
            </p>
          )
        ) : null}
      </div>
    </div>
  );
}
