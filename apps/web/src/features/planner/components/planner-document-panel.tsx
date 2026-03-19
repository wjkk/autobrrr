'use client';

import { cx } from '@aiv/ui';
import { usePlannerPageContext } from '../lib/planner-page-context';
import { ASPECT_RATIO_OPTIONS, DOC_TOC } from '../lib/planner-page-helpers';
import { PLANNER_VIDEO_MODEL_OPTIONS } from '../lib/planner-video-model-options';
import { PlannerOutlineView } from './planner-outline-view';
import { PlannerShotPromptPreview } from './planner-shot-prompt-preview';
import { PlannerScriptActs } from './planner-script-acts';
import styles from './planner-page.module.css';

export function PlannerDocumentPanel() {
  const state = usePlannerPageContext();

  return (
    <>
      <div className={styles.resultContent}>
        <div className={styles.documentContainer}>
          {!state.hasDisplayVersion ? (
            <article className={styles.emptyDocCard}>
              <strong>等待细化产出</strong>
              <p>确认左侧大纲后，将自动开始细化并逐步渲染主体、场景和分镜剧本。</p>
            </article>
          ) : null}

          {!state.runtimeActiveRefinement && state.runtimeActiveOutline?.outlineDoc ? (
            <PlannerOutlineView outline={state.runtimeActiveOutline.outlineDoc} />
          ) : null}

          {state.displayVersionStatus === 'running' ? (
            <p className={styles.inlineProgressNotice}>
              {state.displayVersionProgress === null ? '剧情细化中' : `剧情细化中 · ${state.displayVersionProgress}%`}
            </p>
          ) : null}

          {state.runtimeActiveRefinement && state.displaySections.summary ? (
            <section id="doc-summary" className={styles.docSection}>
              <h3 className={styles.sectionTitle}>故事梗概</h3>
              <ul>
                {state.plannerDoc.summaryBullets.map((line, index) => (
                  <li key={`summary-${index}`}>{line}</li>
                ))}
              </ul>
              <div className={styles.highlightCard}>
                <strong>剧本亮点</strong>
                <ul>
                  {state.plannerDoc.highlights.map((item) => (
                    <li key={item.title}>
                      <span>{item.title}</span>
                      {item.description}
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          ) : null}

          {state.runtimeActiveRefinement && state.displaySections.style ? (
            <section id="doc-style" className={styles.docSection}>
              <h3 className={styles.sectionTitle}>美术风格</h3>
              <ul>
                {state.plannerDoc.styleBullets.map((line, index) => (
                  <li key={`style-${index}`}>{line}</li>
                ))}
              </ul>
              <p className={styles.styleHint}>当前执行风格：{state.activeStyle.name} · {state.activeStyle.tone}</p>
            </section>
          ) : null}

          {state.runtimeActiveRefinement && state.displaySections.subjects ? (
            <section id="doc-subjects" className={styles.docSection}>
              <h3 className={styles.sectionTitle}>主体列表</h3>
              <ul>
                {state.plannerDoc.subjectBullets.map((line, index) => (
                  <li key={`subject-line-${index}`}>{line}</li>
                ))}
              </ul>

              <div className={styles.subjectStrip} style={state.mediaCardStyle}>
                {state.displaySubjectCards.map((item) => (
                  <article key={item.id} className={styles.subjectCard} onClick={() => state.openSubjectAdjustDialog(item.id)} role="button" tabIndex={0}>
                    <button
                      type="button"
                      className={styles.cardHoverIconButton}
                      onClick={(event) => {
                        event.stopPropagation();
                        state.openSubjectAdjustDialog(item.id);
                      }}
                      aria-label={`调整 ${item.title}`}
                    >
                      <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                        <path stroke="currentColor" strokeWidth="1.25" d="M14.049 4.354a1.147 1.147 0 0 1 1.621 0l.811.81a1.147 1.147 0 0 1 0 1.622L6.075 17.192a.46.46 0 0 1-.325.135H3.967a.46.46 0 0 1-.459-.459v-1.784c0-.121.048-.238.134-.324z" />
                        <path fill="currentColor" d="M14.049 4.354a1.147 1.147 0 0 1 1.621 0l.811.81a1.147 1.147 0 0 1 0 1.622l-2.108 2.108c-.18.18-.47.18-.649 0l-1.783-1.783a.46.46 0 0 1 0-.65z" />
                      </svg>
                    </button>
                    <img src={item.image} alt={item.prompt || item.title} loading="lazy" />
                    <div className={styles.subjectCardMeta}>
                      <strong>{item.title}</strong>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          {state.runtimeActiveRefinement && state.displaySections.scenes ? (
            <section id="doc-scenes" className={styles.docSection}>
              <h3 className={styles.sectionTitle}>场景列表</h3>
              <ul>
                {state.plannerDoc.sceneBullets.map((line, index) => (
                  <li key={`scene-line-${index}`}>{line}</li>
                ))}
              </ul>

              <div className={styles.sceneStrip} style={state.mediaCardStyle}>
                {state.displaySceneCards.map((item) => (
                  <article key={item.id} className={styles.sceneThumbCard} onClick={() => state.openSceneAdjustDialog(item.id)} role="button" tabIndex={0}>
                    <button
                      type="button"
                      className={styles.cardHoverIconButton}
                      onClick={(event) => {
                        event.stopPropagation();
                        state.openSceneAdjustDialog(item.id);
                      }}
                      aria-label={`调整 ${item.title}`}
                    >
                      <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                        <path stroke="currentColor" strokeWidth="1.25" d="M14.049 4.354a1.147 1.147 0 0 1 1.621 0l.811.81a1.147 1.147 0 0 1 0 1.622L6.075 17.192a.46.46 0 0 1-.325.135H3.967a.46.46 0 0 1-.459-.459v-1.784c0-.121.048-.238.134-.324z" />
                        <path fill="currentColor" d="M14.049 4.354a1.147 1.147 0 0 1 1.621 0l.811.81a1.147 1.147 0 0 1 0 1.622l-2.108 2.108c-.18.18-.47.18-.649 0l-1.783-1.783a.46.46 0 0 1 0-.65z" />
                      </svg>
                    </button>
                    <img src={item.image} alt={item.prompt || item.title} loading="lazy" />
                    <div className={styles.sceneCardMeta}>
                      <strong>{item.title}</strong>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          {state.runtimeActiveRefinement && state.displaySections.script ? (
            <section id="doc-script" className={styles.docSection}>
              <h3 className={styles.sectionTitle}>分镜剧本</h3>

              <div className={styles.scriptSummaryCard}>
                <strong>剧本摘要</strong>
                <ul>
                  {state.plannerDoc.scriptSummary.map((line, index) => (
                    <li key={`script-summary-${index}`}>{line}</li>
                  ))}
                  <li>总分镜数：{state.displayScriptActs.reduce((sum, act) => sum + act.shots.length, 0)}</li>
                </ul>
              </div>

              <PlannerScriptActs
                acts={state.displayScriptActs}
                sceneTitles={state.displaySceneCards.map((item) => item.title)}
                plannerSubmitting={state.plannerSubmitting}
                runtimeEnabled={Boolean(state.runtimeApi)}
                editingShot={state.editingShot}
                shotDraft={state.shotDraft}
                onOpenShotEditor={state.openShotInlineEditor}
                onOpenShotDeleteDialog={state.openShotDeleteDialog}
                onActRerun={(actId) => void state.rerunActAdjust(actId)}
                onShotDraftChange={state.setShotDraft}
                onRerunShot={() => void state.rerunShotAdjust()}
                onGenerateShotImage={() => void state.generateShotImage()}
                onCancelShotEditor={state.cancelShotInlineEditor}
                onSaveShot={() => void state.applyShotInlineEditor()}
              />
            </section>
          ) : null}

          {state.runtimeActiveRefinement ? (
            <PlannerShotPromptPreview
              preview={state.shotPromptPreview}
              loading={state.shotPromptPreviewLoading}
              error={state.shotPromptPreviewError}
              selectedModelName={state.selectedStoryboardModel?.name ?? state.storyboardModelId}
              selectedModelHint={state.selectedStoryboardModel?.hint ?? null}
              shotTitleById={state.shotTitleById}
            />
          ) : null}
        </div>

        <aside className={styles.tocRail} aria-label="文档目录">
          <ul className={styles.tocMiniList}>
            {DOC_TOC.map((item, index) => (
              <li key={`mini-${item.id}`}>
                <a href={`#${item.id}`} className={cx(styles.tocMiniItem, index === 0 && styles.tocMiniItemActive)} aria-label={item.title}>
                  <span className={styles.tocMiniLine} />
                </a>
              </li>
            ))}
          </ul>

          <nav className={styles.tocPopover}>
            {DOC_TOC.map((item, index) => (
              <a key={item.id} href={`#${item.id}`} className={cx(styles.tocItem, index === 0 && styles.tocItemActive)}>
                <span className={styles.tocLine} />
                <span className={styles.tocText}>{item.title}</span>
              </a>
            ))}
          </nav>
        </aside>
      </div>

      <footer className={styles.resultFooter}>
        <div className={styles.footerSelectors}>
          <label>
            <span>分镜图模型</span>
            <select value={state.storyboardModelId} onChange={(event) => state.setStoryboardModelId(event.target.value)}>
              {PLANNER_VIDEO_MODEL_OPTIONS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>画面比例</span>
            <select value={state.aspectRatio} onChange={(event) => state.setAspectRatio(event.target.value as typeof state.aspectRatio)}>
              {ASPECT_RATIO_OPTIONS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
        </div>

        <button type="button" className={styles.generateButton} onClick={() => void state.startCreation()} disabled={state.plannerSubmitting || state.creationActionDisabled}>
          {state.creationActionLabel}
        </button>
      </footer>
    </>
  );
}
