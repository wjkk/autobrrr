'use client';

import type { CreationTrack, CreationViewMode, StudioFixture } from '@aiv/domain';
import { useEffect, useMemo, useRef, useState } from 'react';

import { creationCopy } from '@/lib/copy';

import { mergeCreationWorkspaceFromApi, type ApiCreationWorkspace, type ApiRun, type CreationRuntimeApiContext } from './creation-api';

import {
  addLipsyncDialogueState,
  advancePlaybackState,
  applyCanvasDraftState,
  applyCropStoryboardState,
  applySelectedVersionState,
  attachMaterialState,
  cloneCreationFixture,
  cancelShotGenerationState,
  confirmModelChangeState,
  deriveStoryboardFromFramesState,
  finishBatchGenerationState,
  finishShotGenerationState,
  removeLipsyncDialogueState,
  removeMaterialState,
  resetShotState,
  seekPlaybackState,
  selectShotState,
  selectVersionState,
  setActiveMaterialState,
  setCreationTrack,
  setCreationViewMode,
  setInlineShotFieldState,
  setLipsyncFieldState,
  setMusicFieldState,
  setVoiceFieldState,
  startBatchGenerationState,
  startShotGenerationState,
  toggleInlineCropState,
  togglePlaybackState,
  toggleSubtitleState,
  updateLipsyncDialogueState,
} from './creation-state';
import { formatClock, formatShotDuration, shotAccent, statusLabel } from './creation-utils';
import type { CanvasDraft, CreationDialogState, GenerationDraft, MaterialTab, ModelPickerDraft, StoryToolDraft, StoryToolMode } from './ui-state';
import { makeCanvasDraft, makeGenerationDraft, makeModelPickerDraft, makeStoryToolDraft } from './ui-state';

interface ApiEnvelopeSuccess<T> {
  ok: true;
  data: T;
}

interface ApiEnvelopeFailure {
  ok: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

type ApiEnvelope<T> = ApiEnvelopeSuccess<T> | ApiEnvelopeFailure;

async function requestCreationApi<T>(path: string, init?: RequestInit) {
  const response = await fetch(path, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init?.headers ?? {}),
    },
  });

  const payload = (await response.json()) as ApiEnvelope<T>;
  if (!response.ok || !payload.ok) {
    const errorPayload = payload as ApiEnvelopeFailure;
    throw new Error(errorPayload.error?.message ?? `Request failed: ${path}`);
  }

  return payload.data;
}

interface VideoFrameOptions {
  firstFrameUrl?: string;
  lastFrameUrl?: string;
}

interface ApiModelEndpoint {
  id: string;
  slug: string;
  label: string;
  family: {
    id: string;
    slug: string;
    name: string;
    modelKind: 'image' | 'video' | 'text' | 'audio' | 'lipsync';
  };
  provider: {
    id: string;
    code: string;
    name: string;
    providerType: string;
    enabled: boolean;
  };
}

interface RuntimeModelOption {
  id: string;
  title: string;
  description: string;
  modelKind: 'image' | 'video';
}

interface UseCreationWorkspaceOptions {
  studio: StudioFixture;
  runtimeApi?: CreationRuntimeApiContext;
  initialShotId?: string;
  initialView?: CreationViewMode;
}

