'use client';

import { cx } from '@aiv/ui';
import type { CSSProperties } from 'react';

import type { ApiPlannerShotPromptPreview } from '../lib/planner-api';
import type { PlannerOutlineDoc } from '../lib/planner-outline-doc';
import type { PlannerShotDraftState, PlannerShotPointer } from '../lib/planner-shot-editor';
import type { SekoActDraft, SekoImageCard, SekoPlanData } from '../lib/seko-plan-data';
import { PlannerOutlineView } from './planner-outline-view';
import { PlannerShotPromptPreview } from './planner-shot-prompt-preview';
import { PlannerScriptActs } from './planner-script-acts';
import styles from './planner-page.module.css';

interface PlannerDocumentPanelProps {
  hasDisplayVersion: boolean;
  runtimeActiveRefinement: boolean;
  runtimeActiveOutlineDoc: PlannerOutlineDoc | null;
  displayVersionStatus: string | null;
  displayVersionProgress: number | null;
  displaySections: {
    summary: boolean;
    style: boolean;
    subjects: boolean;
    scenes: boolean;
    script: boolean;
  };
  plannerDoc: SekoPlanData;
  activeStyle: {
    name: string;
    tone: string;
  };
  mediaCardStyle: CSSProperties;
  displaySubjectCards: SekoImageCard[];
  displaySceneCards: SekoImageCard[];
  displayScriptActs: SekoActDraft[];
  plannerSubmitting: boolean;
  runtimeEnabled: boolean;
  editingShot: PlannerShotPointer | null;
  shotDraft: PlannerShotDraftState | null;
  onOpenSubjectAdjust: (cardId: string) => void;
  onOpenSceneAdjust: (cardId: string) => void;
  onOpenShotEditor: (actId: string, shotId: string) => void;
  onOpenShotDeleteDialog: (actId: string, shotId: string) => void;
  onActRerun: (actId: string) => void;
  onShotDraftChange: (updater: (current: PlannerShotDraftState | null) => PlannerShotDraftState | null) => void;
  onRerunShot: () => void;
  onGenerateShotImage: () => void;
  onCancelShotEditor: () => void;
  onSaveShot: () => void;
  shotPromptPreview: ApiPlannerShotPromptPreview | null;
  shotPromptPreviewLoading: boolean;
  shotPromptPreviewError: string | null;
  selectedStoryboardModelName: string;
  selectedStoryboardModelHint: string | null;
  shotTitleById: Record<string, string>;
  tocItems: Array<{ id: string; title: string }>;
  storyboardModelId: string;
  storyboardModelOptions: Array<{ id: string; name: string }>;
  aspectRatio: '16:9' | '9:16' | '4:3' | '3:4';
  aspectRatioOptions: Array<'16:9' | '9:16' | '4:3' | '3:4'>;
  onStoryboardModelChange: (value: string) => void;
  onAspectRatioChange: (value: '16:9' | '9:16' | '4:3' | '3:4') => void;
  onStartCreation: () => void;
  creationActionLabel: string;
  creationActionDisabled: boolean;
}

