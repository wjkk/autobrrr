import styles from '../planner-page.module.css';

export function PlannerDocumentEmptyState() {
  return (
    <article className={styles.emptyDocCard}>
      <strong>等待细化产出</strong>
      <p>确认左侧大纲后，将自动开始细化并逐步渲染主体、场景和分镜剧本。</p>
    </article>
  );
}
