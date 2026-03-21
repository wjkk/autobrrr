import type { UsePlannerPageStateResult } from '../../hooks/use-planner-page-state';
import { PlannerDocumentMediaCard } from './planner-document-media-card';
import styles from '../planner-page.module.css';

interface PlannerDocumentSubjectsSectionProps {
  document: UsePlannerPageStateResult['document'];
}

export function PlannerDocumentSubjectsSection({ document }: PlannerDocumentSubjectsSectionProps) {
  return (
    <section id="doc-subjects" className={styles.docSection}>
      <h3 className={styles.sectionTitle}>主体列表</h3>
      <ul>
        {document.plannerDoc.subjectBullets.map((line: string, index: number) => (
          <li key={`subject-line-${index}`}>{line}</li>
        ))}
      </ul>

      <div className={styles.subjectStrip} style={document.mediaCardStyle}>
        {document.displaySubjectCards.map((item) => (
          <PlannerDocumentMediaCard
            key={item.id}
            title={item.title}
            image={item.image}
            prompt={item.prompt}
            metaClassName={styles.subjectCardMeta}
            onOpen={() => document.openSubjectAdjustDialog(item.id)}
          />
        ))}
      </div>
    </section>
  );
}