export function PlannerDocumentPanel(props: PlannerDocumentPanelProps) {
  return (
    <>
      <div className={styles.resultContent}>
        <div className={styles.documentContainer}>
          {!props.hasDisplayVersion ? (
            <article className={styles.emptyDocCard}>
              <strong>等待细化产出</strong>
              <p>确认左侧大纲后，将自动开始细化并逐步渲染主体、场景和分镜剧本。</p>
            </article>
          ) : null}

          {!props.runtimeActiveRefinement && props.runtimeActiveOutlineDoc ? (
            <PlannerOutlineView outline={props.runtimeActiveOutlineDoc} />
          ) : null}

          {props.displayVersionStatus === 'running' ? (
            <p className={styles.inlineProgressNotice}>
              {props.displayVersionProgress === null ? '剧情细化中' : `剧情细化中 · ${props.displayVersionProgress}%`}
            </p>
          ) : null}

          {props.runtimeActiveRefinement && props.displaySections.summary ? (
            <section id="doc-summary" className={styles.docSection}>
              <h3 className={styles.sectionTitle}>故事梗概</h3>
              <ul>
                {props.plannerDoc.summaryBullets.map((line, index) => (
                  <li key={`summary-${index}`}>{line}</li>
                ))}
              </ul>
              <div className={styles.highlightCard}>
                <strong>剧本亮点</strong>
                <ul>
                  {props.plannerDoc.highlights.map((item) => (
                    <li key={item.title}>
                      <span>{item.title}</span>
                      {item.description}
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          ) : null}

          {props.runtimeActiveRefinement && props.displaySections.style ? (
            <section id="doc-style" className={styles.docSection}>
              <h3 className={styles.sectionTitle}>美术风格</h3>
              <ul>
                {props.plannerDoc.styleBullets.map((line, index) => (
                  <li key={`style-${index}`}>{line}</li>
                ))}
              </ul>
              <p className={styles.styleHint}>当前执行风格：{props.activeStyle.name} · {props.activeStyle.tone}</p>
            </section>
          ) : null}

          {props.runtimeActiveRefinement && props.displaySections.subjects ? (
            <section id="doc-subjects" className={styles.docSection}>
              <h3 className={styles.sectionTitle}>主体列表</h3>
              <ul>
                {props.plannerDoc.subjectBullets.map((line, index) => (
                  <li key={`subject-line-${index}`}>{line}</li>
                ))}
              </ul>

              <div className={styles.subjectStrip} style={props.mediaCardStyle}>
                {props.displaySubjectCards.map((item) => (
                  <article key={item.id} className={styles.subjectCard} onClick={() => props.onOpenSubjectAdjust(item.id)} role="button" tabIndex={0}>
                    <button
                      type="button"
                      className={styles.cardHoverIconButton}
                      onClick={(event) => {
                        event.stopPropagation();
                        props.onOpenSubjectAdjust(item.id);
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

          {props.runtimeActiveRefinement && props.displaySections.scenes ? (
            <section id="doc-scenes" className={styles.docSection}>
              <h3 className={styles.sectionTitle}>场景列表</h3>
              <ul>
                {props.plannerDoc.sceneBullets.map((line, index) => (
                  <li key={`scene-line-${index}`}>{line}</li>
                ))}
              </ul>

              <div className={styles.sceneStrip} style={props.mediaCardStyle}>
                {props.displaySceneCards.map((item) => (
                  <article key={item.id} className={styles.sceneThumbCard} onClick={() => props.onOpenSceneAdjust(item.id)} role="button" tabIndex={0}>
                    <button
                      type="button"
                      className={styles.cardHoverIconButton}
                      onClick={(event) => {
                        event.stopPropagation();
                        props.onOpenSceneAdjust(item.id);
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

          {props.runtimeActiveRefinement && props.displaySections.script ? (
            <section id="doc-script" className={styles.docSection}>
              <h3 className={styles.sectionTitle}>分镜剧本</h3>

              <div className={styles.scriptSummaryCard}>
                <strong>剧本摘要</strong>
                <ul>
                  {props.plannerDoc.scriptSummary.map((line, index) => (
                    <li key={`script-summary-${index}`}>{line}</li>
                  ))}
                  <li>总分镜数：{props.displayScriptActs.reduce((sum, act) => sum + act.shots.length, 0)}</li>
                </ul>
              </div>

              <PlannerScriptActs
                acts={props.displayScriptActs}
                sceneTitles={props.displaySceneCards.map((item) => item.title)}
                plannerSubmitting={props.plannerSubmitting}
                runtimeEnabled={props.runtimeEnabled}
                editingShot={props.editingShot}
                shotDraft={props.shotDraft}
                onOpenShotEditor={props.onOpenShotEditor}
                onOpenShotDeleteDialog={props.onOpenShotDeleteDialog}
                onActRerun={props.onActRerun}
                onShotDraftChange={props.onShotDraftChange}
                onRerunShot={props.onRerunShot}
                onGenerateShotImage={props.onGenerateShotImage}
                onCancelShotEditor={props.onCancelShotEditor}
                onSaveShot={props.onSaveShot}
              />
            </section>
          ) : null}

          {props.runtimeActiveRefinement ? (
            <PlannerShotPromptPreview
              preview={props.shotPromptPreview}
              loading={props.shotPromptPreviewLoading}
              error={props.shotPromptPreviewError}
              selectedModelName={props.selectedStoryboardModelName}
              selectedModelHint={props.selectedStoryboardModelHint}
              shotTitleById={props.shotTitleById}
            />
          ) : null}
        </div>

        <aside className={styles.tocRail} aria-label="文档目录">
          <ul className={styles.tocMiniList}>
            {props.tocItems.map((item, index) => (
              <li key={`mini-${item.id}`}>
                <a href={`#${item.id}`} className={cx(styles.tocMiniItem, index === 0 && styles.tocMiniItemActive)} aria-label={item.title}>
                  <span className={styles.tocMiniLine} />
                </a>
              </li>
            ))}
          </ul>

          <nav className={styles.tocPopover}>
            {props.tocItems.map((item, index) => (
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
            <select value={props.storyboardModelId} onChange={(event) => props.onStoryboardModelChange(event.target.value)}>
              {props.storyboardModelOptions.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>画面比例</span>
            <select value={props.aspectRatio} onChange={(event) => props.onAspectRatioChange(event.target.value as typeof props.aspectRatio)}>
              {props.aspectRatioOptions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
        </div>

        <button type="button" className={styles.generateButton} onClick={props.onStartCreation} disabled={props.creationActionDisabled}>
          {props.creationActionLabel}
        </button>
      </footer>
    </>
  );
}
