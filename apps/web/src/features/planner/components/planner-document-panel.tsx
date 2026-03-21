'use client';

import type { UsePlannerPageStateResult } from '../hooks/use-planner-page-state';
import { PlannerOutlineView } from './planner-outline-view';
import { PlannerShotPromptPreview } from './planner-shot-prompt-preview';
import { PlannerDocumentEmptyState } from './internal/planner-document-empty-state';
import { PlannerDocumentFooter } from './internal/planner-document-footer';
import { PlannerDocumentScenesSection } from './internal/planner-document-scenes-section';
import { PlannerDocumentScriptSection } from './internal/planner-document-script-section';
import { PlannerDocumentStyleSection } from './internal/planner-document-style-section';
import { PlannerDocumentSubjectsSection } from './internal/planner-document-subjects-section';
import { PlannerDocumentSummarySection } from './internal/planner-document-summary-section';
import { PlannerDocumentToc } from './internal/planner-document-toc';
import styles from './planner-page.module.css';

interface PlannerDocumentPanelProps {
  document: UsePlannerPageStateResult['document'];
}

export function PlannerDocumentPanel({ document }: PlannerDocumentPanelProps) {
  return (
    <>
      <div className={styles.resultContent}>
        <div className={styles.documentContainer}>
          {!document.hasDisplayVersion ? <PlannerDocumentEmptyState /> : null}

          {!document.runtimeActiveRefinement && document.runtimeActiveOutline?.outlineDoc ? (
            <PlannerOutlineView outline={document.runtimeActiveOutline.outlineDoc} />
          ) : null}

          {document.displayVersionStatus === 'running' ? (
            <p className={styles.inlineProgressNotice}>
              {document.displayVersionProgress === null ? '剧情细化中' : `剧情细化中 · ${document.displayVersionProgress}%`}
            </p>
          ) : null}

          {document.runtimeActiveRefinement && document.displaySections.summary ? <PlannerDocumentSummarySection document={document} /> : null}
          {document.runtimeActiveRefinement && document.displaySections.style ? <PlannerDocumentStyleSection document={document} /> : null}
          {document.runtimeActiveRefinement && document.displaySections.subjects ? <PlannerDocumentSubjectsSection document={document} /> : null}
          {document.runtimeActiveRefinement && document.displaySections.scenes ? <PlannerDocumentScenesSection document={document} /> : null}
          {document.runtimeActiveRefinement && document.displaySections.script ? <PlannerDocumentScriptSection document={document} /> : null}

          {document.runtimeActiveRefinement ? (
            <PlannerShotPromptPreview
              preview={document.shotPromptPreview}
              loading={document.shotPromptPreviewLoading}
              error={document.shotPromptPreviewError}
              selectedModelName={document.selectedStoryboardModel?.name ?? document.storyboardModelId}
              selectedModelHint={document.selectedStoryboardModel?.hint ?? null}
              shotTitleById={document.shotTitleById}
            />
          ) : null}
        </div>

        <PlannerDocumentToc />
      </div>

      <PlannerDocumentFooter document={document} />
    </>
  );
}
