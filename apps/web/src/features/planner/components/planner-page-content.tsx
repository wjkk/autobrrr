'use client';

import { cx } from '@aiv/ui';

import { usePlannerPageContext } from '../lib/planner-page-context';
import { plannerModeLabel } from '../lib/planner-page-helpers';
import { PlannerDocumentPanel } from './planner-document-panel';
import { PlannerEpisodeRail } from './planner-episode-rail';
import { PlannerPageDialogs } from './planner-page-dialogs';
import { PlannerPageHeader } from './planner-page-header';
import { PlannerResultHeader } from './planner-result-header';
import { PlannerThreadPanel } from './planner-thread-panel';
import styles from './planner-page.module.css';

export function PlannerPageContent() {
  const state = usePlannerPageContext();

  return (
    <>
      <div className={styles.page}>
        <PlannerPageHeader
          title={state.displayTitle}
          brief={state.studio.project.brief}
          plannerModeLabel={plannerModeLabel(state.plannerMode)}
          onOpenAgentDebug={state.runtimeApi ? state.openAgentDebug : undefined}
          onBackToExplore={state.backToExplore}
        />

        <div className={styles.workspace}>
          <section className={styles.leftPanel}>
            <div className={cx(styles.leftPanelInner, state.plannerMode === 'single' && styles.leftPanelSingle)}>
              {state.plannerMode === 'series' ? (
                <PlannerEpisodeRail
                  episodes={state.plannerEpisodes}
                  activeEpisodeId={state.activeEpisodeId}
                  onSelectEpisode={state.setActiveEpisodeId}
                />
              ) : null}

              <PlannerThreadPanel />
            </div>
          </section>

          <section className={styles.rightPanel}>
            <PlannerResultHeader
              activeEpisodeNumber={state.activeEpisodeNumber}
              activeEpisodeTitle={state.activeEpisode?.title ?? ''}
              fallbackEpisodeTitle={state.plannerDoc.episodeTitle}
              saveState={state.saveState}
              latestExecutionMode={state.latestPlannerExecutionMode}
              activeDebugApplySource={state.activeDebugApplySource}
              historyMenuOpen={state.historyMenuOpen}
              historyVersions={state.historyVersions}
              historyActiveVersionId={state.historyActiveVersionId}
              onOpenDebugRun={state.openDebugRun}
              onToggleHistory={state.toggleHistoryMenu}
              onSelectHistoryVersion={state.handleSelectHistoryVersion}
            />

            <PlannerDocumentPanel />
          </section>
        </div>
      </div>

      <PlannerPageDialogs />
    </>
  );
}
