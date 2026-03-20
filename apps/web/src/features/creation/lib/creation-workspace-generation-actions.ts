import type { CreationWorkspace, Shot } from '@aiv/domain';
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';

import { creationCopy } from '@/lib/copy';

import { mergeCreationWorkspaceFromApi, type ApiCreationWorkspace, type ApiRun, type CreationRuntimeApiContext } from './creation-api';
import {
  buildVideoRunPayload,
  requestCreationApi,
  type ApiModelEndpoint,
  type VideoFrameOptions,
} from './creation-runtime-api';
import {
  cancelShotGenerationState,
  finishBatchGenerationState,
  finishShotGenerationState,
  selectShotState,
  setInlineShotFieldState,
  startBatchGenerationState,
  startShotGenerationState,
  toggleInlineCropState,
} from './creation-state';
import { makeGenerationDraft } from './ui-state';
import type { CreationDialogState, GenerationDraft } from './ui-state';

interface RuntimeModelCatalogState {
  image: ApiModelEndpoint[];
  video: ApiModelEndpoint[];
}

interface CreateCreationWorkspaceGenerationActionsArgs {
  creation: CreationWorkspace;
  activeShot: Shot | null;
  generateDraft: GenerationDraft;
  runtimeApi?: CreationRuntimeApiContext;
  runtimeModelCatalog: RuntimeModelCatalogState;
  timersRef: MutableRefObject<Array<ReturnType<typeof setTimeout>>>;
  generationTimersRef: MutableRefObject<Map<string, ReturnType<typeof setTimeout>>>;
  setCreation: Dispatch<SetStateAction<CreationWorkspace>>;
  setDialog: Dispatch<SetStateAction<CreationDialogState>>;
  setNotice: Dispatch<SetStateAction<string | null>>;
  setGenerateDraft: Dispatch<SetStateAction<GenerationDraft>>;
}

