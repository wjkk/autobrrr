import { prisma } from '../prisma.js';
import { assemblePlannerWorkspace } from './workspace-assembler.js';
import { loadPlannerWorkspaceSource } from './workspace-query.js';
import {
  collectPlannerAssetIds,
  mapPlannerLatestRun,
  readPlannerDebugApplySource,
  readStringIds,
  resolvePlannerStage,
} from './workspace-presenters.js';

export {
  collectPlannerAssetIds,
  mapPlannerLatestRun,
  readPlannerDebugApplySource,
  readStringIds,
  resolvePlannerStage,
};

export async function getPlannerWorkspace(args: {
  projectId: string;
  episodeId: string;
  userId: string;
}) {
  const source = await loadPlannerWorkspaceSource(args);
  if (!source) {
    return null;
  }

  return assemblePlannerWorkspace(source, {
    loadAssets: async (assetIds) => prisma.asset.findMany({
      where: {
        id: { in: assetIds },
      },
      orderBy: { createdAt: 'desc' },
    }),
  });
}

export const __testables = {
  readStringIds,
  resolvePlannerStage,
  collectPlannerAssetIds,
  mapPlannerLatestRun,
  readPlannerDebugApplySource,
};
