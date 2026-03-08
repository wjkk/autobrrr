'use client';

import type { PlannerReference, PlannerStepStatus, StoryboardDraft, StudioFixture } from '@aiv/domain';
import { Badge, Panel, cx } from '@aiv/ui';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { Dialog } from '@/features/shared/components/dialog';
import { StageLinks } from '@/features/shared/components/stage-links';
import { plannerCopy } from '@/lib/copy';

import styles from './planner-page.module.css';

interface PlannerPageProps {
  studio: StudioFixture;
}

type PlannerDialogState =
  | { type: 'none' }
  | { type: 'reference'; id: string }
  | { type: 'storyboard'; id: string }
  | { type: 'delete-storyboard'; id: string }
  | { type: 'delete-reference'; id: string };

type PlannerMode = 'single' | 'series';

interface PlannerEpisodeDraft {
  id: string;
  label: string;
  title: string;
  summary: string;
  styleId: number;
  shotCount: number;
}

const REFERENCE_MODELS = ['Vision Auto', 'Vision Detail', 'Vision Reference'];
const BOOT_PROGRESS_STEPS = [34, 52, 71, 89, 100];
const STYLE_LIBRARY = [
  { id: 54, name: '韩漫二次元', tone: '高对比、硬描边、动势夸张' },
  { id: 56, name: '3D古风', tone: '三维体积光、玉石材质、大场景' },
  { id: 60, name: '岩井俊二电影', tone: '柔焦逆光、青春颗粒、空镜节奏' },
  { id: 61, name: '复古DV质感', tone: '手持晃动、磁带噪点、冷暖漂移' },
  { id: 76, name: '未来主义', tone: '冷色金属、霓虹反射、高速运镜' },
];

function nextLocalId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

function nextVariantLabel(label: string) {
  const match = label.match(/(\d+)$/);

  if (!match) {
    return '变体 01';
  }

  const nextIndex = ((Number(match[1]) % 9) + 1).toString().padStart(2, '0');
  return label.replace(/\d+$/, nextIndex);
}

function inferSectionLabel(sectionId: string) {
  if (sectionId === 'summary') {
    return '故事梗概';
  }

  if (sectionId === 'style') {
    return '美术风格';
  }

  if (sectionId === 'subjects') {
    return '主体列表';
  }

  return '分镜剧本';
}

function buildPlannerEpisodes(title: string, mode: PlannerMode, brief: string): PlannerEpisodeDraft[] {
  const baseTitle = title.slice(0, 18) || '雨夜街头的橘色微光';

  if (mode === 'single') {
    return [
      {
        id: 'episode-1',
        label: 'EP 01',
        title: baseTitle,
        summary: '单片模式，当前全部分镜围绕同一条主线推进。',
        styleId: 61,
        shotCount: 3,
      },
    ];
  }

  return [
    {
      id: 'episode-1',
      label: 'EP 01',
      title: `${baseTitle}·起`,
      summary: brief || '负责开场设定与情绪入场。',
      styleId: 61,
      shotCount: 3,
    },
    {
      id: 'episode-2',
      label: 'EP 02',
      title: `${baseTitle}·承`,
      summary: '延展人物关系与关键动作。',
      styleId: 56,
      shotCount: 4,
    },
    {
      id: 'episode-3',
      label: 'EP 03',
      title: `${baseTitle}·合`,
      summary: '完成情绪收束与发布承接。',
      styleId: 60,
      shotCount: 3,
    },
  ];
}

function relabelEpisodes(episodes: PlannerEpisodeDraft[]) {
  return episodes.map((item, index) => ({
    ...item,
    label: `EP ${String(index + 1).padStart(2, '0')}`,
  }));
}

function styleNameById(styleId: number) {
  return STYLE_LIBRARY.find((item) => item.id === styleId)?.name ?? '未指定风格';
}

