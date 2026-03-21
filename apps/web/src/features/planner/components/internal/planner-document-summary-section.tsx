import type { UsePlannerPageStateResult } from '../../hooks/use-planner-page-state';
import styles from '../planner-page.module.css';

interface PlannerDocumentSummarySectionProps {
  document: UsePlannerPageStateResult['document'];
}

export function PlannerDocumentSummarySection({ document }: PlannerDocumentSummarySectionProps) {
  return (
    <section id="doc-summary" className={styles.docSection}>
      <h3 className={styles.sectionTitle}>故事梗概</h3>
      <ul>
        {document.plannerDoc.summaryBullets.map((line: string, index: number) => (
          <li key={`summary-${index}`}>{line}</li>
        ))}
      </ul>
      <div className={styles.highlightCard}>
        <strong>剧本亮点</strong>
        <ul>
          {document.plannerDoc.highlights.map((item: { title: string; description: string }) => (
            <li key={item.title}>
              <span>{item.title}</span>
              {item.description}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
