'use client';

import { cx } from '@aiv/ui';

import type { UsePlannerPageStateResult } from '../hooks/use-planner-page-state';
import { plannerModeLabel } from '../lib/planner-page-helpers';
import { PlannerDocumentPanel } from './planner-document-panel';
import { PlannerEpisodeRail } from './planner-episode-rail';
import { PlannerPageDialogs } from './planner-page-dialogs';
import { PlannerPageHeader } from './planner-page-header';
import { PlannerResultHeader } from './planner-result-header';
import { PlannerThreadPanel } from './planner-thread-panel';
import styles from './planner-page.module.css';

interface PlannerPageContentProps {
  shell: UsePlannerPageStateResult['shell'];
  thread: UsePlannerPageStateResult['thread'];
  document: UsePlannerPageStateResult['document'];
  dialogs: UsePlannerPageStateResult['dialogs'];
}

export function PlannerPageContent({ shell, thread, document, dialogs }: PlannerPageContentProps) {
  return (
    <>
      <div className={styles.page}>
        <PlannerPageHeader
          title={shell.displayTitle}
          brief={shell.brief}
          plannerModeLabel={plannerModeLabel(shell.plannerMode)}
          onOpenAgentDebug={shell.runtimeEnabled ? shell.openAgentDebug : undefined}
          onBackToExplore={shell.backToExplore}
        />

        <div className={styles.workspace}>
          <section className={styles.leftPanel}>
            <div className={cx(styles.leftPanelInner, shell.plannerMode === 'single' && styles.leftPanelSingle)}>
              {shell.plannerMode === 'series' ? (
                <PlannerEpisodeRail
                  episodes={shell.plannerEpisodes}
                  activeEpisodeId={shell.activeEpisodeId}
                  onSelectEpisode={shell.setActiveEpisodeId}
                />
              ) : null}

              <PlannerThreadPanel thread={thread} />
            </div>
          </section>

          <section className={styles.rightPanel}>
            <PlannerResultHeader
              activeEpisodeNumber={shell.activeEpisodeNumber}
              activeEpisodeTitle={shell.activeEpisodeTitle}
              fallbackEpisodeTitle={shell.fallbackEpisodeTitle}
              saveState={shell.saveState}
              latestExecutionMode={shell.latestExecutionMode}
              activeDebugApplySource={shell.activeDebugApplySource}
              historyMenuOpen={shell.historyMenuOpen}
              historyVersions={shell.historyVersions}
              historyActiveVersionId={shell.historyActiveVersionId}
              onOpenDebugRun={shell.openDebugRun}
              onToggleHistory={shell.toggleHistoryMenu}
              onSelectHistoryVersion={shell.handleSelectHistoryVersion}
            />

            <PlannerDocumentPanel document={document} />
          </section>
        </div>
      </div>

      <PlannerPageDialogs dialogs={dialogs} />
    </>
  );
}
