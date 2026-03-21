import type { UsePlannerPageStateResult } from '../../hooks/use-planner-page-state';
import { PlannerScriptActs } from '../planner-script-acts';
import styles from '../planner-page.module.css';

interface PlannerDocumentScriptSectionProps {
  document: UsePlannerPageStateResult['document'];
}

export function PlannerDocumentScriptSection({ document }: PlannerDocumentScriptSectionProps) {
  return (
    <section id="doc-script" className={styles.docSection}>
      <h3 className={styles.sectionTitle}>分镜剧本</h3>

      <div className={styles.scriptSummaryCard}>
        <strong>剧本摘要</strong>
        <ul>
          {document.plannerDoc.scriptSummary.map((line: string, index: number) => (
            <li key={`script-summary-${index}`}>{line}</li>
          ))}
          <li>总分镜数：{document.displayScriptActs.reduce((sum, act) => sum + act.shots.length, 0)}</li>
        </ul>
      </div>

      <PlannerScriptActs
        acts={document.displayScriptActs}
        sceneTitles={document.displaySceneCards.map((item) => item.title)}
        plannerSubmitting={document.plannerSubmitting}
        runtimeEnabled={document.runtimeEnabled}
        editingShot={document.editingShot}
        shotDraft={document.shotDraft}
        onOpenShotEditor={document.openShotInlineEditor}
        onOpenShotDeleteDialog={document.openShotDeleteDialog}
        onActRerun={(actId) => void document.rerunActAdjust(actId)}
        onShotDraftChange={document.setShotDraft}
        onRerunShot={() => void document.rerunShotAdjust()}
        onGenerateShotImage={() => void document.generateShotImage()}
        onCancelShotEditor={document.cancelShotInlineEditor}
        onSaveShot={() => void document.applyShotInlineEditor()}
      />
    </section>
  );
}
