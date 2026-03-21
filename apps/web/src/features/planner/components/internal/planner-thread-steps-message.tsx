import { cx } from '@aiv/ui';

import styles from '../planner-page.module.css';

interface PlannerThreadStepsMessageProps {
  messageId: string;
  steps: Record<string, unknown>[];
}

export function PlannerThreadStepsMessage({ messageId, steps }: PlannerThreadStepsMessageProps) {
  return (
    <article className={styles.docStepsCard}>
      {steps.map((step, index) => {
        const title = typeof step.title === 'string' ? step.title : `步骤 ${index + 1}`;
        const status = typeof step.status === 'string' ? step.status : 'done';
        const tags = Array.isArray(step.details)
          ? step.details.filter((detail): detail is string => typeof detail === 'string')
          : [];

        return (
          <div key={`${messageId}-${title}-${index}`} className={styles.docStepItem}>
            <span
              className={cx(
                styles.docStepDot,
                status === 'done' && styles.docStepDotDone,
                status === 'running' && styles.docStepDotRunning,
              )}
            />
            {index < steps.length - 1 ? <span className={styles.docStepConnector} /> : null}
            <div className={styles.docStepBody}>
              <strong>{title}</strong>
              {tags.length ? (
                <div className={styles.docStepTags}>
                  {tags.map((tag) => (
                    <span key={`${messageId}-${title}-${tag}`} className={styles.docStepTag}>
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
  );
}
