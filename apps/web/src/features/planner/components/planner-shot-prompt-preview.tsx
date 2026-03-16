import type { ApiPlannerShotPromptPreview } from '../lib/planner-api';

import styles from './planner-page.module.css';

interface PlannerShotPromptPreviewProps {
  preview: ApiPlannerShotPromptPreview | null;
  loading: boolean;
  error: string | null;
  selectedModelName: string;
  selectedModelHint: string | null;
  shotTitleById: Record<string, string>;
}

function formatPromptGroupLabel(group: ApiPlannerShotPromptPreview['prompts'][number], shotTitleById: Record<string, string>) {
  const shotTitles = group.shotIds.map((shotId) => shotTitleById[shotId] ?? shotId);
  return shotTitles.join(' / ');
}

export function PlannerShotPromptPreview(props: PlannerShotPromptPreviewProps) {
  const hasPreview = Boolean(props.preview && props.preview.prompts.length > 0);

  return (
    <section className={styles.promptPreviewSection} aria-label="分镜提示词预览">
      <div className={styles.promptPreviewHeader}>
        <div>
          <h3>生成提示词预览</h3>
          <p>切换模型只会重算预览，不会改写当前策划版本。</p>
        </div>
        <div className={styles.promptPreviewMeta}>
          <strong>{props.preview?.model.familyName ?? props.selectedModelName}</strong>
          <span>{props.preview?.model.summary ?? props.selectedModelHint ?? '根据当前分镜内容实时生成。'}</span>
        </div>
      </div>

      {props.loading ? <p className={styles.promptPreviewNotice}>正在根据当前模型生成预览...</p> : null}
      {!props.loading && props.error ? <p className={styles.promptPreviewError}>{props.error}</p> : null}
      {!props.loading && !props.error && !hasPreview ? (
        <p className={styles.promptPreviewNotice}>当前还没有可预览的分镜提示词。</p>
      ) : null}

      {hasPreview ? (
        <div className={styles.promptPreviewList}>
          {props.preview!.prompts.map((group) => (
            <article key={group.groupId} className={styles.promptPreviewCard}>
              <div className={styles.promptPreviewCardHeader}>
                <div>
                  <strong>{formatPromptGroupLabel(group, props.shotTitleById)}</strong>
                  <span>{group.mode === 'multi-shot' ? '多镜头叙事输出' : '单镜头逐条输出'}</span>
                </div>
                <div className={styles.promptPreviewBadges}>
                  <span>{group.promptPayload.shotCount} 镜</span>
                  <span>{group.promptPayload.audioDescStyle === 'inline' ? '内联音效' : '忽略音效'}</span>
                </div>
              </div>

              <pre className={styles.promptPreviewText}>{group.promptText}</pre>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
