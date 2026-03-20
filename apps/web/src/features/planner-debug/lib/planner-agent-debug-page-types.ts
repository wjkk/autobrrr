export interface PlannerAgentDebugPageOptions {
  initialSubAgentSlug?: string;
  mode?: 'debug' | 'manage';
  initialReplayRunId?: string;
  initialAutoRun?: boolean;
  initialProjectId?: string | null;
  initialEpisodeId?: string | null;
  initialProjectTitle?: string | null;
  initialEpisodeTitle?: string | null;
  chrome?: 'default' | 'admin';
}