export function useCreationWorkspace({ studio, runtimeApi, initialShotId, initialView }: UseCreationWorkspaceOptions) {
  const initialCreation = cloneCreationFixture(studio, initialShotId, initialView);
  const timersRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const generationTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const playbackFrameRef = useRef<number | null>(null);
  const playbackLastTickRef = useRef<number | null>(null);

  const [creation, setCreation] = useState(initialCreation);
  const [dialog, setDialog] = useState<CreationDialogState>({ type: 'none' });
  const [notice, setNotice] = useState<string | null>(null);
  const [materialTab, setMaterialTab] = useState<MaterialTab>('local');
  const [uploadedMaterialName, setUploadedMaterialName] = useState('');
  const [generateDraft, setGenerateDraft] = useState<GenerationDraft>(() => makeGenerationDraft(initialCreation.shots.find((shot) => shot.id === initialCreation.selectedShotId) ?? initialCreation.shots[0]));
  const [canvasDraft, setCanvasDraft] = useState<CanvasDraft>(() => makeCanvasDraft(initialCreation.shots.find((shot) => shot.id === initialCreation.selectedShotId) ?? initialCreation.shots[0]));
  const [storyToolDraft, setStoryToolDraft] = useState<StoryToolDraft>(() => makeStoryToolDraft(initialCreation.shots.find((shot) => shot.id === initialCreation.selectedShotId) ?? initialCreation.shots[0]));
  const [modelPickerDraft, setModelPickerDraft] = useState<ModelPickerDraft>(() => makeModelPickerDraft(initialCreation.shots.find((shot) => shot.id === initialCreation.selectedShotId) ?? initialCreation.shots[0]));
  const [lipsyncNotice, setLipsyncNotice] = useState<string | null>(null);
  const [modelPickerKind, setModelPickerKind] = useState<'image' | 'video'>('image');
  const [runtimeModelCatalog, setRuntimeModelCatalog] = useState<{
    image: ApiModelEndpoint[];
    video: ApiModelEndpoint[];
  }>({
    image: [],
    video: [],
  });

  useEffect(() => {
    return () => {
      timersRef.current.forEach((timer) => clearTimeout(timer));
      generationTimersRef.current.forEach((timer) => clearTimeout(timer));
      if (playbackFrameRef.current !== null) {
        cancelAnimationFrame(playbackFrameRef.current);
      }
    };
  }, []);

  const activeShot = useMemo(() => creation.shots.find((shot) => shot.id === creation.selectedShotId) ?? creation.shots[0], [creation.selectedShotId, creation.shots]);

  const activeVersion = useMemo(() => {
    if (!activeShot) {
      return null;
    }
    return activeShot.versions.find((version) => version.id === activeShot.activeVersionId) ?? activeShot.versions[0] ?? null;
  }, [activeShot]);

  const selectedVersion = useMemo(() => {
    if (!activeShot) {
      return null;
    }
    return activeShot.versions.find((version) => version.id === activeShot.selectedVersionId) ?? activeVersion;
  }, [activeShot, activeVersion]);

  const pendingVersion = useMemo(() => {
    if (!activeShot) {
      return null;
    }
    return activeShot.versions.find((version) => version.id === activeShot.pendingApplyVersionId) ?? null;
  }, [activeShot]);

  const activeMaterial = useMemo(() => {
    if (!activeShot) {
      return null;
    }
    return activeShot.materials.find((item) => item.id === activeShot.activeMaterialId) ?? activeShot.materials[0] ?? null;
  }, [activeShot]);

  useEffect(() => {
    if (!activeShot) {
      return;
    }
    setGenerateDraft(makeGenerationDraft(activeShot));
    setCanvasDraft(makeCanvasDraft(activeShot));
    setStoryToolDraft(makeStoryToolDraft(activeShot));
    setModelPickerDraft(makeModelPickerDraft(activeShot));
  }, [activeShot]);

  useEffect(() => {
    if (!runtimeApi) {
      return;
    }

    let canceled = false;

    void Promise.all([
      requestCreationApi<ApiModelEndpoint[]>('/api/model-endpoints?modelKind=image'),
      requestCreationApi<ApiModelEndpoint[]>('/api/model-endpoints?modelKind=video'),
    ])
      .then(([image, video]) => {
        if (canceled) {
          return;
        }
        setRuntimeModelCatalog({ image, video });
      })
      .catch(() => {
        if (canceled) {
          return;
        }
        setRuntimeModelCatalog({ image: [], video: [] });
      });

    return () => {
      canceled = true;
    };
  }, [runtimeApi]);

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

  const toApiVideoPayload = (frameOptions?: VideoFrameOptions) => ({
    durationSeconds: generateDraft.durationMode === '6s' ? 6 : 4,
    aspectRatio: activeShot?.canvasTransform.ratio ?? '9:16',
    resolution: generateDraft.resolution === '1080P' ? '1080p' : '720p',
    ...(runtimeModelCatalog.video.some((item) => item.slug === generateDraft.model) ? { modelEndpoint: generateDraft.model } : {}),
    ...(frameOptions?.firstFrameUrl ? { firstFrameUrl: frameOptions.firstFrameUrl } : {}),
    ...(frameOptions?.lastFrameUrl ? { lastFrameUrl: frameOptions.lastFrameUrl } : {}),
  });

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
      : toApiVideoPayload(frameOptions);

    const result = await requestCreationApi<{ run: { id: string } }>(path, {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    await pollRunUntilTerminal(result.run.id, targetShotId, mediaKind === 'image' ? '图片生成已完成。' : '已提交当前分镜生成任务。');
    return true;
  };

  useEffect(() => {
    if (!creation.playback.playing) {
      if (playbackFrameRef.current !== null) {
        cancelAnimationFrame(playbackFrameRef.current);
        playbackFrameRef.current = null;
      }
      playbackLastTickRef.current = null;
      return;
    }

    const tick = (timestamp: number) => {
      if (playbackLastTickRef.current === null) {
        playbackLastTickRef.current = timestamp;
      }

      const deltaSeconds = Math.min((timestamp - playbackLastTickRef.current) / 1000, 0.08);
      playbackLastTickRef.current = timestamp;

      setCreation((current) => {
        if (!current.playback.playing) {
          return current;
        }
        return advancePlaybackState(current, deltaSeconds);
      });

      playbackFrameRef.current = window.requestAnimationFrame(tick);
    };

    playbackFrameRef.current = window.requestAnimationFrame(tick);

    return () => {
      if (playbackFrameRef.current !== null) {
        cancelAnimationFrame(playbackFrameRef.current);
        playbackFrameRef.current = null;
      }
      playbackLastTickRef.current = null;
    };
  }, [creation.playback.playing]);

  const setViewMode = (viewMode: CreationViewMode) => {
    setCreation((current) => setCreationViewMode(current, viewMode));
    setNotice(null);
  };

  const setActiveTrack = (activeTrack: CreationTrack) => {
    setCreation((current) => setCreationTrack(current, activeTrack));
  };

  const selectShot = (shotId: string, syncPlayback = false) => {
    setCreation((current) => selectShotState(current, shotId, syncPlayback));
  };

  const setInlineShotField = <T extends 'resolution' | 'durationMode'>(field: T, value: typeof activeShot[T]) => {
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

  const togglePlayback = () => {
    if (!creation.playback.totalSecond) {
      return;
    }
    setCreation((current) => togglePlaybackState(current));
  };

  const seekPlayback = (nextSecond: number) => {
    setCreation((current) => seekPlaybackState(current, nextSecond));
  };

  const toggleSubtitle = () => {
    setCreation((current) => toggleSubtitleState(current));
    setNotice(null);
  };

  const openGenerateDialog = () => {
    if (!activeShot) {
      return;
    }
    setGenerateDraft(makeGenerationDraft(activeShot));
    setDialog({ type: 'generate' });
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
        const timer = setTimeout(() => {
          setCreation((current) => finishShotGenerationState(current, targetShotId, generateDraft.model));
          setNotice(wasFailed ? creationCopy.retrySubmitted : '已提交当前分镜生成任务。');
          generationTimersRef.current.delete(targetShotId);
        }, 960);

        timersRef.current.push(timer);
        generationTimersRef.current.set(targetShotId, timer);
      });
      return;
    }

    const timer = setTimeout(() => {
      setCreation((current) => finishShotGenerationState(current, targetShotId, generateDraft.model));
      setNotice(wasFailed ? creationCopy.retrySubmitted : '已提交当前分镜生成任务。');
      generationTimersRef.current.delete(targetShotId);
    }, 960);

    timersRef.current.push(timer);
    generationTimersRef.current.set(targetShotId, timer);
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
        const timer = setTimeout(() => {
          setCreation((current) => finishShotGenerationState(current, targetShotId, generateDraft.model, mediaKind));
          setNotice(null);
          generationTimersRef.current.delete(targetShotId);
        }, 4800);

        timersRef.current.push(timer);
        generationTimersRef.current.set(targetShotId, timer);
      });
      return;
    }

    const timer = setTimeout(() => {
      setCreation((current) => finishShotGenerationState(current, targetShotId, generateDraft.model, mediaKind));
      setNotice(null);
      generationTimersRef.current.delete(targetShotId);
    }, 4800);

    timersRef.current.push(timer);
    generationTimersRef.current.set(targetShotId, timer);
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

  const selectVersion = (versionId: string) => {
    if (!activeShot) {
      return;
    }
    setCreation((current) => selectVersionState(current, activeShot.id, versionId));
    setNotice(null);
  };

  const applySelectedVersion = (shotId?: string, versionId?: string) => {
    const targetShot = creation.shots.find((shot) => shot.id === (shotId ?? activeShot?.id));
    if (!targetShot) {
      return;
    }

    const targetVersionId = versionId ?? targetShot.pendingApplyVersionId;
    if (!targetVersionId) {
      return;
    }

    setCreation((current) => {
      const withSelection = targetVersionId === targetShot.selectedVersionId ? current : selectVersionState(current, targetShot.id, targetVersionId);
      return applySelectedVersionState(withSelection, targetShot.id, targetVersionId);
    });
    setNotice(null);
  };

  const downloadVersion = (shotId?: string, versionId?: string) => {
    const targetShot = creation.shots.find((shot) => shot.id === (shotId ?? activeShot?.id));
    if (!targetShot) {
      return;
    }

    const targetVersion = targetShot.versions.find((version) => version.id === (versionId ?? targetShot.selectedVersionId ?? targetShot.activeVersionId));
    if (!targetVersion) {
      return;
    }

    setNotice(null);
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

  const openStoryboardTool = (mode: StoryToolMode) => {
    if (!activeShot) {
      return;
    }

    setStoryToolDraft(makeStoryToolDraft(activeShot));
    setDialog({ type: 'story-tool', mode });
  };

  const setStoryToolField = <T extends keyof StoryToolDraft>(field: T, value: StoryToolDraft[T]) => {
    setStoryToolDraft((current) => ({ ...current, [field]: value }));
  };

  const toggleStoryToolFrame = (frame: number) => {
    setStoryToolDraft((current) => {
      const selectedFrames = current.selectedFrames.includes(frame)
        ? current.selectedFrames.filter((item) => item !== frame)
        : [...current.selectedFrames, frame].sort((left, right) => left - right);

      return {
        ...current,
        selectedFrames: selectedFrames.length ? selectedFrames : [frame],
      };
    });
  };

  const submitStoryboardTool = () => {
    if (!activeShot || dialog.type !== 'story-tool') {
      return;
    }

    if (dialog.mode === 'crop') {
      setCreation((current) => applyCropStoryboardState(current, activeShot.id, storyToolDraft));
      setNotice(`${activeShot.title} 的裁剪参数已回写到当前分镜。`);
    } else {
      setCreation((current) => deriveStoryboardFromFramesState(current, activeShot.id, storyToolDraft));
      setNotice(`已从 ${storyToolDraft.selectedFrames.length} 个关键帧生成新的衍生分镜。`);
    }

    setDialog({ type: 'none' });
  };

  const openModelPicker = (kind: 'image' | 'video' = 'image') => {
    if (!activeShot) {
      return;
    }

    setModelPickerKind(kind);
    setModelPickerDraft(makeModelPickerDraft(activeShot));
    setDialog({ type: 'model-picker' });
  };

  const setModelPickerField = <T extends keyof ModelPickerDraft>(field: T, value: ModelPickerDraft[T]) => {
    setModelPickerDraft((current) => ({ ...current, [field]: value }));
  };

  const availableModelOptions: RuntimeModelOption[] = (modelPickerKind === 'video' ? runtimeModelCatalog.video : runtimeModelCatalog.image).map((item) => ({
    id: item.slug,
    title: item.label,
    description: `${item.provider.name} · ${item.family.name}`,
    modelKind: modelPickerKind,
  }));

  const resolveModelDisplayName = (modelId: string) => {
    const found = [...runtimeModelCatalog.image, ...runtimeModelCatalog.video].find((item) => item.slug === modelId);
    return found?.label ?? modelId;
  };

  const applyModelPicker = () => {
    if (!activeShot) {
      return;
    }

    if (modelPickerDraft.selectedModel === activeShot.preferredModel) {
      setDialog({ type: 'none' });
      setNotice('当前分镜继续使用现有模型。');
      return;
    }

    setDialog({ type: 'confirm-model-reset', nextModel: modelPickerDraft.selectedModel });
  };

  const requestModelChange = (nextModel: string) => {
    if (!activeShot || nextModel === activeShot.preferredModel) {
      setNotice('当前分镜已使用该模型。');
      return;
    }
    setDialog({ type: 'confirm-model-reset', nextModel });
  };

  const confirmModelChange = (nextModel: string) => {
    if (!activeShot) {
      return;
    }
    setCreation((current) => confirmModelChangeState(current, activeShot.id, nextModel));
    setDialog({ type: 'none' });
    setNotice(creationCopy.modelWarning);
  };

  const resetShot = () => {
    if (!activeShot) {
      return;
    }
    setCreation((current) => resetShotState(current, activeShot.id));
    setNotice(creationCopy.resetSuccess);
  };

  const attachLocalMaterial = () => {
    if (!activeShot || !uploadedMaterialName.trim()) {
      setNotice('请先选择本地素材。');
      return;
    }
    setCreation((current) => attachMaterialState(current, activeShot.id, uploadedMaterialName.trim(), 'local'));
    setUploadedMaterialName('');
    setDialog({ type: 'none' });
    setNotice('已应用至当前分镜');
  };

  const applyUploadedMaterial = (name: string) => {
    if (!activeShot || !name.trim()) {
      setNotice('请先选择本地素材。');
      return;
    }
    setCreation((current) => attachMaterialState(current, activeShot.id, name.trim(), 'local'));
    setNotice('已应用至当前分镜');
  };

  const attachHistoryMaterial = (label: string) => {
    if (!activeShot) {
      return;
    }
    setCreation((current) => attachMaterialState(current, activeShot.id, label, 'history'));
    setDialog({ type: 'none' });
    setNotice('已应用至当前分镜');
  };

  const setActiveMaterial = (materialId: string) => {
    if (!activeShot) {
      return;
    }
    setCreation((current) => setActiveMaterialState(current, activeShot.id, materialId));
    setNotice('已切换主素材。');
  };

  const removeMaterial = (materialId: string) => {
    if (!activeShot) {
      return;
    }
    setCreation((current) => removeMaterialState(current, activeShot.id, materialId));
    setNotice('素材已从当前分镜移除。');
  };

  const applyCanvasDraft = () => {
    if (!activeShot) {
      return;
    }
    setCreation((current) => applyCanvasDraftState(current, activeShot.id, canvasDraft));
    setDialog({ type: 'none' });
    setNotice('画布参数已应用到当前分镜。');
  };

  const resetCanvasDraft = () => {
    if (!activeShot) {
      return;
    }
    setCanvasDraft(makeCanvasDraft(activeShot));
  };

  const setCanvasField = (field: keyof CanvasDraft, value: CanvasDraft[keyof CanvasDraft]) => {
    setCanvasDraft((current) => ({ ...current, [field]: value }));
  };

  const setVoiceField = <T extends keyof typeof creation.voice>(field: T, value: typeof creation.voice[T]) => {
    setCreation((current) => setVoiceFieldState(current, field, value));
  };

  const setMusicField = <T extends keyof typeof creation.music>(field: T, value: typeof creation.music[T]) => {
    setCreation((current) => setMusicFieldState(current, field, value));
  };

  const setLipsyncField = <T extends keyof typeof creation.lipSync>(field: T, value: typeof creation.lipSync[T]) => {
    setCreation((current) => setLipsyncFieldState(current, field, value));
  };

  const addLipsyncDialogue = () => {
    setCreation((current) => addLipsyncDialogueState(current));
  };

  const updateLipsyncDialogue = (dialogueId: string, field: 'speaker' | 'text', value: string) => {
    setCreation((current) => updateLipsyncDialogueState(current, dialogueId, field, value));
  };

  const removeLipsyncDialogue = (dialogueId: string) => {
    if (creation.lipSync.dialogues.length <= 1) {
      setLipsyncNotice('多人模式至少保留 1 条对白。');
      return;
    }
    setCreation((current) => removeLipsyncDialogueState(current, dialogueId));
  };

  const submitLipsync = () => {
    const { lipSync } = creation;
    if (!lipSync.baseShotId) {
      setLipsyncNotice('请先选择底图。');
      return;
    }
    if (lipSync.inputMode === 'text' && !lipSync.dialogues.some((item) => item.text.trim())) {
      setLipsyncNotice('文本模式下必须输入对白。');
      return;
    }
    if (lipSync.inputMode === 'audio' && !lipSync.audioName.trim()) {
      setLipsyncNotice('上传模式下必须选择音频文件。');
      return;
    }
    setLipsyncNotice('对口型任务已提交，当前为 mock 成功态。');
  };

  const openMaterialsDialog = () => setDialog({ type: 'materials' });
  const openCanvasDialog = () => {
    if (!activeShot) {
      return;
    }

    setCanvasDraft(makeCanvasDraft(activeShot));
    setDialog((current) => (current.type === 'canvas' ? { type: 'none' } : { type: 'canvas' }));
  };
  const openLipsyncDialog = () => {
    setLipsyncNotice(null);
    setDialog((current) => (current.type === 'lipsync' ? { type: 'none' } : { type: 'lipsync' }));
  };

  return {
    studio,
    creation,
    dialog,
    notice,
    materialTab,
    uploadedMaterialName,
    generateDraft,
    canvasDraft,
    storyToolDraft,
    modelPickerDraft,
    lipsyncNotice,
    activeShot,
    activeVersion,
    selectedVersion,
    pendingVersion,
    activeMaterial,
    statusLabel,
    shotAccent,
    formatClock,
    formatShotDuration,
    setDialog,
    setNotice,
    setMaterialTab,
    setUploadedMaterialName,
    setGenerateDraft,
    setCanvasField,
    setCanvasDraft,
    setStoryToolField,
    setStoryToolDraft,
    toggleStoryToolFrame,
    setModelPickerField,
    setModelPickerDraft,
    setLipsyncNotice,
    modelPickerKind,
    availableModelOptions,
    resolveModelDisplayName,
    setViewMode,
    setActiveTrack,
    selectShot,
    setInlineShotField,
    toggleInlineCrop,
    togglePlayback,
    seekPlayback,
    toggleSubtitle,
    openGenerateDialog,
    openBatchDialog,
    submitGeneration,
    submitInlineGeneration,
    submitBatch,
    openStoryboardTool,
    submitStoryboardTool,
    openModelPicker,
    applyModelPicker,
    selectVersion,
    applySelectedVersion,
    downloadVersion,
    retryShot,
    cancelGeneration,
    requestModelChange,
    confirmModelChange,
    resetShot,
    openMaterialsDialog,
    attachLocalMaterial,
    applyUploadedMaterial,
    attachHistoryMaterial,
    setActiveMaterial,
    removeMaterial,
    openCanvasDialog,
    openLipsyncDialog,
    applyCanvasDraft,
    resetCanvasDraft,
    setVoiceField,
    setMusicField,
    setLipsyncField,
    addLipsyncDialogue,
    updateLipsyncDialogue,
    removeLipsyncDialogue,
    submitLipsync,
  };
}

export type CreationWorkspaceController = ReturnType<typeof useCreationWorkspace>;