export function createCreationWorkspaceGenerationActions(args: CreateCreationWorkspaceGenerationActionsArgs) {
  const {
    creation,
    activeShot,
    generateDraft,
    runtimeApi,
    runtimeModelCatalog,
    timersRef,
    generationTimersRef,
    setCreation,
    setDialog,
    setNotice,
    setGenerateDraft,
  } = args;

  const refreshCreationWorkspaceFromApi = async () => {
    if (!runtimeApi) {
      return false;
    }

    const workspace = await requestCreationApi<ApiCreationWorkspace>(
      `/api/creation/projects/${encodeURIComponent(runtimeApi.projectId)}/workspace?episodeId=${encodeURIComponent(runtimeApi.episodeId)}`,
    );
    setCreation((current) => mergeCreationWorkspaceFromApi(current, workspace));
    return true;
  };

  const pollRunUntilTerminal = async (runId: string, targetShotId: string, successMessage: string) => {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const run = await requestCreationApi<ApiRun>(`/api/creation/runs/${encodeURIComponent(runId)}`);

      if (run.status === 'completed') {
        await refreshCreationWorkspaceFromApi();
        setNotice(successMessage);
        generationTimersRef.current.delete(targetShotId);
        return;
      }

      if (run.status === 'failed' || run.status === 'canceled' || run.status === 'timed_out') {
        await refreshCreationWorkspaceFromApi().catch(() => {
          setCreation((current) => cancelShotGenerationState(current, targetShotId));
        });
        setNotice(run.errorMessage ?? '生成失败，请稍后重试。');
        generationTimersRef.current.delete(targetShotId);
        return;
      }
    }

    setNotice('任务已提交，正在后台处理中。');
    generationTimersRef.current.delete(targetShotId);
  };

  const submitRunViaApi = async (targetShotId: string, mediaKind: 'image' | 'video', frameOptions?: VideoFrameOptions) => {
    if (!runtimeApi) {
      return false;
    }

    const path = mediaKind === 'image'
      ? `/api/creation/projects/${encodeURIComponent(runtimeApi.projectId)}/shots/${encodeURIComponent(targetShotId)}/generate-image`
      : `/api/creation/projects/${encodeURIComponent(runtimeApi.projectId)}/shots/${encodeURIComponent(targetShotId)}/generate-video`;

    const payload = mediaKind === 'image'
      ? {
          ...(runtimeModelCatalog.image.some((item) => item.slug === generateDraft.model) ? { modelEndpoint: generateDraft.model } : {}),
          options: { aspectRatio: activeShot?.canvasTransform.ratio ?? '9:16' },
        }
      : buildVideoRunPayload({
          draft: generateDraft,
          shot: activeShot,
          runtimeModelCatalog,
          frameOptions,
        });

    const result = await requestCreationApi<{ run: { id: string } }>(path, {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    await pollRunUntilTerminal(result.run.id, targetShotId, mediaKind === 'image' ? '图片生成已完成。' : '已提交当前分镜生成任务。');
    return true;
  };

  const setViewShotField = <T extends 'resolution' | 'durationMode'>(field: T, value: Shot[T]) => {
    if (!activeShot) {
      return;
    }
    setCreation((current) => setInlineShotFieldState(current, activeShot.id, field, value));
    setGenerateDraft((current) => ({ ...current, [field]: value }));
  };

  const toggleInlineCrop = () => {
    if (!activeShot) {
      return;
    }
    setCreation((current) => toggleInlineCropState(current, activeShot.id));
    setGenerateDraft((current) => ({ ...current, cropToVoice: !current.cropToVoice }));
  };

  const openGenerateDialog = () => {
    if (!activeShot) {
      return;
    }
    setGenerateDraft(makeGenerationDraft(activeShot));
    setDialog({ type: 'generate' });
  };

  const finishLocalGeneration = (targetShotId: string, mediaKind: 'image' | 'video', successMessage: string | null, modelId = generateDraft.model, delayMs = 960) => {
    const timer = setTimeout(() => {
      setCreation((current) => finishShotGenerationState(current, targetShotId, modelId, mediaKind));
      setNotice(successMessage);
      generationTimersRef.current.delete(targetShotId);
    }, delayMs);

    timersRef.current.push(timer);
    generationTimersRef.current.set(targetShotId, timer);
  };

  const submitGeneration = () => {
    if (!activeShot) {
      return;
    }
    const targetShotId = activeShot.id;
    const wasFailed = activeShot.status === 'failed';
    setDialog({ type: 'none' });
    setNotice(creationCopy.bootCopy);
    setCreation((current) => startShotGenerationState(current, targetShotId, generateDraft));

    if (runtimeApi) {
      submitRunViaApi(targetShotId, 'video').catch(() => {
        finishLocalGeneration(targetShotId, 'video', wasFailed ? creationCopy.retrySubmitted : '已提交当前分镜生成任务。');
      });
      return;
    }

    finishLocalGeneration(targetShotId, 'video', wasFailed ? creationCopy.retrySubmitted : '已提交当前分镜生成任务。');
  };

  const submitInlineGeneration = (mediaKind: 'image' | 'video' = 'video', frameOptions?: VideoFrameOptions) => {
    if (!activeShot) {
      return;
    }
    const targetShotId = activeShot.id;
    setDialog({ type: 'none' });
    setNotice(null);
    setCreation((current) => startShotGenerationState(current, targetShotId, generateDraft));

    if (runtimeApi) {
      submitRunViaApi(targetShotId, mediaKind, frameOptions).catch(() => {
        finishLocalGeneration(targetShotId, mediaKind, null, generateDraft.model, 4800);
      });
      return;
    }

    finishLocalGeneration(targetShotId, mediaKind, null, generateDraft.model, 4800);
  };

  const cancelGeneration = (shotId?: string) => {
    const targetShot = creation.shots.find((shot) => shot.id === (shotId ?? activeShot?.id));
    if (!targetShot || targetShot.status !== 'generating') {
      return;
    }

    const timer = generationTimersRef.current.get(targetShot.id);
    if (timer) {
      clearTimeout(timer);
      generationTimersRef.current.delete(targetShot.id);
    }

    setCreation((current) => cancelShotGenerationState(current, targetShot.id));
    setNotice('已取消生成');
  };

  const openBatchDialog = (target: 'all' | 'missing') => {
    setDialog({ type: 'batch', target });
  };

  const submitBatch = (target: 'all' | 'missing') => {
    setDialog({ type: 'none' });
    setNotice(`${creationCopy.batchSubmitted} 目标：${target === 'all' ? '全部分镜' : '仅缺失分镜'}`);
    setCreation((current) => startBatchGenerationState(current, target));

    const timer = setTimeout(() => {
      setCreation((current) => finishBatchGenerationState(current, target));
      setNotice(target === 'all' ? '批量任务已结束，存在 1 条失败分镜。' : '缺失分镜已补齐，但失败分镜仍需单独重试。');
    }, 1180);

    timersRef.current.push(timer);
  };

  const retryShot = (shotId?: string) => {
    const targetShot = creation.shots.find((shot) => shot.id === (shotId ?? activeShot?.id));
    if (!targetShot) {
      return;
    }

    const retryDraft = makeGenerationDraft(targetShot);
    setDialog({ type: 'none' });
    setNotice(creationCopy.bootCopy);
    setCreation((current) => {
      const started = startShotGenerationState(current, targetShot.id, retryDraft);
      return selectShotState(started, targetShot.id, false);
    });

    if (runtimeApi) {
      submitRunViaApi(targetShot.id, 'video').catch(() => {
        const timer = setTimeout(() => {
          setCreation((current) => finishShotGenerationState(current, targetShot.id, retryDraft.model));
          setNotice(`${targetShot.title} 已提交重试，新的候选版本已追加。`);
        }, 960);

        timersRef.current.push(timer);
      });
      return;
    }

    const timer = setTimeout(() => {
      setCreation((current) => finishShotGenerationState(current, targetShot.id, retryDraft.model));
      setNotice(`${targetShot.title} 已提交重试，新的候选版本已追加。`);
    }, 960);

    timersRef.current.push(timer);
  };

  return {
    setInlineShotField: setViewShotField,
    toggleInlineCrop,
    openGenerateDialog,
    submitGeneration,
    submitInlineGeneration,
    cancelGeneration,
    openBatchDialog,
    submitBatch,
    retryShot,
  };
}
