import { cx } from '@aiv/ui';

import type { UsePlannerPageStateResult } from '../../hooks/use-planner-page-state';
import { formatPlannerDebugRunLabel } from '../../lib/planner-page-helpers';
import {
  readPlannerThreadDiffSummary,
  readPlannerThreadOutlineDoc,
  readPlannerThreadReceiptDebugRunId,
  readPlannerThreadReceiptTitle,
  readPlannerThreadSteps,
} from '../../lib/planner-thread-runtime-presenters';
import { PlannerThreadOutlineMessage } from './planner-thread-outline-message';
import { PlannerThreadReceiptMessage } from './planner-thread-receipt-message';
import { PlannerThreadStepsMessage } from './planner-thread-steps-message';
import styles from '../planner-page.module.css';

const SEKO_ASSISTANT_NAME = 'Seko';

interface PlannerThreadRuntimeProps {
  thread: UsePlannerPageStateResult['thread'];
  showConfirmOutlinePrompt: boolean;
  showActiveDebugApplyNotice: boolean;
  activeDebugRunId: string | null;
}

export function PlannerThreadRuntime(props: PlannerThreadRuntimeProps) {
  const { thread, showConfirmOutlinePrompt, showActiveDebugApplyNotice, activeDebugRunId } = props;

  return (
    <>
      {showActiveDebugApplyNotice ? (
        <article className={styles.threadNoticeCard}>
          <strong>当前工作区版本来自 Planner Debug 调试应用</strong>
          <p>
            {thread.activeDebugApplySource?.debugRunId
              ? `来源 ${formatPlannerDebugRunLabel(thread.activeDebugApplySource.debugRunId)}，已同步为主流程可编辑版本。`
              : '该版本已由调试结果同步为主流程可编辑版本。'}
          </p>
          {activeDebugRunId ? (
            <button type="button" className={styles.threadNoticeAction} onClick={() => thread.openDebugRun(activeDebugRunId)}>
              查看调试 Run
            </button>
          ) : null}
        </article>
      ) : null}

      {thread.messages.map((item) => {
        const isUser = item.role === 'user';
        const stepItems = readPlannerThreadSteps(item.rawContent);
        const receiptTitle = readPlannerThreadReceiptTitle({
          messageType: item.messageType,
          rawContent: item.rawContent,
          runtimeDocumentTitle: thread.runtimeActiveRefinement?.documentTitle ?? thread.runtimeActiveOutline?.documentTitle ?? null,
        });
        const outlineDoc = readPlannerThreadOutlineDoc(item.rawContent);

        if (item.messageType === 'assistant_steps') {
          return (
            <article key={item.id} className={styles.assistantThread}>
              <header className={styles.messageAgentHeader}>
                <span className={styles.messageAgentMark}>S</span>
                <span>{SEKO_ASSISTANT_NAME}</span>
              </header>

              <PlannerThreadStepsMessage messageId={item.id} steps={stepItems} />
            </article>
          );
        }

        if (item.messageType === 'assistant_outline_card') {
          return (
            <article key={item.id} className={styles.assistantThread}>
              <header className={styles.messageAgentHeader}>
                <span className={styles.messageAgentMark}>S</span>
                <span>{SEKO_ASSISTANT_NAME}</span>
              </header>

              <PlannerThreadOutlineMessage messageId={item.id} outlineDoc={outlineDoc} />
            </article>
          );
        }

        if (item.messageType === 'assistant_document_receipt') {
          const diffSummary = readPlannerThreadDiffSummary(item.rawContent);
          const receiptDebugRunId = readPlannerThreadReceiptDebugRunId(item.rawContent);

          return (
            <article key={item.id} className={styles.assistantThread}>
              <header className={styles.messageAgentHeader}>
                <span className={styles.messageAgentMark}>S</span>
                <span>{SEKO_ASSISTANT_NAME}</span>
              </header>

              <PlannerThreadReceiptMessage
                messageId={item.id}
                content={item.content}
                receiptTitle={receiptTitle}
                diffSummary={diffSummary}
                receiptDebugRunId={receiptDebugRunId}
                showActiveDebugApplyNotice={showActiveDebugApplyNotice}
                thread={thread}
              />
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
          <button type="button" className={styles.confirmOutlineButton} onClick={thread.handleConfirmOutline} disabled={thread.plannerSubmitting}>
            确认大纲
          </button>
        </article>
      ) : null}
    </>
  );
}
