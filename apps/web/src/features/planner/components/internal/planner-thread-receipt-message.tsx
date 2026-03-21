import { formatPlannerDebugRunLabel } from '../../lib/planner-page-helpers';
import type { UsePlannerPageStateResult } from '../../hooks/use-planner-page-state';
import styles from '../planner-page.module.css';

interface PlannerThreadReceiptMessageProps {
  messageId: string;
  content: string;
  receiptTitle: string | null;
  diffSummary: string[];
  receiptDebugRunId: string | null;
  showActiveDebugApplyNotice: boolean;
  thread: UsePlannerPageStateResult['thread'];
}

export function PlannerThreadReceiptMessage(props: PlannerThreadReceiptMessageProps) {
  const { content, receiptTitle, diffSummary, receiptDebugRunId, showActiveDebugApplyNotice, thread, messageId } = props;

  return (
    <article className={styles.threadNoticeCard}>
      <strong>{receiptTitle ? `已更新：${receiptTitle}` : '已更新右侧策划文档'}</strong>
      <p>{content || '策划文档已同步完成，可继续追问或切换版本。'}</p>
      {diffSummary.length > 0 ? (
        <ul className={styles.threadNoticeList}>
          {diffSummary.map((detail) => (
            <li key={`${messageId}-${detail}`}>{detail}</li>
          ))}
        </ul>
      ) : null}
      {thread.runtimeActiveRefinement?.versionNumber ? (
        <p>{`当前版本：V${thread.runtimeActiveRefinement.versionNumber} · ${thread.runtimeActiveRefinement.subAgentProfile?.displayName ?? '未命名子 Agent'}`}</p>
      ) : null}
      {showActiveDebugApplyNotice ? (
        <p>
          {thread.activeDebugApplySource?.debugRunId
            ? `版本来源：${formatPlannerDebugRunLabel(thread.activeDebugApplySource.debugRunId)}`
            : '版本来源：Planner Debug 调试应用'}
        </p>
      ) : null}
      {receiptDebugRunId ? (
        <button type="button" className={styles.threadNoticeAction} onClick={() => thread.openDebugRun(receiptDebugRunId)}>
          查看来源调试 Run
        </button>
      ) : null}
    </article>
  );
}