export function PlannerPage({ studio }: PlannerPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const timersRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const hydratedRef = useRef(false);
  const seriesEpisodesRef = useRef<PlannerEpisodeDraft[] | null>(null);
  const [displayTitle, setDisplayTitle] = useState(studio.project.title);
  const [plannerMode, setPlannerMode] = useState<PlannerMode>(studio.project.contentMode === 'series' ? 'series' : 'single');
  const [plannerEpisodes, setPlannerEpisodes] = useState<PlannerEpisodeDraft[]>(() => buildPlannerEpisodes(studio.project.title, studio.project.contentMode === 'series' ? 'series' : 'single', studio.project.brief));
  const [activeEpisodeId, setActiveEpisodeId] = useState('episode-1');
  const [aspectRatio, setAspectRatio] = useState(studio.project.aspectRatio);
  const [globalStyleId, setGlobalStyleId] = useState(61);
  const [requirement, setRequirement] = useState(studio.planner.submittedRequirement);
  const [messages, setMessages] = useState(studio.planner.messages);
  const [steps, setSteps] = useState(studio.planner.steps);
  const [references, setReferences] = useState(studio.planner.references);
  const [storyboards, setStoryboards] = useState(studio.planner.storyboards);
  const [sections, setSections] = useState(studio.planner.sections);
  const [status, setStatus] = useState(studio.planner.status);
  const [docProgressPercent, setDocProgressPercent] = useState(studio.planner.docProgressPercent);
  const [remainingPoints, setRemainingPoints] = useState(studio.creation.points);
  const [notice, setNotice] = useState<string | null>(null);
  const [booting, setBooting] = useState(false);
  const [bootProgress, setBootProgress] = useState(0);
  const [dialog, setDialog] = useState<PlannerDialogState>({ type: 'none' });
  const [referenceDraft, setReferenceDraft] = useState<PlannerReference | null>(null);
  const [storyboardDraft, setStoryboardDraft] = useState<StoryboardDraft | null>(null);
  const [activeSectionId, setActiveSectionId] = useState(studio.planner.sections.find((item) => item.open)?.id ?? studio.planner.sections[0]?.id ?? 'summary');

  const ready = status === 'ready';

  useEffect(() => {
    return () => {
      timersRef.current.forEach((timer) => clearTimeout(timer));
    };
  }, []);

  useEffect(() => {
    if (plannerMode === 'series') {
      seriesEpisodesRef.current = plannerEpisodes;
    }
  }, [plannerEpisodes, plannerMode]);

  useEffect(() => {
    if (!plannerEpisodes.some((item) => item.id === activeEpisodeId)) {
      setActiveEpisodeId(plannerEpisodes[0]?.id ?? 'episode-1');
    }
  }, [activeEpisodeId, plannerEpisodes]);

  useEffect(() => {
    if (dialog.type === 'reference') {
      const target = references.find((item) => item.id === dialog.id) ?? null;
      setReferenceDraft(target);
      return;
    }

    if (dialog.type === 'storyboard') {
      const target = storyboards.find((item) => item.id === dialog.id) ?? null;
      setStoryboardDraft(target);
      return;
    }

    setReferenceDraft(null);
    setStoryboardDraft(null);
  }, [dialog, references, storyboards]);

  useEffect(() => {
    if (hydratedRef.current) {
      return;
    }

    const incomingPrompt = searchParams.get('prompt')?.trim();
    const incomingTitle = searchParams.get('title')?.trim();
    const incomingMode = searchParams.get('storyMode');

    if (!incomingPrompt && !incomingTitle && !incomingMode) {
      return;
    }

    hydratedRef.current = true;

    if (incomingPrompt) {
      setRequirement(incomingPrompt);
      setMessages((current) => [
        ...current,
        {
          id: nextLocalId('msg'),
          role: 'assistant',
          content: `已从灵感广场带入新需求：${incomingPrompt}`,
        },
      ]);
      setNotice('已带入来自灵感广场的需求，请确认后提交。');
    }

    if (incomingTitle) {
      setDisplayTitle(incomingTitle);
    }

    if (incomingMode === 'single' || incomingMode === 'series') {
      setPlannerMode(incomingMode);
      setPlannerEpisodes(buildPlannerEpisodes(incomingTitle ?? displayTitle, incomingMode, studio.project.brief));
      setActiveEpisodeId('episode-1');
    }
  }, [displayTitle, searchParams, studio.project.brief]);

  const activeEpisode = plannerEpisodes.find((item) => item.id === activeEpisodeId) ?? plannerEpisodes[0] ?? null;

  const summaryText = useMemo(() => {
    return `${plannerEpisodes.length} 集 / ${storyboards.length} 条分镜草稿 / ${references.length} 张主体参考`;
  }, [plannerEpisodes.length, references.length, storyboards.length]);

  const activeSectionLabel = useMemo(() => {
    const section = sections.find((item) => item.id === activeSectionId);
    return section ? inferSectionLabel(section.id) : '章节';
  }, [activeSectionId, sections]);

  const updateEpisode = (episodeId: string, patch: Partial<PlannerEpisodeDraft>) => {
    setPlannerEpisodes((current) => current.map((item) => (item.id === episodeId ? { ...item, ...patch } : item)));
  };

  const syncActiveEpisodeShotCount = (shotCount: number) => {
    setPlannerEpisodes((current) => current.map((item) => (item.id === activeEpisodeId ? { ...item, shotCount } : item)));
  };

  const handlePlannerModeChange = (nextMode: PlannerMode) => {
    if (nextMode === plannerMode) {
      return;
    }

    if (nextMode === 'single') {
      const focusedEpisode = activeEpisode ?? plannerEpisodes[0] ?? buildPlannerEpisodes(displayTitle, 'single', studio.project.brief)[0];

      if (plannerEpisodes.length > 1) {
        seriesEpisodesRef.current = plannerEpisodes;
      }

      setPlannerMode('single');
      setPlannerEpisodes([
        {
          ...focusedEpisode,
          label: 'EP 01',
        },
      ]);
      setActiveEpisodeId(focusedEpisode.id);
      setNotice('已切换为单片模式，当前仅保留焦点剧集。');
      return;
    }

    const restoredEpisodes = seriesEpisodesRef.current?.length
      ? seriesEpisodesRef.current
      : buildPlannerEpisodes(displayTitle, 'series', studio.project.brief);

    setPlannerMode('series');
    setPlannerEpisodes(relabelEpisodes(restoredEpisodes));
    setActiveEpisodeId(restoredEpisodes[0]?.id ?? 'episode-1');
    setNotice('已切换为多剧集模式。');
  };

  const addEpisode = () => {
    if (plannerMode === 'single') {
      setNotice('单片模式下不能新增剧集，请先切换到多剧集模式。');
      return;
    }

    setPlannerEpisodes((current) => {
      const nextSequence = current.length + 1;
      return relabelEpisodes([
        ...current,
        {
          id: nextLocalId('episode'),
          label: `EP ${String(nextSequence).padStart(2, '0')}`,
          title: `第 ${nextSequence} 集：新篇章`,
          summary: '补充当前集的剧情摘要、关键情绪与动作节点。',
          styleId: globalStyleId,
          shotCount: Math.max(storyboards.length, 3),
        },
      ]);
    });
    setNotice('已新增剧集。');
  };

  const moveEpisode = (episodeId: string, direction: 'up' | 'down') => {
    if (plannerMode === 'single') {
      setNotice('单片模式下不需要调整剧集顺序。');
      return;
    }

    setPlannerEpisodes((current) => {
      const index = current.findIndex((item) => item.id === episodeId);

      if (index === -1) {
        return current;
      }

      const targetIndex = direction === 'up' ? index - 1 : index + 1;

      if (targetIndex < 0 || targetIndex >= current.length) {
        return current;
      }

      const next = [...current];
      const [moved] = next.splice(index, 1);
      next.splice(targetIndex, 0, moved);
      return relabelEpisodes(next);
    });

    setNotice(direction === 'up' ? '剧集已上移。' : '剧集已下移。');
  };

  const duplicateEpisode = (episodeId: string) => {
    if (plannerMode === 'single') {
      setNotice('单片模式下不能复制剧集。');
      return;
    }

    setPlannerEpisodes((current) => {
      const index = current.findIndex((item) => item.id === episodeId);
      const target = current[index];

      if (index === -1 || !target) {
        return current;
      }

      const duplicated: PlannerEpisodeDraft = {
        ...target,
        id: nextLocalId('episode'),
        title: `${target.title} 副本`,
      };

      const next = [...current];
      next.splice(index + 1, 0, duplicated);
      return relabelEpisodes(next);
    });

    setNotice('已复制剧集。');
  };

  const deleteEpisode = (episodeId: string) => {
    if (plannerMode === 'single') {
      setNotice('单片模式下不能删除剧集。');
      return;
    }

    setPlannerEpisodes((current) => {
      if (current.length <= 1) {
        return current;
      }

      const index = current.findIndex((item) => item.id === episodeId);
      const next = relabelEpisodes(current.filter((item) => item.id !== episodeId));
      const fallback = next[Math.max(0, index - 1)] ?? next[0] ?? null;

      if (activeEpisodeId === episodeId && fallback) {
        setActiveEpisodeId(fallback.id);
      }

      return next;
    });

    setNotice('剧集已删除。');
  };

  const runPlanner = () => {
    const trimmed = requirement.trim();

    if (!trimmed) {
      setNotice('请输入需求后再提交。');
      return;
    }

    timersRef.current.forEach((timer) => clearTimeout(timer));
    timersRef.current = [];

    setBooting(false);
    setBootProgress(0);
    setNotice(null);
    setDisplayTitle(trimmed.slice(0, 30));
    setStatus('updating');
    setDocProgressPercent(12);
    setMessages((current) => [
      ...current,
      { id: nextLocalId('msg'), role: 'user', content: trimmed },
      { id: nextLocalId('msg'), role: 'assistant', content: plannerCopy.assistantWorking },
    ]);
    setSteps((current) => current.map((step, index) => ({ ...step, status: (index === 0 ? 'running' : 'waiting') as PlannerStepStatus })));

    studio.planner.steps.forEach((_step, index) => {
      const startTimer = setTimeout(() => {
        setSteps((current) =>
          current.map((item, stepIndex) => {
            if (stepIndex < index) {
              return { ...item, status: 'done' };
            }

            if (stepIndex === index) {
              return { ...item, status: 'running' };
            }

            return { ...item, status: 'waiting' };
          }),
        );
        setDocProgressPercent(Math.min(88, 28 + index * 18));
      }, index * 480);

      const finishTimer = setTimeout(() => {
        setSteps((current) =>
          current.map((item, stepIndex) => {
            if (stepIndex <= index) {
              return { ...item, status: 'done' };
            }

            if (stepIndex === index + 1) {
              return { ...item, status: 'running' };
            }

            return item;
          }),
        );
      }, index * 480 + 300);

      timersRef.current.push(startTimer, finishTimer);
    });

    const doneTimer = setTimeout(() => {
      setStatus('ready');
      setDocProgressPercent(100);
      setSteps((current) => current.map((step) => ({ ...step, status: 'done' })));
      setMessages((current) => [...current, { id: nextLocalId('msg'), role: 'assistant', content: plannerCopy.assistantReady }]);
      setNotice('策划文档已刷新，可以进入分片生成。');
    }, studio.planner.steps.length * 480 + 320);

    timersRef.current.push(doneTimer);
  };

  const startCreation = () => {
    if (!ready) {
      setNotice('文档仍在更新，完成后才能生成分镜。');
      return;
    }

    if (!storyboards.length) {
      setNotice('当前还没有可生成的分镜草稿。');
      return;
    }

    if (remainingPoints < studio.planner.pointCost) {
      setNotice('积分不足，无法生成分镜。');
      return;
    }

    setBooting(true);
    setBootProgress(0);
    setRemainingPoints((current) => current - studio.planner.pointCost);

    BOOT_PROGRESS_STEPS.forEach((value, index) => {
      const timer = setTimeout(() => {
        setBootProgress(value);
      }, index * 180);
      timersRef.current.push(timer);
    });

    const navigationTimer = setTimeout(() => {
      router.push(`/projects/${studio.project.id}/creation`);
    }, BOOT_PROGRESS_STEPS.length * 180 + 140);

    timersRef.current.push(navigationTimer);
  };

  const regenerateReference = (referenceId: string) => {
    setReferences((current) =>
      current.map((item) => {
        if (item.id !== referenceId) {
          return item;
        }

        return {
          ...item,
          variantLabel: nextVariantLabel(item.variantLabel),
        };
      }),
    );

    setReferenceDraft((current) => {
      if (!current || current.id !== referenceId) {
        return current;
      }

      return {
        ...current,
        variantLabel: nextVariantLabel(current.variantLabel),
      };
    });

    setNotice('主体参考已重生成新的 mock 变体。');
  };

  const saveReference = () => {
    if (!referenceDraft) {
      return;
    }

    if (!referenceDraft.title.trim() || !referenceDraft.prompt.trim()) {
      setNotice('请补全主体名称与提示词后再保存。');
      return;
    }

    setReferences((current) => current.map((item) => (item.id === referenceDraft.id ? referenceDraft : item)));
    setNotice('主体参考已更新。');
    setDialog({ type: 'none' });
  };

  const saveStoryboard = () => {
    if (!storyboardDraft) {
      return;
    }

    if (!storyboardDraft.title.trim() || !storyboardDraft.visualPrompt.trim() || !storyboardDraft.compositionPrompt.trim() || !storyboardDraft.motionPrompt.trim()) {
      setNotice('请补全标题、画面描述、构图设计与运镜调度后再保存。');
      return;
    }

    setStoryboards((current) => current.map((item) => (item.id === storyboardDraft.id ? storyboardDraft : item)));
    setNotice('分镜草稿已更新。');
    setDialog({ type: 'none' });
  };

  const duplicateStoryboard = (id: string) => {
    setStoryboards((current) => {
      const targetIndex = current.findIndex((item) => item.id === id);
      const target = current[targetIndex];

      if (targetIndex === -1 || !target) {
        return current;
      }

      const duplicated: StoryboardDraft = {
        ...target,
        id: nextLocalId('sb'),
        title: `${target.title} 副本`,
      };

      const next = [...current];
      next.splice(targetIndex + 1, 0, duplicated);
      return next;
    });

    syncActiveEpisodeShotCount(storyboards.length + 1);
    setSections((current) => current.map((item) => (item.id === 'storyboards' ? { ...item, open: true } : item)));
    setActiveSectionId('storyboards');
    setNotice('已复制分镜草稿。');
  };

  const addStoryboard = () => {
    const sequence = storyboards.length + 1;
    const draft: StoryboardDraft = {
      id: nextLocalId('sb'),
      title: `分镜 ${String(sequence).padStart(2, '0')}`,
      visualPrompt: '补充新的画面描述。',
      compositionPrompt: '补充新的构图说明。',
      motionPrompt: '补充新的运镜或动作。',
    };

    setStoryboards((current) => [...current, draft]);
    syncActiveEpisodeShotCount(sequence);
    setSections((current) => current.map((item) => (item.id === 'storyboards' ? { ...item, open: true } : item)));
    setActiveSectionId('storyboards');
    setDialog({ type: 'storyboard', id: draft.id });
    setNotice('已新增分镜草稿。');
  };

  const confirmDeleteStoryboard = () => {
    if (dialog.type !== 'delete-storyboard') {
      return;
    }

    if (storyboards.length <= 1) {
      setNotice('至少保留 1 条分镜。');
      setDialog({ type: 'none' });
      return;
    }

    setStoryboards((current) => current.filter((item) => item.id !== dialog.id));
    syncActiveEpisodeShotCount(Math.max(1, storyboards.length - 1));
    setNotice('分镜草稿已删除。');
    setDialog({ type: 'none' });
  };

  const confirmDeleteReference = () => {
    if (dialog.type !== 'delete-reference') {
      return;
    }

    setReferences((current) => current.filter((item) => item.id !== dialog.id));
    setNotice('主体参考已删除。');
    setDialog({ type: 'none' });
  };

  const openSection = (sectionId: string) => {
    setActiveSectionId(sectionId);
    setSections((current) => current.map((item) => (item.id === sectionId ? { ...item, open: true } : item)));
  };

  const toggleSection = (sectionId: string) => {
    setActiveSectionId(sectionId);
    setSections((current) => current.map((item) => (item.id === sectionId ? { ...item, open: !item.open } : item)));
  };

  const renderSectionBody = (sectionId: string) => {
    if (sectionId === 'summary') {
      return <p>{activeEpisode?.summary ?? '围绕雨夜、救助与暖意推进三段式叙事，确保情绪逐镜上扬，并为生成阶段保留足够可替换空间。'}</p>;
    }

    if (sectionId === 'style') {
      return (
        <ul className="plain-list">
          <li>{`全局风格：${styleNameById(globalStyleId)}。`}</li>
          <li>{`当前剧集风格：${styleNameById(activeEpisode?.styleId ?? globalStyleId)}。`}</li>
          <li>{STYLE_LIBRARY.find((item) => item.id === (activeEpisode?.styleId ?? globalStyleId))?.tone ?? '保持镜头节奏克制，优先情绪稳定。'}</li>
        </ul>
      );
    }

    if (sectionId === 'subjects') {
      return (
        <ul className="plain-list">
          {references.map((reference) => (
            <li key={reference.id}>{`${reference.title} · ${reference.modelId} · ${reference.variantLabel}`}</li>
          ))}
        </ul>
      );
    }

    return (
      <ul className="plain-list">
        {storyboards.map((storyboard) => (
          <li key={storyboard.id}>{`${storyboard.title}：${storyboard.visualPrompt}`}</li>
        ))}
      </ul>
    );
  };

  return (
    <>
      <div className={styles.page}>
        <header className={styles.workspaceHeader}>
          <div className={styles.headerIdentity}>
            <div className={styles.headerEyebrowRow}>
              <span className={styles.brandPill}>{studio.brandName}</span>
              <Badge>{ready ? '策划文档已就绪' : status === 'updating' ? '多 Agent 正在协作' : '等待提交需求'}</Badge>
              <Badge tone={plannerMode === 'series' ? 'warning' : 'success'}>{plannerMode === 'series' ? '多剧集模式' : '单片模式'}</Badge>
            </div>
            <h1 className={styles.headerTitle}>{displayTitle}</h1>
            <p className={styles.headerDescription}>{studio.project.brief}</p>
          </div>

          <div className={styles.headerToolbar}>
            <div className={styles.modeBar}>
              <button type="button" className={cx(styles.modeChip, plannerMode === 'single' && styles.modeChipActive)} onClick={() => handlePlannerModeChange('single')}>
                单片模式
              </button>
              <button type="button" className={cx(styles.modeChip, plannerMode === 'series' && styles.modeChipActive)} onClick={() => handlePlannerModeChange('series')}>
                多剧集模式
              </button>
            </div>
            <button type="button" className={styles.headerBtn} onClick={() => router.push('/explore')}>
              返回广场
            </button>
            <StageLinks projectId={studio.project.id} activeStage="planner" />
            <button type="button" className={styles.headerBtn} onClick={startCreation}>生成分镜</button>
          </div>
        </header>

        <div className={styles.workspaceShell}>
          {plannerMode === 'series' && (
            <aside className={styles.episodeSidebar}>
              {plannerEpisodes.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  className={cx(styles.narrowEpisodeBtn, activeEpisodeId === item.id && styles.narrowEpisodeBtnActive)}
                  onClick={() => {
                    setActiveEpisodeId(item.id);
                    setNotice(`已切换到 ${item.title} 的策划视图。`);
                  }}
                  title={item.title}
                >
                  {String(index + 1).padStart(2, '0')}
                </button>
              ))}
              <button type="button" className={styles.narrowEpisodeAdd} onClick={addEpisode} title="新增剧集">
                +
              </button>
            </aside>
          )}

          <section className={styles.chatPanel}>
            <div className={styles.chatScrollable}>
              <div className={styles.agentProgressBlock}>
                <div>
                  <strong>{ready ? '文档已准备好' : '需求正在拆解'}</strong>
                  <small>{ready ? '可以进入分片生成，并继续替换与重试。' : '正在调用专家 Agent 按步骤撰写大纲与分镜。'}</small>
                </div>
                <div className={styles.progressTrack} aria-hidden="true">
                  <span className={styles.progressFill} style={{ width: `${docProgressPercent}%` }} />
                </div>
              </div>

              <div className="message-stack" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {messages.map((item, index) => {
                  const isUser = item.role === 'user';
                  // In Seko, the first assistant message usually contains the checklist and outline
                  const isMainAssistantMsg = !isUser && index === 1;

                  return (
                    <article key={item.id} className={cx(styles.messageRow, isUser && styles.messageRowUser)}>
                      {!isUser && (
                        <div className={styles.messageAvatar}>
                          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" /></svg>
                        </div>
                      )}
                      <div className={styles.messageContent}>
                        {!isUser && (
                          <div className={styles.messageName}>
                            Seko <span>AI 策划顾问</span>
                          </div>
                        )}
                        {isUser ? (
                          <div className={styles.bubbleUser}>{item.content}</div>
                        ) : (
                          <div>
                            <p style={{ fontSize: '14px', lineHeight: 1.6, color: 'var(--text-primary)', margin: 0 }}>{item.content}</p>

                            {isMainAssistantMsg && steps.length > 0 && (
                              <div className={styles.sekoChecklistGroup}>
                                {steps.map((step) => (
                                  <div key={step.id} className={cx(styles.sekoChecklistItem, styles[`checklistItem--${step.status}`])}>
                                    <span className={styles.sekoChecklistIcon}>
                                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                                    </span>
                                    <span>{step.title}</span>
                                    {step.status === 'done' && <span className={styles.sekoSubChip}>已完备</span>}
                                  </div>
                                ))}
                              </div>
                            )}

                            {isMainAssistantMsg && ready && (
                              <div className={styles.outlineCard}>
                                <div className={styles.outlineCardHeader}>
                                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                                  第{activeEpisode?.label.replace('EP ', '') || '1'}集：{activeEpisode?.title || displayTitle}
                                </div>
                                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                                  已为您更新策划文档，可以基于此大纲开始生成分镜。
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>

            <div className={styles.chatStickyInputWrap}>
              <div className={styles.chatStickyInput}>
                <textarea
                  className={styles.chatInputTextarea}
                  value={requirement}
                  onChange={(event) => setRequirement(event.target.value)}
                  placeholder="输入你的问题，Shift+Enter换行"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      runPlanner();
                    }
                  }}
                />
                <div className={styles.chatInputActions}>
                  <div style={{ display: 'flex', gap: '12px', color: 'var(--text-tertiary)' }}>
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" style={{ cursor: 'pointer' }}><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" /></svg>
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" style={{ cursor: 'pointer' }}><circle cx="12" cy="12" r="4" /><path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94" /></svg>
                  </div>
                  <button
                    className={cx(styles.chatSendBtn, requirement.trim() && styles.chatSendBtnActive)}
                    onClick={runPlanner}
                    disabled={status === 'updating' || !requirement.trim()}
                    title="发送"
                    type="button"
                  >
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" /></svg>
                  </button>
                </div>
              </div>
              {notice && <div className="inline-toast">{notice}</div>}
            </div>
          </section>

          <main className={styles.documentPanelSpace}>
            <div className={styles.documentContainer}>
              <div className={styles.docHeaderRow}>
                <div className={styles.docTitleRow}>
                  <svg className={styles.docIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                    <polyline points="10 9 9 9 8 9" />
                  </svg>
                  <h2 className={styles.docTitleText}>
                    第{activeEpisode?.label.replace('EP ', '') || '1'}集：{activeEpisode?.title || displayTitle}
                  </h2>
                  <span className={styles.aiGeneratedTag}>内容由 AI 生成</span>
                  <svg className={styles.docActionIcon} viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" onClick={() => setNotice('重置当前文档')}>
                    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                    <path d="M3 3v5h5" />
                  </svg>
                </div>
              </div>

              {status === 'updating' && !ready ? (
                <div className={styles.docSkeletonBlock}>
                  <div className={styles.skeletonLine} style={{ width: '30%', height: '32px', marginBottom: '32px' }} />
                  <div className={styles.skeletonLine} style={{ width: '100%' }} />
                  <div className={styles.skeletonLine} style={{ width: '90%' }} />
                  <div className={styles.skeletonLine} style={{ width: '95%' }} />
                  <div className={styles.skeletonLine} style={{ width: '80%' }} />
                </div>
              ) : (
                <>
                  <section className={styles.docSection}>
                    <div className={styles.docSectionHeaderRow}>
                      <div className={styles.docSectionIcon}>
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></svg>
                      </div>
                      <h3 className={styles.docSectionTitle}>故事梗概</h3>
                    </div>
                    <ul className={styles.docContentList}>
                      <li><span style={{ color: 'var(--text-tertiary)', marginRight: '4px' }}>•</span> <strong>内容梗概：</strong>{activeEpisode?.summary || displayTitle}。单片模式，当前全部分镜围绕同一条主线推进。</li>
                    </ul>
                    <div className={styles.highlightCard}>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '12px', fontSize: '14px' }}>剧本亮点</div>
                      <ul>
                        <li>世界观：宏大且具有赛博朋克深邃质感体系，视觉细节拉满。</li>
                        <li>情感内核：在数字废墟之中寻找人性的微光，剧情跌宕起伏。</li>
                      </ul>
                    </div>
                  </section>

                  <section className={styles.docSection}>
                    <div className={styles.docSectionHeaderRow}>
                      <div className={styles.docSectionIcon}>
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><circle cx="10" cy="10" r="2" /><path d="M10 14a2 2 0 1 0 4 0" /></svg>
                      </div>
                      <h3 className={styles.docSectionTitle}>画面主体参考</h3>
                    </div>
                    <div className={styles.refGrid}>
                      {references.map((item) => (
                        <article
                          key={item.id}
                          className={styles.refCard}
                          onClick={() => setDialog({ type: 'reference', id: item.id })}
                          style={{ backgroundImage: `url(https://source.unsplash.com/random/320x180?cyberpunk,${item.id})`, backgroundSize: 'cover' }}
                        >
                          <span>{item.title} - {item.variantLabel.replace('变体 ', '')}态</span>
                        </article>
                      ))}
                    </div>
                  </section>

                  <section className={styles.docSection}>
                    <div className={styles.docSectionHeaderRow}>
                      <div className={cx(styles.docSectionIcon, styles.docSectionIconBlue)}>
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" /></svg>
                      </div>
                      <h3 className={styles.docSectionTitle}>场景列表</h3>
                    </div>
                    <div className={styles.shotStack}>
                      {storyboards.map((item, index) => (
                        <article
                          key={item.id}
                          className={styles.shotCard}
                          onClick={() => setDialog({ type: 'storyboard', id: item.id })}
                          style={{ backgroundImage: `url(https://source.unsplash.com/random/320x180?neon,${index})`, backgroundSize: 'cover' }}
                        >
                          <div className={styles.shotCardContent} style={{ opacity: 0 }}>
                            <strong>{item.title}</strong>
                            <p>{item.visualPrompt.slice(0, 10)}</p>
                          </div>
                        </article>
                      ))}
                    </div>
                  </section>

                  <div className={styles.docBottomBarSpace} />

                  {/* Sticky Render Controls at Bottom of Container */}
                  <div className={styles.sekoBottomBar}>
                    <div className={styles.docMetaRow}>
                      <span className={styles.docSelectLabel}>分镜图模型</span>
                      <select className={styles.docSelect} value={globalStyleId} onChange={(e) => setGlobalStyleId(Number(e.target.value))}>
                        <option value={61}>默认基础模型 ▾</option>
                        {STYLE_LIBRARY.map((item) => <option key={item.id} value={item.id}>{item.name} ▾</option>)}
                      </select>

                      <span className={styles.docSelectLabel} style={{ marginLeft: '16px' }}>画面比例</span>
                      <select className={styles.docSelect} value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value as typeof aspectRatio)}>
                        <option value="9:16">📱 9:16 ▾</option>
                        <option value="16:9">💻 16:9 ▾</option>
                        <option value="1:1">⬛ 1:1 ▾</option>
                      </select>
                    </div>

                    <button className={styles.generateBtnBlack} onClick={startCreation} type="button">
                      生成分镜 ✦ 38
                    </button>
                  </div>
                </>
              )}
            </div>
          </main>
        </div>
      </div>

      <Dialog
        open={dialog.type === 'reference' && !!referenceDraft}
        title="编辑主体参考"
        description="点击卡片或悬浮按钮都会进入同一编辑弹窗。"
        onClose={() => setDialog({ type: 'none' })}
        footer={
          <>
            <button type="button" className={styles.headerBtn} onClick={() => referenceDraft && regenerateReference(referenceDraft.id)}>
              重生成
            </button>
            <button type="button" className={styles.headerBtn} onClick={() => setDialog({ type: 'none' })}>
              取消
            </button>
            <button type="button" className={styles.primaryBtn} onClick={saveReference}>保存</button>
          </>
        }
      >
        {referenceDraft ? (
          <div className="field-stack">
            <div className={styles.referenceMetaCard}>
              <span>{referenceDraft.variantLabel}</span>
              <strong>{referenceDraft.modelId}</strong>
            </div>
            <label className="field-block">
              <span>主体名称</span>
              <input className="field-input" value={referenceDraft.title} onChange={(event) => setReferenceDraft({ ...referenceDraft, title: event.target.value })} />
            </label>
            <label className="field-block">
              <span>提示词</span>
              <textarea className="field-textarea field-textarea--compact" value={referenceDraft.prompt} onChange={(event) => setReferenceDraft({ ...referenceDraft, prompt: event.target.value })} />
            </label>
            <label className="field-block">
              <span>模型</span>
              <select className="field-select" value={referenceDraft.modelId} onChange={(event) => setReferenceDraft({ ...referenceDraft, modelId: event.target.value })}>
                {REFERENCE_MODELS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
          </div>
        ) : null}
      </Dialog>

      <Dialog
        open={dialog.type === 'storyboard' && !!storyboardDraft}
        title="编辑分镜草稿"
        description="支持编辑画面描述、构图和运镜，并保留 hover 触达方式。"
        size="wide"
        onClose={() => setDialog({ type: 'none' })}
        footer={
          <>
            <button type="button" className={styles.headerBtn} onClick={() => setDialog({ type: 'none' })}>
              取消
            </button>
            <button type="button" className={styles.primaryBtn} onClick={saveStoryboard}>保存</button>
          </>
        }
      >
        {storyboardDraft ? (
          <div className="field-stack">
            <label className="field-block">
              <span>标题</span>
              <input className="field-input" value={storyboardDraft.title} onChange={(event) => setStoryboardDraft({ ...storyboardDraft, title: event.target.value })} />
            </label>
            <label className="field-block">
              <span>画面描述</span>
              <textarea className="field-textarea field-textarea--compact" value={storyboardDraft.visualPrompt} onChange={(event) => setStoryboardDraft({ ...storyboardDraft, visualPrompt: event.target.value })} />
            </label>
            <label className="field-block">
              <span>构图设计</span>
              <textarea className="field-textarea field-textarea--compact" value={storyboardDraft.compositionPrompt} onChange={(event) => setStoryboardDraft({ ...storyboardDraft, compositionPrompt: event.target.value })} />
            </label>
            <label className="field-block">
              <span>运镜调度</span>
              <textarea className="field-textarea field-textarea--compact" value={storyboardDraft.motionPrompt} onChange={(event) => setStoryboardDraft({ ...storyboardDraft, motionPrompt: event.target.value })} />
            </label>
          </div>
        ) : null}
      </Dialog>

      <Dialog
        open={dialog.type === 'delete-storyboard'}
        title="删除分镜草稿"
        description={storyboards.length <= 1 ? '当前只剩最后一条分镜，不能删除。' : plannerCopy.deleteConfirm}
        onClose={() => setDialog({ type: 'none' })}
        footer={
          <>
            <button type="button" className={styles.headerBtn} onClick={() => setDialog({ type: 'none' })}>
              取消
            </button>
            <button type="button" className={styles.primaryBtn} onClick={confirmDeleteStoryboard} disabled={storyboards.length <= 1}>
              确认删除
            </button>
          </>
        }
      >
        <p>删除后该分镜的文案与排序都需要重新确认。</p>
      </Dialog>

      <Dialog
        open={dialog.type === 'delete-reference'}
        title="删除主体参考"
        description={plannerCopy.deleteConfirm}
        onClose={() => setDialog({ type: 'none' })}
        footer={
          <>
            <button type="button" className={styles.headerBtn} onClick={() => setDialog({ type: 'none' })}>
              取消
            </button>
            <button type="button" className={styles.primaryBtn} onClick={confirmDeleteReference}>确认删除</button>
          </>
        }
      >
        <p>删除后不会自动回填到文档主体列表，需要重新补充。</p>
      </Dialog>

      <Dialog open={booting} title="正在进入分片生成" description="按照 Seko 式 boot 节奏推进工作区切换。" onClose={() => undefined}>
        <div className={styles.bootCard}>
          <div className={styles.bootDial}>
            <strong>{bootProgress}%</strong>
            <small>准备进入 Creation</small>
          </div>
          <div className={styles.progressTrack} aria-hidden="true">
            <span className={styles.progressFill} style={{ width: `${bootProgress}%` }} />
          </div>
          <p>正在提交分镜任务、锁定模型配置并切换到分片生成工作区。</p>
        </div>
      </Dialog>
    </>
  );
}
