import Link from 'next/link';
import { cx } from '@aiv/ui';

import type { UsePlannerPageStateResult } from '../../hooks/use-planner-page-state';
import styles from '../planner-page.module.css';

interface PlannerThreadComposerProps {
  thread: UsePlannerPageStateResult['thread'];
}

export function PlannerThreadComposer({ thread }: PlannerThreadComposerProps) {
  return (
    <div className={styles.composerWrap}>
      <form
        className={styles.composer}
        onSubmit={(event) => {
          event.preventDefault();
          thread.handleComposerSubmit();
        }}
      >
        <textarea
          className={styles.composerTextarea}
          value={thread.requirement}
          onChange={(event) => thread.setRequirement(event.target.value)}
          placeholder={thread.outlineConfirmed ? '输入补充要求，提交后生成新版本' : '输入你的反馈，点击提交开始细化'}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              thread.handleComposerSubmit();
            }
          }}
        />

        <div className={styles.composerBottom}>
          <span>按 Enter 提交，Shift+Enter 换行</span>
          <button
            type="submit"
            className={styles.composerSubmitButton}
            disabled={!thread.requirement.trim() || thread.plannerSubmitting}
            aria-label={thread.outlineConfirmed ? '提交并生成新版本' : '提交并开始细化'}
            title={thread.outlineConfirmed ? '提交' : '确认并提交'}
          >
            <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M4.75 9.917 10 4.667m0 0 5.25 5.25M10 4.667v10.666" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </form>

      {thread.notice ? (
        thread.notice.detail || thread.notice.action ? (
          <article
            className={cx(
              styles.noticeCard,
              thread.notice.tone === 'warning' && styles.noticeCardWarning,
              thread.notice.tone === 'error' && styles.noticeCardError,
            )}
          >
            <strong>{thread.notice.message}</strong>
            {thread.notice.detail ? <p>{thread.notice.detail}</p> : null}
            {thread.notice.action ? (
              <Link href={thread.notice.action.href} className={styles.noticeAction}>
                {thread.notice.action.label}
              </Link>
            ) : null}
          </article>
        ) : (
          <p
            className={cx(
              styles.notice,
              thread.notice.tone === 'warning' && styles.noticeWarning,
              thread.notice.tone === 'error' && styles.noticeError,
            )}
          >
            {thread.notice.message}
          </p>
        )
      ) : null}
    </div>
  );
}
