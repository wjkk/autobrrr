import type { ProjectStatus } from '@aiv/domain';

export type ProjectStage = 'planner' | 'creation' | 'publish';

export function resolveProjectStage(status: ProjectStatus): ProjectStage {
  if (status === 'published') {
    return 'publish';
  }

  if (status === 'creating' || status === 'export_ready' || status === 'exported') {
    return 'creation';
  }

  return 'planner';
}
