import { ASPECT_RATIO_OPTIONS } from '../../lib/planner-page-helpers';
import { PLANNER_VIDEO_MODEL_OPTIONS } from '../../lib/planner-video-model-options';
import type { UsePlannerPageStateResult } from '../../hooks/use-planner-page-state';
import styles from '../planner-page.module.css';

interface PlannerDocumentFooterProps {
  document: UsePlannerPageStateResult['document'];
}

export function PlannerDocumentFooter({ document }: PlannerDocumentFooterProps) {
  return (
    <footer className={styles.resultFooter}>
      <div className={styles.footerSelectors}>
        <label>
          <span>分镜图模型</span>
          <select value={document.storyboardModelId} onChange={(event) => document.setStoryboardModelId(event.target.value)}>
            {PLANNER_VIDEO_MODEL_OPTIONS.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>画面比例</span>
          <select value={document.aspectRatio} onChange={(event) => document.setAspectRatio(event.target.value as typeof document.aspectRatio)}>
            {ASPECT_RATIO_OPTIONS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
      </div>

      <button type="button" className={styles.generateButton} onClick={() => void document.startCreation()} disabled={document.plannerSubmitting || document.creationActionDisabled}>
        {document.creationActionLabel}
      </button>
    </footer>
  );
}
