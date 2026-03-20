'use client';

import { PlannerAgentDebugPageContent } from './planner-agent-debug-page-content';
import type { PlannerAgentDebugPageOptions } from '../lib/planner-agent-debug-page-types';
import { usePlannerAgentDebugPageState } from '../lib/use-planner-agent-debug-page-state';

export function PlannerAgentDebugPage({
  initialSubAgentSlug,
  mode = 'debug',
  initialReplayRunId,
  initialAutoRun = false,
  initialProjectId,
  initialEpisodeId,
  initialProjectTitle,
  initialEpisodeTitle,
  chrome = 'default',
}: PlannerAgentDebugPageOptions) {
  const pageState = usePlannerAgentDebugPageState({
    initialSubAgentSlug,
    mode,
    initialReplayRunId,
    initialAutoRun,
    initialProjectId,
    initialEpisodeId,
    initialProjectTitle,
    initialEpisodeTitle,
    chrome,
  });

  return <PlannerAgentDebugPageContent {...pageState} />;
}
