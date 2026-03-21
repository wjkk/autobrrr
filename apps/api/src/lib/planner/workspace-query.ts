import { prisma } from '../prisma.js';
import { requireOwnedEpisode } from '../workspace-shared.js';

export async function loadPlannerWorkspaceSource(args: {
  projectId: string;
  episodeId: string;
  userId: string;
}) {
  const episode = await requireOwnedEpisode(args.projectId, args.episodeId, args.userId);
  if (!episode) {
    return null;
  }

  const plannerSession = await prisma.plannerSession.findFirst({
    where: {
      episodeId: episode.id,
      isActive: true,
    },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      status: true,
      outlineConfirmedAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  const latestPlannerRun = plannerSession
    ? await prisma.run.findFirst({
        where: {
          episodeId: episode.id,
          resourceType: 'planner_session',
          resourceId: plannerSession.id,
          runType: 'PLANNER_DOC_UPDATE',
        },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          status: true,
          providerStatus: true,
          outputJson: true,
          errorCode: true,
          errorMessage: true,
          createdAt: true,
          finishedAt: true,
        },
      })
    : null;

  const [messages, activeOutline, outlineVersions, activeRefinement, refinementVersions] = plannerSession
    ? await Promise.all([
        prisma.plannerMessage.findMany({
          where: {
            plannerSessionId: plannerSession.id,
          },
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            role: true,
            messageType: true,
            contentJson: true,
            createdAt: true,
            outlineVersionId: true,
            refinementVersionId: true,
          },
        }),
        prisma.plannerOutlineVersion.findFirst({
          where: {
            plannerSessionId: plannerSession.id,
            isActive: true,
          },
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            versionNumber: true,
            triggerType: true,
            status: true,
            documentTitle: true,
            assistantMessage: true,
            generatedText: true,
            outlineDocJson: true,
            isConfirmed: true,
            confirmedAt: true,
            isActive: true,
            createdAt: true,
          },
        }),
        prisma.plannerOutlineVersion.findMany({
          where: {
            plannerSessionId: plannerSession.id,
          },
          orderBy: { versionNumber: 'desc' },
          take: 10,
          select: {
            id: true,
            versionNumber: true,
            triggerType: true,
            status: true,
            documentTitle: true,
            isConfirmed: true,
            isActive: true,
            createdAt: true,
          },
        }),
        prisma.plannerRefinementVersion.findFirst({
          where: {
            plannerSessionId: plannerSession.id,
            isActive: true,
          },
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            versionNumber: true,
            triggerType: true,
            sourceOutlineVersionId: true,
            sourceRefinementVersionId: true,
            status: true,
            documentTitle: true,
            assistantMessage: true,
            generatedText: true,
            structuredDocJson: true,
            inputSnapshotJson: true,
            isConfirmed: true,
            confirmedAt: true,
            createdAt: true,
            stepAnalysis: {
              orderBy: { sortOrder: 'asc' },
            },
            subjects: {
              orderBy: { sortOrder: 'asc' },
            },
            scenes: {
              orderBy: { sortOrder: 'asc' },
            },
            shotScripts: {
              orderBy: { sortOrder: 'asc' },
            },
            subAgentProfile: {
              select: {
                id: true,
                slug: true,
                subtype: true,
                displayName: true,
              },
            },
          },
        }),
        prisma.plannerRefinementVersion.findMany({
          where: {
            plannerSessionId: plannerSession.id,
          },
          orderBy: { versionNumber: 'desc' },
          take: 10,
          select: {
            id: true,
            versionNumber: true,
            triggerType: true,
            sourceOutlineVersionId: true,
            sourceRefinementVersionId: true,
            status: true,
            documentTitle: true,
            isActive: true,
            isConfirmed: true,
            confirmedAt: true,
            createdAt: true,
            inputSnapshotJson: true,
          },
        }),
      ])
    : [[], null, [], null, []] as const;

  return {
    episode,
    plannerSession,
    latestPlannerRun,
    messages,
    activeOutline,
    outlineVersions,
    activeRefinement,
    refinementVersions,
  };
}

export type PlannerWorkspaceSource = NonNullable<Awaited<ReturnType<typeof loadPlannerWorkspaceSource>>>;
