import type { Asset } from '@prisma/client';

import type { PlannerWorkspaceSource } from './workspace-query.js';
import {
  buildPlannerAssetMap,
  collectPlannerAssetIds,
  mapPlannerLatestRun,
  readPlannerDebugApplySource,
  resolvePlannerStage,
  resolvePlannerWorkspaceAssets,
} from './workspace-presenters.js';

export async function assemblePlannerWorkspace(source: PlannerWorkspaceSource, deps: {
  loadAssets: (assetIds: string[]) => Promise<Asset[]>;
}) {
  const plannerStage = resolvePlannerStage(source.plannerSession, source.activeOutline);
  const refinementSubjects = source.activeRefinement?.subjects ?? [];
  const refinementScenes = source.activeRefinement?.scenes ?? [];
  const refinementShotScripts = source.activeRefinement?.shotScripts ?? [];
  const plannerAssetIds = collectPlannerAssetIds(refinementSubjects, refinementScenes, refinementShotScripts);
  const plannerAssets = plannerAssetIds.length ? await deps.loadAssets(plannerAssetIds) : [];
  const plannerAssetMap = buildPlannerAssetMap(plannerAssets);

  function resolveAssets(ids: unknown[]) {
    return resolvePlannerWorkspaceAssets(plannerAssetMap, ids);
  }

  return {
    project: {
      id: source.episode.project.id,
      title: source.episode.project.title,
      status: source.episode.project.status.toLowerCase(),
      contentMode: source.episode.project.contentMode.toLowerCase(),
      currentEpisodeId: source.episode.project.currentEpisodeId,
      creationConfig: source.episode.project.creationConfig
        ? {
            selectedTab: source.episode.project.creationConfig.selectedTab,
            selectedSubtype: source.episode.project.creationConfig.selectedSubtype,
          }
        : null,
    },
    episode: {
      id: source.episode.id,
      episodeNo: source.episode.episodeNo,
      title: source.episode.title,
      summary: source.episode.summary,
      status: source.episode.status.toLowerCase(),
    },
    plannerSession: source.plannerSession
      ? {
          id: source.plannerSession.id,
          status: source.plannerSession.status.toLowerCase(),
          stage: plannerStage,
          outlineConfirmedAt: source.plannerSession.outlineConfirmedAt?.toISOString() ?? null,
          createdAt: source.plannerSession.createdAt.toISOString(),
          updatedAt: source.plannerSession.updatedAt.toISOString(),
        }
      : null,
    latestPlannerRun: mapPlannerLatestRun(source.latestPlannerRun),
    messages: source.messages.map((message) => ({
      id: message.id,
      role: message.role.toLowerCase(),
      messageType: message.messageType.toLowerCase(),
      content: message.contentJson,
      outlineVersionId: message.outlineVersionId,
      refinementVersionId: message.refinementVersionId,
      createdAt: message.createdAt.toISOString(),
    })),
    activeOutline: source.activeOutline
      ? {
          id: source.activeOutline.id,
          versionNumber: source.activeOutline.versionNumber,
          triggerType: source.activeOutline.triggerType,
          status: source.activeOutline.status.toLowerCase(),
          documentTitle: source.activeOutline.documentTitle,
          assistantMessage: source.activeOutline.assistantMessage,
          generatedText: source.activeOutline.generatedText,
          outlineDoc: source.activeOutline.outlineDocJson,
          isConfirmed: source.activeOutline.isConfirmed,
          confirmedAt: source.activeOutline.confirmedAt?.toISOString() ?? null,
          isActive: source.activeOutline.isActive,
          createdAt: source.activeOutline.createdAt.toISOString(),
        }
      : null,
    outlineVersions: source.outlineVersions.map((version) => ({
      id: version.id,
      versionNumber: version.versionNumber,
      triggerType: version.triggerType,
      status: version.status.toLowerCase(),
      documentTitle: version.documentTitle,
      isConfirmed: version.isConfirmed,
      isActive: version.isActive,
      createdAt: version.createdAt.toISOString(),
    })),
    activeRefinement: source.activeRefinement
      ? {
          debugApplySource: readPlannerDebugApplySource(source.activeRefinement.triggerType, source.activeRefinement.inputSnapshotJson),
          id: source.activeRefinement.id,
          versionNumber: source.activeRefinement.versionNumber,
          triggerType: source.activeRefinement.triggerType,
          sourceOutlineVersionId: source.activeRefinement.sourceOutlineVersionId,
          sourceRefinementVersionId: source.activeRefinement.sourceRefinementVersionId,
          status: source.activeRefinement.status.toLowerCase(),
          documentTitle: source.activeRefinement.documentTitle,
          assistantMessage: source.activeRefinement.assistantMessage,
          generatedText: source.activeRefinement.generatedText,
          structuredDoc: source.activeRefinement.structuredDocJson,
          isConfirmed: source.activeRefinement.isConfirmed,
          confirmedAt: source.activeRefinement.confirmedAt?.toISOString() ?? null,
          subAgentProfile: source.activeRefinement.subAgentProfile
            ? {
                id: source.activeRefinement.subAgentProfile.id,
                slug: source.activeRefinement.subAgentProfile.slug,
                subtype: source.activeRefinement.subAgentProfile.subtype,
                displayName: source.activeRefinement.subAgentProfile.displayName,
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
          stepAnalysis: source.activeRefinement.stepAnalysis.map((step) => ({
            id: step.id,
            stepKey: step.stepKey,
            title: step.title,
            status: step.status.toLowerCase(),
            detail: step.detailJson,
            sortOrder: step.sortOrder,
          })),
          createdAt: source.activeRefinement.createdAt.toISOString(),
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
    refinementVersions: source.refinementVersions.map((version) => ({
      debugApplySource: readPlannerDebugApplySource(version.triggerType, version.inputSnapshotJson),
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
