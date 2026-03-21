import type { PlannerStepStatus } from '@aiv/domain';
import { cx } from '@aiv/ui';
import { sekoPlanThreadData } from '@aiv/mock-data';

import type { UsePlannerPageStateResult } from '../../hooks/use-planner-page-state';
import styles from '../planner-page.module.css';

interface PlannerRefinementStepView {
  title: string;
  status: PlannerStepStatus;
  tags: string[];
}

const SEKO_ASSISTANT_NAME = 'Seko';

interface PlannerThreadSeedProps {
  thread: UsePlannerPageStateResult['thread'];
}

export function PlannerThreadSeed({ thread }: PlannerThreadSeedProps) {
  return (
    <>
      <article className={cx(styles.messageRow, styles.messageRowUser)}>
        <p className={cx(styles.messageBubble, styles.messageBubbleUser)}>{thread.requirement || sekoPlanThreadData.userPrompt}</p>
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
        {thread.serverPlannerText ? <p className={styles.messageBubble}>{thread.serverPlannerText}</p> : null}

        {!thread.outlineConfirmed ? (
          <article className={styles.threadNoticeCard}>
            <strong>确认后自动开始细化剧情内容</strong>
            <p>右侧文档会按步骤逐步渲染，支持后续局部微调与历史版本切换。</p>
            <button type="button" className={styles.confirmOutlineButton} onClick={thread.handleConfirmOutline} disabled={thread.plannerSubmitting}>
              确认大纲
            </button>
          </article>
        ) : null}
      </article>

      {thread.outlineConfirmed ? (
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
            {thread.refinementDetailSteps.map((step: PlannerRefinementStepView, index: number) => (
              <div key={step.title} className={styles.docStepItem}>
                <span className={cx(styles.docStepDot, step.status === 'done' && styles.docStepDotDone, step.status === 'running' && styles.docStepDotRunning)} />
                {index < thread.refinementDetailSteps.length - 1 ? <span className={styles.docStepConnector} /> : null}
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

          {thread.activeVersion ? (
            <article className={styles.threadNoticeCard}>
              <strong>{`当前版本：V${thread.activeVersion.versionNumber}`}</strong>
              <p>
                {thread.activeVersion.status === 'running'
                  ? `细化进行中，进度 ${thread.activeVersion.progressPercent}%。`
                  : '当前版本已完成，可在右侧微调内容。'}
              </p>
            </article>
          ) : null}
        </article>
      ) : null}

      {thread.messages.map((item) => {
        const isUser = item.role === 'user';

        return (
          <article key={item.id} className={cx(styles.messageRow, isUser && styles.messageRowUser)}>
            {!isUser ? <span className={styles.messageAuthor}>{thread.studio.assistantName}</span> : null}
            <p className={cx(styles.messageBubble, isUser && styles.messageBubbleUser)}>{item.content}</p>
          </article>
        );
      })}
    </>
  );
}
