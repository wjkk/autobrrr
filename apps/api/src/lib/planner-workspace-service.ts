import { mapAsset } from './api-mappers.js';
import { prisma } from './prisma.js';
import { requireOwnedEpisode } from './workspace-shared.js';

export async function getPlannerWorkspace(args: {
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
          },
        }),
      ])
    : [[], null, [], null, []];

  const plannerStage = plannerSession?.outlineConfirmedAt ? 'refinement' : activeOutline ? 'outline' : 'idle';
  const refinementSubjects = activeRefinement?.subjects ?? [];
  const refinementScenes = activeRefinement?.scenes ?? [];
  const refinementShotScripts = activeRefinement?.shotScripts ?? [];
  const plannerAssetIds = new Set<string>();

  for (const subject of refinementSubjects) {
    for (const assetId of Array.isArray(subject.referenceAssetIdsJson) ? subject.referenceAssetIdsJson : []) {
      if (typeof assetId === 'string' && assetId) {
        plannerAssetIds.add(assetId);
      }
    }
    for (const assetId of Array.isArray(subject.generatedAssetIdsJson) ? subject.generatedAssetIdsJson : []) {
      if (typeof assetId === 'string' && assetId) {
        plannerAssetIds.add(assetId);
      }
    }
  }

  for (const scene of refinementScenes) {
    for (const assetId of Array.isArray(scene.referenceAssetIdsJson) ? scene.referenceAssetIdsJson : []) {
      if (typeof assetId === 'string' && assetId) {
        plannerAssetIds.add(assetId);
      }
    }
    for (const assetId of Array.isArray(scene.generatedAssetIdsJson) ? scene.generatedAssetIdsJson : []) {
      if (typeof assetId === 'string' && assetId) {
        plannerAssetIds.add(assetId);
      }
    }
  }

  for (const shot of refinementShotScripts) {
    for (const assetId of Array.isArray(shot.referenceAssetIdsJson) ? shot.referenceAssetIdsJson : []) {
      if (typeof assetId === 'string' && assetId) {
        plannerAssetIds.add(assetId);
      }
    }
    for (const assetId of Array.isArray(shot.generatedAssetIdsJson) ? shot.generatedAssetIdsJson : []) {
      if (typeof assetId === 'string' && assetId) {
        plannerAssetIds.add(assetId);
      }
    }
  }

  const plannerAssets = plannerAssetIds.size
    ? await prisma.asset.findMany({
        where: {
          id: { in: Array.from(plannerAssetIds) },
        },
        orderBy: { createdAt: 'desc' },
      })
    : [];
  const plannerAssetMap = new Map(plannerAssets.map((asset) => [asset.id, mapAsset(asset)]));

  function resolveAssets(ids: unknown[]) {
    return ids
      .filter((id): id is string => typeof id === 'string' && id.length > 0)
      .map((id) => plannerAssetMap.get(id))
      .filter((asset): asset is NonNullable<ReturnType<typeof mapAsset>> => Boolean(asset));
  }

  return {
    project: {
      id: episode.project.id,
      title: episode.project.title,
      status: episode.project.status.toLowerCase(),
      contentMode: episode.project.contentMode.toLowerCase(),
      currentEpisodeId: episode.project.currentEpisodeId,
      creationConfig: episode.project.creationConfig
        ? {
            selectedTab: episode.project.creationConfig.selectedTab,
            selectedSubtype: episode.project.creationConfig.selectedSubtype,
          }
        : null,
    },
    episode: {
      id: episode.id,
      episodeNo: episode.episodeNo,
      title: episode.title,
      summary: episode.summary,
      status: episode.status.toLowerCase(),
    },
    plannerSession: plannerSession
      ? {
          id: plannerSession.id,
          status: plannerSession.status.toLowerCase(),
          stage: plannerStage,
          outlineConfirmedAt: plannerSession.outlineConfirmedAt?.toISOString() ?? null,
          createdAt: plannerSession.createdAt.toISOString(),
          updatedAt: plannerSession.updatedAt.toISOString(),
        }
      : null,
    latestPlannerRun: latestPlannerRun
      ? {
          id: latestPlannerRun.id,
          status: latestPlannerRun.status.toLowerCase(),
          providerStatus: latestPlannerRun.providerStatus,
          generatedText:
            latestPlannerRun.outputJson && typeof latestPlannerRun.outputJson === 'object' && !Array.isArray(latestPlannerRun.outputJson)
              ? (((latestPlannerRun.outputJson as Record<string, unknown>).generatedText as string | undefined) ?? null)
              : null,
          structuredDoc:
            latestPlannerRun.outputJson && typeof latestPlannerRun.outputJson === 'object' && !Array.isArray(latestPlannerRun.outputJson)
              ? (((latestPlannerRun.outputJson as Record<string, unknown>).structuredDoc as Record<string, unknown> | undefined) ?? null)
              : null,
          errorCode: latestPlannerRun.errorCode,
          errorMessage: latestPlannerRun.errorMessage,
          createdAt: latestPlannerRun.createdAt.toISOString(),
          finishedAt: latestPlannerRun.finishedAt?.toISOString() ?? null,
        }
      : null,
    messages: messages.map((message) => ({
      id: message.id,
      role: message.role.toLowerCase(),
      messageType: message.messageType.toLowerCase(),
      content: message.contentJson,
      outlineVersionId: message.outlineVersionId,
      refinementVersionId: message.refinementVersionId,
      createdAt: message.createdAt.toISOString(),
    })),
    activeOutline: activeOutline
      ? {
          id: activeOutline.id,
          versionNumber: activeOutline.versionNumber,
          triggerType: activeOutline.triggerType,
          status: activeOutline.status.toLowerCase(),
          documentTitle: activeOutline.documentTitle,
          assistantMessage: activeOutline.assistantMessage,
          generatedText: activeOutline.generatedText,
          outlineDoc: activeOutline.outlineDocJson,
          isConfirmed: activeOutline.isConfirmed,
          confirmedAt: activeOutline.confirmedAt?.toISOString() ?? null,
          isActive: activeOutline.isActive,
          createdAt: activeOutline.createdAt.toISOString(),
        }
      : null,
    outlineVersions: outlineVersions.map((version) => ({
      id: version.id,
      versionNumber: version.versionNumber,
      triggerType: version.triggerType,
      status: version.status.toLowerCase(),
      documentTitle: version.documentTitle,
      isConfirmed: version.isConfirmed,
      isActive: version.isActive,
      createdAt: version.createdAt.toISOString(),
    })),
    activeRefinement: activeRefinement
      ? {
          id: activeRefinement.id,
          versionNumber: activeRefinement.versionNumber,
          triggerType: activeRefinement.triggerType,
          sourceOutlineVersionId: activeRefinement.sourceOutlineVersionId,
          sourceRefinementVersionId: activeRefinement.sourceRefinementVersionId,
          status: activeRefinement.status.toLowerCase(),
          documentTitle: activeRefinement.documentTitle,
          assistantMessage: activeRefinement.assistantMessage,
          generatedText: activeRefinement.generatedText,
          structuredDoc: activeRefinement.structuredDocJson,
          isConfirmed: activeRefinement.isConfirmed,
          confirmedAt: activeRefinement.confirmedAt?.toISOString() ?? null,
          subAgentProfile: activeRefinement.subAgentProfile
            ? {
                id: activeRefinement.subAgentProfile.id,
                slug: activeRefinement.subAgentProfile.slug,
                subtype: activeRefinement.subAgentProfile.subtype,
                displayName: activeRefinement.subAgentProfile.displayName,
              }
            : null,
          subjects: refinementSubjects.map((subject) => ({
            id: subject.id,
            name: subject.name,
            role: subject.role,
            appearance: subject.appearance,
            personality: subject.personality,
            prompt: subject.prompt,
            negativePrompt: subject.negativePrompt,
            referenceAssetIds: Array.isArray(subject.referenceAssetIdsJson) ? subject.referenceAssetIdsJson : [],
            generatedAssetIds: Array.isArray(subject.generatedAssetIdsJson) ? subject.generatedAssetIdsJson : [],
            referenceAssets: resolveAssets(Array.isArray(subject.referenceAssetIdsJson) ? subject.referenceAssetIdsJson : []),
            generatedAssets: resolveAssets(Array.isArray(subject.generatedAssetIdsJson) ? subject.generatedAssetIdsJson : []),
            sortOrder: subject.sortOrder,
            editable: subject.editable,
          })),
          scenes: refinementScenes.map((scene) => ({
            id: scene.id,
            name: scene.name,
            time: scene.time,
            locationType: scene.locationType,
            description: scene.description,
            prompt: scene.prompt,
            negativePrompt: scene.negativePrompt,
            referenceAssetIds: Array.isArray(scene.referenceAssetIdsJson) ? scene.referenceAssetIdsJson : [],
            generatedAssetIds: Array.isArray(scene.generatedAssetIdsJson) ? scene.generatedAssetIdsJson : [],
            referenceAssets: resolveAssets(Array.isArray(scene.referenceAssetIdsJson) ? scene.referenceAssetIdsJson : []),
            generatedAssets: resolveAssets(Array.isArray(scene.generatedAssetIdsJson) ? scene.generatedAssetIdsJson : []),
            sortOrder: scene.sortOrder,
            editable: scene.editable,
          })),
          shotScripts: refinementShotScripts.map((shot) => ({
            id: shot.id,
            sceneId: shot.sceneId,
            actKey: shot.actKey,
            actTitle: shot.actTitle,
            shotNo: shot.shotNo,
            title: shot.title,
            durationSeconds: shot.durationSeconds,
            targetModelFamilySlug: shot.targetModelFamilySlug,
            visualDescription: shot.visualDescription,
            composition: shot.composition,
            cameraMotion: shot.cameraMotion,
            voiceRole: shot.voiceRole,
            dialogue: shot.dialogue,
            subjectBindings: Array.isArray(shot.subjectBindingsJson) ? shot.subjectBindingsJson : [],
            referenceAssetIds: Array.isArray(shot.referenceAssetIdsJson) ? shot.referenceAssetIdsJson : [],
            generatedAssetIds: Array.isArray(shot.generatedAssetIdsJson) ? shot.generatedAssetIdsJson : [],
            referenceAssets: resolveAssets(Array.isArray(shot.referenceAssetIdsJson) ? shot.referenceAssetIdsJson : []),
            generatedAssets: resolveAssets(Array.isArray(shot.generatedAssetIdsJson) ? shot.generatedAssetIdsJson : []),
            sortOrder: shot.sortOrder,
          })),
          stepAnalysis: activeRefinement.stepAnalysis.map((step) => ({
            id: step.id,
            stepKey: step.stepKey,
            title: step.title,
            status: step.status.toLowerCase(),
            detail: step.detailJson,
            sortOrder: step.sortOrder,
          })),
          createdAt: activeRefinement.createdAt.toISOString(),
        }
      : null,
    subjects: refinementSubjects.map((subject) => ({
      id: subject.id,
      name: subject.name,
      role: subject.role,
      appearance: subject.appearance,
      personality: subject.personality,
      prompt: subject.prompt,
      negativePrompt: subject.negativePrompt,
      referenceAssetIds: Array.isArray(subject.referenceAssetIdsJson) ? subject.referenceAssetIdsJson : [],
      generatedAssetIds: Array.isArray(subject.generatedAssetIdsJson) ? subject.generatedAssetIdsJson : [],
      referenceAssets: resolveAssets(Array.isArray(subject.referenceAssetIdsJson) ? subject.referenceAssetIdsJson : []),
      generatedAssets: resolveAssets(Array.isArray(subject.generatedAssetIdsJson) ? subject.generatedAssetIdsJson : []),
      sortOrder: subject.sortOrder,
      editable: subject.editable,
    })),
    scenes: refinementScenes.map((scene) => ({
      id: scene.id,
      name: scene.name,
      time: scene.time,
      locationType: scene.locationType,
      description: scene.description,
      prompt: scene.prompt,
      negativePrompt: scene.negativePrompt,
      referenceAssetIds: Array.isArray(scene.referenceAssetIdsJson) ? scene.referenceAssetIdsJson : [],
      generatedAssetIds: Array.isArray(scene.generatedAssetIdsJson) ? scene.generatedAssetIdsJson : [],
      referenceAssets: resolveAssets(Array.isArray(scene.referenceAssetIdsJson) ? scene.referenceAssetIdsJson : []),
      generatedAssets: resolveAssets(Array.isArray(scene.generatedAssetIdsJson) ? scene.generatedAssetIdsJson : []),
      sortOrder: scene.sortOrder,
      editable: scene.editable,
    })),
    shotScripts: refinementShotScripts.map((shot) => ({
      id: shot.id,
      sceneId: shot.sceneId,
      actKey: shot.actKey,
      actTitle: shot.actTitle,
      shotNo: shot.shotNo,
      title: shot.title,
      durationSeconds: shot.durationSeconds,
      targetModelFamilySlug: shot.targetModelFamilySlug,
      visualDescription: shot.visualDescription,
      composition: shot.composition,
      cameraMotion: shot.cameraMotion,
      voiceRole: shot.voiceRole,
      dialogue: shot.dialogue,
      subjectBindings: Array.isArray(shot.subjectBindingsJson) ? shot.subjectBindingsJson : [],
      referenceAssetIds: Array.isArray(shot.referenceAssetIdsJson) ? shot.referenceAssetIdsJson : [],
      generatedAssetIds: Array.isArray(shot.generatedAssetIdsJson) ? shot.generatedAssetIdsJson : [],
      referenceAssets: resolveAssets(Array.isArray(shot.referenceAssetIdsJson) ? shot.referenceAssetIdsJson : []),
      generatedAssets: resolveAssets(Array.isArray(shot.generatedAssetIdsJson) ? shot.generatedAssetIdsJson : []),
      sortOrder: shot.sortOrder,
    })),
    refinementVersions: refinementVersions.map((version) => ({
      id: version.id,
      versionNumber: version.versionNumber,
      triggerType: version.triggerType,
      sourceOutlineVersionId: version.sourceOutlineVersionId,
      sourceRefinementVersionId: version.sourceRefinementVersionId,
      status: version.status.toLowerCase(),
      documentTitle: version.documentTitle,
      isActive: version.isActive,
      isConfirmed: version.isConfirmed,
      confirmedAt: version.confirmedAt?.toISOString() ?? null,
      createdAt: version.createdAt.toISOString(),
    })),
  };
}
