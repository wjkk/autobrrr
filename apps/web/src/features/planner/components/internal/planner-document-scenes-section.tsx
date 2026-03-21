import type { UsePlannerPageStateResult } from '../../hooks/use-planner-page-state';
import { PlannerDocumentMediaCard } from './planner-document-media-card';
import styles from '../planner-page.module.css';

interface PlannerDocumentScenesSectionProps {
  document: UsePlannerPageStateResult['document'];
}

export function PlannerDocumentScenesSection({ document }: PlannerDocumentScenesSectionProps) {
  return (
    <section id="doc-scenes" className={styles.docSection}>
      <h3 className={styles.sectionTitle}>场景列表</h3>
      <ul>
        {document.plannerDoc.sceneBullets.map((line: string, index: number) => (
          <li key={`scene-line-${index}`}>{line}</li>
        ))}
      </ul>

      <div className={styles.sceneStrip} style={document.mediaCardStyle}>
        {document.displaySceneCards.map((item) => (
          <PlannerDocumentMediaCard
            key={item.id}
            title={item.title}
            image={item.image}
            prompt={item.prompt}
            metaClassName={styles.sceneCardMeta}
            onOpen={() => document.openSceneAdjustDialog(item.id)}
          />
        ))}
      </div>
    </section>
  );
}
