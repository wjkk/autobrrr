export type ProjectContentMode = 'single' | 'series';
export type ExecutionMode = 'auto' | 'review_required';
export type ProjectStatus =
  | 'draft'
  | 'planning'
  | 'ready_for_storyboard'
  | 'creating'
  | 'export_ready'
  | 'exported'
  | 'published'
  | 'failed'
  | 'archived';
export type PlannerStatus = 'idle' | 'updating' | 'ready';
export type PlannerStepStatus = 'waiting' | 'running' | 'done';
export type ShotStatus = 'pending' | 'queued' | 'generating' | 'success' | 'failed';
export type ShotVersionStatus = 'pending_apply' | 'active' | 'archived';
export type CreationViewMode = 'storyboard' | 'default' | 'lipsync';
export type CreationTrack = 'visual' | 'voice' | 'music';
