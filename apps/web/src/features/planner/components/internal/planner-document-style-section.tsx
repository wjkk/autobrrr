import type { UsePlannerPageStateResult } from '../../hooks/use-planner-page-state';
import styles from '../planner-page.module.css';

interface PlannerDocumentStyleSectionProps {
  document: UsePlannerPageStateResult['document'];
}

export function PlannerDocumentStyleSection({ document }: PlannerDocumentStyleSectionProps) {
  return (
    <section id="doc-style" className={styles.docSection}>
      <h3 className={styles.sectionTitle}>美术风格</h3>
      <ul>
        {document.plannerDoc.styleBullets.map((line: string, index: number) => (
          <li key={`style-${index}`}>{line}</li>
        ))}
      </ul>
      <p className={styles.styleHint}>当前执行风格：{document.activeStyle.name} · {document.activeStyle.tone}</p>
    </section>
  );
}
