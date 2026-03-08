'use client';

import type { PlannerStepStatus, StudioFixture } from '@aiv/domain';
import { cx } from '@aiv/ui';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { Dialog } from '@/features/shared/components/dialog';
import { plannerCopy } from '@/lib/copy';

import { sekoPlanData, type SekoActDraft, type SekoImageCard } from '../lib/seko-plan-data';
import { sekoPlanThreadData } from '../lib/seko-plan-thread-data';
import styles from './planner-page.module.css';

interface PlannerPageProps {
  studio: StudioFixture;
}

type PlannerMode = 'single' | 'series';

interface ShotPointer {
  actId: string;
  shotId: string;
}

interface ShotDraftState {
  visual: string;
  composition: string;
  motion: string;
  voice: string;
  line: string;
}

interface PlannerEpisodeDraft {
  id: string;
  label: string;
  title: string;
  summary: string;
  styleId: number;
  shotCount: number;
}

const BOOT_PROGRESS_STEPS = [28, 49, 67, 85, 100];

const STYLE_LIBRARY = [
  { id: 54, name: '韩漫二次元', tone: '高对比、硬描边、动势夸张' },
  { id: 56, name: '3D古风', tone: '三维体积光、玉石材质、大场景' },
  { id: 60, name: '岩井俊二电影', tone: '柔焦逆光、青春颗粒、空镜节奏' },
  { id: 61, name: '复古DV质感', tone: '手持晃动、磁带噪点、冷暖漂移' },
  { id: 76, name: '未来主义', tone: '冷色金属、霓虹反射、高速运镜' },
];

const DOC_TOC = [
  { id: 'doc-summary', title: '故事梗概' },
  { id: 'doc-style', title: '美术风格' },
  { id: 'doc-subjects', title: '主体列表' },
  { id: 'doc-scenes', title: '场景列表' },
  { id: 'doc-script', title: '分镜剧本' },
];

const SUBJECT_IMAGE_POOL = sekoPlanData.subjects.map((item) => item.image);
const SCENE_IMAGE_POOL = sekoPlanData.scenes.map((item) => item.image);
const SEKO_ASSISTANT_NAME = 'Seko';
const SUBJECT_TONE_LABEL = '不羁青年';
const SUBJECT_TONE_META = '男性/青年/普通话';

function nextLocalId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

function styleById(styleId: number) {
  return STYLE_LIBRARY.find((item) => item.id === styleId) ?? STYLE_LIBRARY[0];
}

function cloneImageCards(cards: SekoImageCard[]) {
  return cards.map((item) => ({ ...item }));
}

function cloneActs(acts: SekoActDraft[]) {
  return acts.map((act) => ({
    ...act,
    shots: act.shots.map((shot) => ({ ...shot })),
  }));
}

function nextImageFromPool(current: string, pool: string[]) {
  if (!pool.length) {
    return current;
  }

  const index = pool.indexOf(current);
  const nextIndex = index === -1 ? 0 : (index + 1) % pool.length;
  return pool[nextIndex];
}

function buildPlannerEpisodes(title: string, mode: PlannerMode, brief: string): PlannerEpisodeDraft[] {
  const baseTitle = title.slice(0, 18) || '霓虹代码：神秘U盘';
  const shotTotal = sekoPlanData.acts.reduce((sum, item) => sum + item.shots.length, 0);

  if (mode === 'single') {
    return [
      {
        id: 'episode-1',
        label: 'EP 01',
        title: sekoPlanData.episodeTitle,
        summary: '单片模式，全部分镜围绕一条主线推进。',
        styleId: 61,
        shotCount: shotTotal,
      },
    ];
  }

  return Array.from({ length: sekoPlanData.episodeCount }, (_item, index) => ({
    id: `episode-${index + 1}`,
    label: `EP ${String(index + 1).padStart(2, '0')}`,
    title: index === 0 ? sekoPlanData.episodeTitle : `${baseTitle}·待策划`,
    summary: index === 0 ? brief || '负责开场设定与情绪入场。' : '待补充当前集剧情摘要。',
    styleId: index === 0 ? 61 : 56,
    shotCount: index === 0 ? shotTotal : 0,
  }));
}

export function PlannerPage({ studio }: PlannerPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const timersRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const hasHydratedFromSearchRef = useRef(false);

  const sekoProjectTitle = useMemo(() => {
    const nameLine = sekoPlanThreadData.sections[0]?.lines.find((item) => item.includes('剧集名称'));
    if (!nameLine) {
      return sekoPlanData.projectTitle || studio.project.title;
    }

    const match = nameLine.match(/《(.+?)》/);
    return match?.[1] ?? sekoPlanData.projectTitle ?? studio.project.title;
  }, [studio.project.title]);

  const initialMode: PlannerMode = studio.project.contentMode === 'series' ? 'series' : 'single';
  const initialEpisodes = buildPlannerEpisodes(sekoProjectTitle, initialMode, studio.project.brief);

  const [displayTitle, setDisplayTitle] = useState(sekoProjectTitle);
  const [plannerMode, setPlannerMode] = useState<PlannerMode>(initialMode);
  const [plannerEpisodes, setPlannerEpisodes] = useState(initialEpisodes);
  const [activeEpisodeId, setActiveEpisodeId] = useState(initialEpisodes[0]?.id ?? 'episode-1');

  const [aspectRatio, setAspectRatio] = useState(studio.project.aspectRatio);
  const [globalStyleId, setGlobalStyleId] = useState(initialEpisodes[0]?.styleId ?? 61);

  const [requirement, setRequirement] = useState('');
  const [messages, setMessages] = useState([
    { id: 'seko-user-1', role: 'user' as const, content: sekoPlanThreadData.userPrompt },
    { id: 'seko-assistant-1', role: 'assistant' as const, content: `${sekoPlanThreadData.assistantSummary}\n\n${sekoPlanThreadData.assistantPrompt}` },
    { id: 'seko-user-2', role: 'user' as const, content: sekoPlanThreadData.confirmPrompt },
    { id: 'seko-assistant-2', role: 'assistant' as const, content: sekoPlanThreadData.refinementReply },
  ]);
  const [steps, setSteps] = useState(studio.planner.steps);
  const [storyboards] = useState(studio.planner.storyboards);

  const [status, setStatus] = useState(studio.planner.status);
  const [docProgressPercent, setDocProgressPercent] = useState(studio.planner.docProgressPercent);
  const [remainingPoints, setRemainingPoints] = useState(studio.creation.points);
  const [notice, setNotice] = useState<string | null>(null);

  const [subjectCards, setSubjectCards] = useState<SekoImageCard[]>(() => cloneImageCards(sekoPlanData.subjects));
  const [sceneCards, setSceneCards] = useState<SekoImageCard[]>(() => cloneImageCards(sekoPlanData.scenes));
  const [scriptActs, setScriptActs] = useState<SekoActDraft[]>(() => cloneActs(sekoPlanData.acts));
  const [subjectDialogCardId, setSubjectDialogCardId] = useState<string | null>(null);
  const [subjectNameDraft, setSubjectNameDraft] = useState('');
  const [subjectPromptDraft, setSubjectPromptDraft] = useState('');
  const [subjectImageDraft, setSubjectImageDraft] = useState('');
  const [subjectAdjustMode, setSubjectAdjustMode] = useState<'upload' | 'ai'>('ai');
  const [sceneDialogCardId, setSceneDialogCardId] = useState<string | null>(null);
  const [sceneNameDraft, setSceneNameDraft] = useState('');
  const [scenePromptDraft, setScenePromptDraft] = useState('');
  const [sceneImageDraft, setSceneImageDraft] = useState('');
  const [sceneAdjustMode, setSceneAdjustMode] = useState<'upload' | 'ai'>('ai');
  const [editingShot, setEditingShot] = useState<ShotPointer | null>(null);
  const [shotDraft, setShotDraft] = useState<ShotDraftState | null>(null);
  const [shotDeleteDialog, setShotDeleteDialog] = useState<ShotPointer | null>(null);

  const [booting, setBooting] = useState(false);
  const [bootProgress, setBootProgress] = useState(0);

  const ready = status === 'ready';
  const activeEpisode = useMemo(() => plannerEpisodes.find((item) => item.id === activeEpisodeId) ?? plannerEpisodes[0] ?? null, [plannerEpisodes, activeEpisodeId]);
  const activeStyle = styleById(activeEpisode?.styleId ?? globalStyleId);
  const activeEpisodeNumber = Number.parseInt(activeEpisode?.label.replace('EP ', '') ?? '1', 10);
  const pointCost = sekoPlanData.pointCost;
  const activeSubjectCard = useMemo(() => {
    if (!subjectDialogCardId) {
      return null;
    }

    return subjectCards.find((item) => item.id === subjectDialogCardId) ?? null;
  }, [subjectCards, subjectDialogCardId]);
  const activeSceneCard = useMemo(() => {
    if (!sceneDialogCardId) {
      return null;
    }

    return sceneCards.find((item) => item.id === sceneDialogCardId) ?? null;
  }, [sceneCards, sceneDialogCardId]);
  const deletingShot = useMemo(() => {
    if (!shotDeleteDialog) {
      return null;
    }

    const act = scriptActs.find((item) => item.id === shotDeleteDialog.actId);
    const shot = act?.shots.find((item) => item.id === shotDeleteDialog.shotId);

    return shot ?? null;
  }, [scriptActs, shotDeleteDialog]);
  const refinementDetailSteps = useMemo(
    () =>
      sekoPlanThreadData.refinementSteps.map((title, index) => ({
        title,
        status: steps[index]?.status ?? ('done' as PlannerStepStatus),
        tags: index === 2 ? ['设计角色特征'] : index === 3 ? ['设计短片主要场景细节'] : [],
      })),
    [steps],
  );

  useEffect(() => {
    return () => {
      timersRef.current.forEach((timer) => clearTimeout(timer));
    };
  }, []);

  useEffect(() => {
    if (!plannerEpisodes.some((item) => item.id === activeEpisodeId)) {
      setActiveEpisodeId(plannerEpisodes[0]?.id ?? 'episode-1');
    }
  }, [activeEpisodeId, plannerEpisodes]);

  useEffect(() => {
    if (hasHydratedFromSearchRef.current) {
      return;
    }

    const incomingPrompt = searchParams.get('prompt')?.trim();
    const incomingTitle = searchParams.get('title')?.trim();
    const incomingMode = searchParams.get('storyMode');

    if (!incomingPrompt && !incomingTitle && !incomingMode) {
      return;
    }

    hasHydratedFromSearchRef.current = true;

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
      const nextEpisodes = buildPlannerEpisodes(incomingTitle ?? displayTitle, incomingMode, studio.project.brief);
      setPlannerMode(incomingMode);
      setPlannerEpisodes(nextEpisodes);
      setActiveEpisodeId(nextEpisodes[0]?.id ?? 'episode-1');
      setGlobalStyleId(nextEpisodes[0]?.styleId ?? 61);
    }
  }, [displayTitle, searchParams, studio.project.brief]);

  const handlePlannerModeChange = (nextMode: PlannerMode) => {
    if (nextMode === plannerMode) {
      return;
    }

    const nextEpisodes = buildPlannerEpisodes(displayTitle, nextMode, studio.project.brief);
    setPlannerMode(nextMode);
    setPlannerEpisodes(nextEpisodes);
    setActiveEpisodeId(nextEpisodes[0]?.id ?? 'episode-1');
    setGlobalStyleId(nextEpisodes[0]?.styleId ?? 61);
    setNotice(nextMode === 'single' ? '已切换为单片模式。' : '已切换为多剧集模式。');
  };

  const addEpisode = () => {
    if (plannerMode === 'single') {
      setNotice('单片模式下不能新增剧集，请先切换到多剧集模式。');
      return;
    }

    setPlannerEpisodes((current) => {
      const sequence = current.length + 1;
      const next = [
        ...current,
        {
          id: nextLocalId('episode'),
          label: `EP ${String(sequence).padStart(2, '0')}`,
          title: `第 ${sequence} 集：新篇章`,
          summary: '补充当前集剧情摘要、关键情绪与动作节点。',
          styleId: globalStyleId,
          shotCount: Math.max(storyboards.length, 3),
        },
      ];

      return next.map((episode, index) => ({
        ...episode,
        label: `EP ${String(index + 1).padStart(2, '0')}`,
      }));
    });
  };

  const runPlanner = () => {
    const trimmed = requirement.trim();

    if (!trimmed) {
      setNotice('请输入需求后再提交。');
      return;
    }

    timersRef.current.forEach((timer) => clearTimeout(timer));
    timersRef.current = [];

    setStatus('updating');
    setDocProgressPercent(10);
    setNotice(null);

    setDisplayTitle(trimmed.slice(0, 30));
    setMessages((current) => [
      ...current,
      { id: nextLocalId('msg'), role: 'user', content: trimmed },
      { id: nextLocalId('msg'), role: 'assistant', content: plannerCopy.assistantWorking },
    ]);

    setSteps((current) =>
      current.map((step, index) => ({
        ...step,
        status: (index === 0 ? 'running' : 'waiting') as PlannerStepStatus,
      })),
    );

    studio.planner.steps.forEach((_item, index) => {
      const startTimer = setTimeout(() => {
        setSteps((current) =>
          current.map((step, stepIndex) => {
            if (stepIndex < index) {
              return { ...step, status: 'done' as PlannerStepStatus };
            }
            if (stepIndex === index) {
              return { ...step, status: 'running' as PlannerStepStatus };
            }
            return { ...step, status: 'waiting' as PlannerStepStatus };
          }),
        );
        setDocProgressPercent(Math.min(90, 25 + index * 18));
      }, index * 520);

      timersRef.current.push(startTimer);
    });

    const doneTimer = setTimeout(() => {
      setStatus('ready');
      setDocProgressPercent(100);
      setSteps((current) => current.map((step) => ({ ...step, status: 'done' as PlannerStepStatus })));
      setMessages((current) => [...current, { id: nextLocalId('msg'), role: 'assistant', content: plannerCopy.assistantReady }]);
      setPlannerEpisodes((current) =>
        current.map((episode) =>
          episode.id === activeEpisodeId
            ? {
                ...episode,
                title: trimmed.slice(0, 18),
                summary: `${trimmed.slice(0, 52)}，并在每个镜头中保持情绪推进。`,
              }
            : episode,
        ),
      );
      setNotice('策划文档已刷新。');
    }, studio.planner.steps.length * 520 + 320);

    timersRef.current.push(doneTimer);
  };

  const openSubjectAdjustDialog = (cardId: string) => {
    const target = subjectCards.find((item) => item.id === cardId);
    if (!target) {
      return;
    }

    setSubjectDialogCardId(cardId);
    setSubjectNameDraft(target.title);
    setSubjectPromptDraft(target.prompt);
    setSubjectImageDraft(target.image);
    setSubjectAdjustMode('ai');
  };

  const closeSubjectAdjustDialog = () => {
    setSubjectDialogCardId(null);
    setSubjectNameDraft('');
    setSubjectPromptDraft('');
    setSubjectImageDraft('');
    setSubjectAdjustMode('ai');
  };

  const applySubjectAdjust = () => {
    if (!subjectDialogCardId) {
      return;
    }

    setSubjectCards((current) =>
      current.map((item) =>
        item.id === subjectDialogCardId
          ? {
              ...item,
              title: subjectNameDraft.trim() || item.title,
              prompt: subjectPromptDraft.trim() || item.prompt,
              image: subjectImageDraft || item.image,
            }
          : item,
      ),
    );
    setNotice('主体图片已更新。');
    closeSubjectAdjustDialog();
  };

  const openSceneAdjustDialog = (cardId: string) => {
    const target = sceneCards.find((item) => item.id === cardId);
    if (!target) {
      return;
    }

    setSceneDialogCardId(cardId);
    setSceneNameDraft(target.title);
    setScenePromptDraft(target.prompt);
    setSceneImageDraft(target.image);
    setSceneAdjustMode('ai');
  };

  const closeSceneAdjustDialog = () => {
    setSceneDialogCardId(null);
    setSceneNameDraft('');
    setScenePromptDraft('');
    setSceneImageDraft('');
    setSceneAdjustMode('ai');
  };

  const applySceneAdjust = () => {
    if (!sceneDialogCardId) {
      return;
    }

    setSceneCards((current) =>
      current.map((item) =>
        item.id === sceneDialogCardId
          ? {
              ...item,
              title: sceneNameDraft.trim() || item.title,
              prompt: scenePromptDraft.trim() || item.prompt,
              image: sceneImageDraft || item.image,
            }
          : item,
      ),
    );
    setNotice('场景图片已更新。');
    closeSceneAdjustDialog();
  };

  const openShotInlineEditor = (actId: string, shotId: string) => {
    const act = scriptActs.find((item) => item.id === actId);
    const shot = act?.shots.find((item) => item.id === shotId);
    if (!shot) {
      return;
    }

    setEditingShot({ actId, shotId });
    setShotDraft({
      visual: shot.visual,
      composition: shot.composition,
      motion: shot.motion,
      voice: shot.voice,
      line: shot.line,
    });
  };

  const cancelShotInlineEditor = () => {
    setEditingShot(null);
    setShotDraft(null);
  };

  const applyShotInlineEditor = () => {
    if (!editingShot || !shotDraft) {
      return;
    }

    setScriptActs((current) =>
      current.map((act) => {
        if (act.id !== editingShot.actId) {
          return act;
        }

        return {
          ...act,
          shots: act.shots.map((shot) => (shot.id === editingShot.shotId ? { ...shot, ...shotDraft } : shot)),
        };
      }),
    );
    setNotice('分镜内容已更新。');
    cancelShotInlineEditor();
  };

  const openShotDeleteDialog = (actId: string, shotId: string) => {
    setShotDeleteDialog({ actId, shotId });
  };

  const closeShotDeleteDialog = () => {
    setShotDeleteDialog(null);
  };

  const confirmDeleteShot = () => {
    if (!shotDeleteDialog) {
      return;
    }

    if (editingShot?.actId === shotDeleteDialog.actId && editingShot.shotId === shotDeleteDialog.shotId) {
      cancelShotInlineEditor();
    }

    setScriptActs((current) =>
      current.map((act) => {
        if (act.id !== shotDeleteDialog.actId) {
          return act;
        }

        return {
          ...act,
          shots: act.shots.filter((shot) => shot.id !== shotDeleteDialog.shotId),
        };
      }),
    );
    setNotice('分镜已删除。');
    closeShotDeleteDialog();
  };

  const startCreation = () => {
    if (!ready) {
      setNotice('文档仍在更新，完成后才能生成分镜。');
      return;
    }

    if (!scriptActs.some((act) => act.shots.length > 0)) {
      setNotice('当前还没有可生成的分镜草稿。');
      return;
    }

    if (remainingPoints < pointCost) {
      setNotice('积分不足，无法生成分镜。');
      return;
    }

    setBooting(true);
    setBootProgress(0);
    setRemainingPoints((current) => current - pointCost);

    BOOT_PROGRESS_STEPS.forEach((value, index) => {
      const timer = setTimeout(() => setBootProgress(value), index * 180);
      timersRef.current.push(timer);
    });

    const navigationTimer = setTimeout(() => {
      router.push(`/projects/${studio.project.id}/creation`);
    }, BOOT_PROGRESS_STEPS.length * 180 + 160);

    timersRef.current.push(navigationTimer);
  };

  return (
    <>
      <div className={styles.page}>
        <header className={styles.topBar}>
          <div className={styles.projectIdentity}>
            <span className={styles.projectTag}>策划页</span>
            <h1>{displayTitle}</h1>
            <p>{studio.project.brief}</p>
          </div>

          <div className={styles.topActions}>
            <div className={styles.modeSwitch}>
              <button type="button" className={cx(styles.modeButton, plannerMode === 'single' && styles.modeButtonActive)} onClick={() => handlePlannerModeChange('single')}>
                单片模式
              </button>
              <button type="button" className={cx(styles.modeButton, plannerMode === 'series' && styles.modeButtonActive)} onClick={() => handlePlannerModeChange('series')}>
                多剧集模式
              </button>
            </div>

            <button type="button" className={styles.topGhostButton} onClick={() => router.push('/explore')}>
              返回广场
            </button>
          </div>
        </header>

        <div className={styles.workspace}>
          <section className={styles.leftPanel}>
            <div className={cx(styles.leftPanelInner, plannerMode === 'single' && styles.leftPanelSingle)}>
              {plannerMode === 'series' ? (
                <aside className={styles.episodeRail}>
                  <h2>剧集</h2>
                  <div className={styles.episodeList}>
                    {plannerEpisodes.map((episode, index) => {
                      const active = episode.id === activeEpisodeId;

                      return (
                        <button
                          key={episode.id}
                          type="button"
                          className={cx(styles.episodeButton, active && styles.episodeButtonActive)}
                          onClick={() => {
                            setActiveEpisodeId(episode.id);
                            setGlobalStyleId(episode.styleId);
                          }}
                          aria-label={`切换到 ${episode.label}`}
                          title={`${episode.title} · ${episode.shotCount} 镜头`}
                        >
                          {String(index + 1).padStart(2, '0')}
                        </button>
                      );
                    })}
                  </div>
                  <button type="button" className={styles.episodeAddButton} onClick={addEpisode} aria-label="新增剧集">
                    +
                  </button>
                </aside>
              ) : null}

              <div className={styles.commandColumn}>
                <div className={styles.messageScroll}>
                  <article className={cx(styles.messageRow, styles.messageRowUser)}>
                    <p className={cx(styles.messageBubble, styles.messageBubbleUser)}>{sekoPlanThreadData.userPrompt}</p>
                  </article>

                  <article className={styles.assistantThread}>
                    <header className={styles.messageAgentHeader}>
                      <span className={styles.messageAgentMark}>S</span>
                      <span>{SEKO_ASSISTANT_NAME}</span>
                    </header>

                    <article className={styles.llmStepCard}>
                      <div className={styles.threadStepItem}>
                        <span className={styles.threadStepDot}>✓</span>
                        <strong>策划剧本大纲</strong>
                      </div>
                    </article>

                    <article className={styles.outlineCard}>
                      <h4>{sekoPlanThreadData.outlineTitle}</h4>
                      {sekoPlanThreadData.sections.map((section) => (
                        <section key={section.title} className={styles.outlineSection}>
                          <h5>{section.title}</h5>
                          <ul>
                            {section.lines.map((line, index) => (
                              <li key={`${section.title}-${index}`}>{line}</li>
                            ))}
                          </ul>
                        </section>
                      ))}
                    </article>

                    <p className={styles.messageBubble}>{sekoPlanThreadData.assistantSummary}</p>
                    <p className={styles.messageBubble}>{sekoPlanThreadData.assistantPrompt}</p>
                  </article>

                  <article className={cx(styles.messageRow, styles.messageRowUser)}>
                    <p className={cx(styles.messageBubble, styles.messageBubbleUser)}>{sekoPlanThreadData.confirmPrompt}</p>
                  </article>

                  <article className={styles.assistantThread}>
                    <header className={styles.messageAgentHeader}>
                      <span className={styles.messageAgentMark}>S</span>
                      <span>{SEKO_ASSISTANT_NAME}</span>
                    </header>

                    <article className={styles.llmStepCard}>
                      <div className={styles.threadStepItem}>
                        <span className={styles.threadStepDot}>✓</span>
                        <strong>细化剧情内容</strong>
                      </div>
                    </article>

                    <p className={styles.messageBubble}>{sekoPlanThreadData.refinementReply}</p>

                    <article className={styles.docStepsCard}>
                      {refinementDetailSteps.map((step, index) => (
                        <div key={step.title} className={styles.docStepItem}>
                          <span className={cx(styles.docStepDot, step.status === 'done' && styles.docStepDotDone, step.status === 'running' && styles.docStepDotRunning)} />
                          {index < refinementDetailSteps.length - 1 ? <span className={styles.docStepConnector} /> : null}
                          <div className={styles.docStepBody}>
                            <strong>{step.title}</strong>
                            {step.tags.length ? (
                              <div className={styles.docStepTags}>
                                {step.tags.map((tag) => (
                                  <span key={`${step.title}-${tag}`} className={styles.docStepTag}>
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </article>

                    <article className={styles.threadNoticeCard}>
                      <strong>{activeEpisode?.title ?? sekoPlanData.episodeTitle}</strong>
                      <p>我已按照您的要求完成策划并将内容更新到您右侧的策划文档。</p>
                    </article>
                  </article>

                  {messages.slice(4).map((item) => {
                    const isUser = item.role === 'user';

                    return (
                      <article key={item.id} className={cx(styles.messageRow, isUser && styles.messageRowUser)}>
                        {!isUser ? <span className={styles.messageAuthor}>{studio.assistantName}</span> : null}
                        <p className={cx(styles.messageBubble, isUser && styles.messageBubbleUser)}>{item.content}</p>
                      </article>
                    );
                  })}
                </div>

                <div className={styles.composerWrap}>
                  <form
                    className={styles.composer}
                    onSubmit={(event) => {
                      event.preventDefault();
                      runPlanner();
                    }}
                  >
                    <textarea
                      className={styles.composerTextarea}
                      value={requirement}
                      onChange={(event) => setRequirement(event.target.value)}
                      placeholder="输入你的问题，Shift+Enter换行"
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' && !event.shiftKey) {
                          event.preventDefault();
                          runPlanner();
                        }
                      }}
                    />

                    <div className={styles.composerBottom}>
                      <span>按 Enter 提交，Shift+Enter 换行</span>
                      <button type="submit" disabled={!requirement.trim() || status === 'updating'}>
                        发送
                      </button>
                    </div>
                  </form>

                  {notice ? <p className={styles.notice}>{notice}</p> : null}
                </div>
              </div>
            </div>
          </section>

          <section className={styles.rightPanel}>
            <header className={styles.resultHeader}>
              <div className={styles.resultTitleWrap}>
                <h2>
                  第{Number.isNaN(activeEpisodeNumber) ? 1 : activeEpisodeNumber}集：{activeEpisode?.title ?? sekoPlanData.episodeTitle}
                </h2>
                <p>内容由 AI 生成</p>
              </div>

              <button type="button" className={styles.historyButton} onClick={runPlanner} aria-label="历史版本">
                <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path
                    d="M10 3.5a6.5 6.5 0 1 1-5.946 3.875"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path d="M2.75 5.25v3.1h3.1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M10 6.4v3.7l2.7 1.45" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </header>

            <div className={styles.resultContent}>
              <div className={styles.documentContainer}>
                <section id="doc-summary" className={styles.docSection}>
                  <h3 className={styles.sectionTitle}>故事梗概</h3>
                  <ul>
                    {sekoPlanData.summaryBullets.map((line, index) => (
                      <li key={`summary-${index}`}>{line}</li>
                    ))}
                  </ul>
                  <div className={styles.highlightCard}>
                    <strong>剧本亮点</strong>
                    <ul>
                      {sekoPlanData.highlights.map((item) => (
                        <li key={item.title}>
                          <span>{item.title}</span>
                          {item.description}
                        </li>
                      ))}
                    </ul>
                  </div>
                </section>

                <section id="doc-style" className={styles.docSection}>
                  <h3 className={styles.sectionTitle}>美术风格</h3>
                  <ul>
                    {sekoPlanData.styleBullets.map((line, index) => (
                      <li key={`style-${index}`}>{line}</li>
                    ))}
                  </ul>
                  <p className={styles.styleHint}>当前执行风格：{activeStyle.name} · {activeStyle.tone}</p>
                </section>

                <section id="doc-subjects" className={styles.docSection}>
                  <h3 className={styles.sectionTitle}>主体列表</h3>
                  <ul>
                    {sekoPlanData.subjectBullets.map((line, index) => (
                      <li key={`subject-line-${index}`}>{line}</li>
                    ))}
                  </ul>

                  <div className={styles.subjectStrip}>
                    {subjectCards.map((item) => (
                      <article key={item.id} className={styles.subjectCard} onClick={() => openSubjectAdjustDialog(item.id)} role="button" tabIndex={0}>
                        <button
                          type="button"
                          className={styles.cardHoverIconButton}
                          onClick={(event) => {
                            event.stopPropagation();
                            openSubjectAdjustDialog(item.id);
                          }}
                          aria-label={`调整 ${item.title}`}
                        >
                          <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                            <path stroke="currentColor" strokeWidth="1.25" d="M14.049 4.354a1.147 1.147 0 0 1 1.621 0l.811.81a1.147 1.147 0 0 1 0 1.622L6.075 17.192a.46.46 0 0 1-.325.135H3.967a.46.46 0 0 1-.459-.459v-1.784c0-.121.048-.238.134-.324z" />
                            <path fill="currentColor" d="M14.049 4.354a1.147 1.147 0 0 1 1.621 0l.811.81a1.147 1.147 0 0 1 0 1.622l-2.108 2.108c-.18.18-.47.18-.649 0l-1.783-1.783a.46.46 0 0 1 0-.65z" />
                          </svg>
                        </button>
                        <img src={item.image} alt={item.prompt || item.title} loading="lazy" />
                        <div className={styles.subjectCardMeta}>
                          <strong>{item.title}</strong>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>

                <section id="doc-scenes" className={styles.docSection}>
                  <h3 className={styles.sectionTitle}>场景列表</h3>
                  <ul>
                    {sekoPlanData.sceneBullets.map((line, index) => (
                      <li key={`scene-line-${index}`}>{line}</li>
                    ))}
                  </ul>

                  <div className={styles.sceneStrip}>
                    {sceneCards.map((item) => (
                      <article key={item.id} className={styles.sceneThumbCard} onClick={() => openSceneAdjustDialog(item.id)} role="button" tabIndex={0}>
                        <button
                          type="button"
                          className={styles.cardHoverIconButton}
                          onClick={(event) => {
                            event.stopPropagation();
                            openSceneAdjustDialog(item.id);
                          }}
                          aria-label={`调整 ${item.title}`}
                        >
                          <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                            <path stroke="currentColor" strokeWidth="1.25" d="M14.049 4.354a1.147 1.147 0 0 1 1.621 0l.811.81a1.147 1.147 0 0 1 0 1.622L6.075 17.192a.46.46 0 0 1-.325.135H3.967a.46.46 0 0 1-.459-.459v-1.784c0-.121.048-.238.134-.324z" />
                            <path fill="currentColor" d="M14.049 4.354a1.147 1.147 0 0 1 1.621 0l.811.81a1.147 1.147 0 0 1 0 1.622l-2.108 2.108c-.18.18-.47.18-.649 0l-1.783-1.783a.46.46 0 0 1 0-.65z" />
                          </svg>
                        </button>
                        <img src={item.image} alt={item.prompt || item.title} loading="lazy" />
                        <div className={styles.sceneCardMeta}>
                          <strong>{item.title}</strong>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>

                <section id="doc-script" className={styles.docSection}>
                  <h3 className={styles.sectionTitle}>分镜剧本</h3>

                  <div className={styles.scriptSummaryCard}>
                    <strong>剧本摘要</strong>
                    <ul>
                      {sekoPlanData.scriptSummary.map((line, index) => (
                        <li key={`script-summary-${index}`}>{line}</li>
                      ))}
                      <li>总分镜数：{scriptActs.reduce((sum, act) => sum + act.shots.length, 0)}</li>
                    </ul>
                  </div>

                  <div className={styles.actStack}>
                    {scriptActs.map((act, actIndex) => (
                      <section key={act.id} className={styles.actSection}>
                        <header className={styles.actHeader}>
                          <strong>
                            {act.title}：{sceneCards[actIndex]?.title ?? `场景 ${actIndex + 1}`}
                          </strong>
                          <span>
                            {act.time || '夜晚'} · {act.location || '室外'}
                          </span>
                        </header>

                        <div className={styles.scriptList}>
                          {act.shots.map((shot) => {
                            const isEditingShot = editingShot?.actId === act.id && editingShot?.shotId === shot.id;

                            return (
                              <article key={shot.id} className={cx(styles.scriptCard, styles.scriptShotCard, isEditingShot && styles.scriptShotCardEditing)}>
                                <p className={styles.shotTitleLine}>
                                  <span>{shot.title}</span>
                                </p>
                                <ul className={styles.shotPreviewList}>
                                  <li>
                                    <span>画面描述</span>
                                    {isEditingShot && shotDraft ? (
                                      <textarea
                                        className={styles.shotInlineTextarea}
                                        value={shotDraft.visual}
                                        onChange={(event) => setShotDraft((current) => (current ? { ...current, visual: event.target.value } : current))}
                                      />
                                    ) : (
                                      <p className={styles.shotValueText}>{shot.visual}</p>
                                    )}
                                  </li>
                                  <li>
                                    <span>构图设计</span>
                                    {isEditingShot && shotDraft ? (
                                      <textarea
                                        className={styles.shotInlineTextarea}
                                        value={shotDraft.composition}
                                        onChange={(event) => setShotDraft((current) => (current ? { ...current, composition: event.target.value } : current))}
                                      />
                                    ) : (
                                      <p className={styles.shotValueText}>{shot.composition}</p>
                                    )}
                                  </li>
                                  <li>
                                    <span>运镜调度</span>
                                    {isEditingShot && shotDraft ? (
                                      <textarea
                                        className={styles.shotInlineTextarea}
                                        value={shotDraft.motion}
                                        onChange={(event) => setShotDraft((current) => (current ? { ...current, motion: event.target.value } : current))}
                                      />
                                    ) : (
                                      <p className={styles.shotValueText}>{shot.motion}</p>
                                    )}
                                  </li>
                                  <li>
                                    <span>配音角色</span>
                                    <p className={styles.shotValueText}>{shot.voice}</p>
                                  </li>
                                  <li>
                                    <span>台词内容</span>
                                    {isEditingShot && shotDraft ? (
                                      <textarea
                                        className={styles.shotInlineTextarea}
                                        value={shotDraft.line}
                                        onChange={(event) => setShotDraft((current) => (current ? { ...current, line: event.target.value } : current))}
                                      />
                                    ) : (
                                      <p className={styles.shotValueText}>{shot.line}</p>
                                    )}
                                  </li>
                                </ul>

                                <div className={cx(styles.shotActionButtons, isEditingShot && styles.shotActionButtonsEditing)}>
                                  {isEditingShot ? (
                                    <>
                                      <button type="button" className={styles.shotCancelButton} onClick={cancelShotInlineEditor}>
                                        取消
                                      </button>
                                      <button type="button" className={styles.shotSaveButton} onClick={applyShotInlineEditor}>
                                        保存
                                      </button>
                                    </>
                                  ) : (
                                    <>
                                      <button type="button" className={styles.shotIconButton} onClick={() => openShotDeleteDialog(act.id, shot.id)} aria-label={`删除 ${shot.title}`}>
                                        <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                                          <path
                                            fill="currentColor"
                                            d="M3.196 3.73a.68.68 0 1 0 0 1.362V3.73M16.41 5.092a.68.68 0 1 0 0-1.362v1.362M9.216 6.667a.68.68 0 1 0-1.362 0h1.361M7.854 13.91a.68.68 0 1 0 1.362 0H7.855m4.473-7.244a.68.68 0 1 0-1.362 0h1.361m-1.362 7.244a.68.68 0 1 0 1.362 0h-1.361m-5.794-9.5h-.68l-.002 11.45h.68l.681.001.002-11.45zm.665 12.118v.68h8.319v-1.361H5.836zm8.985-.667h.68V4.412h-1.36v11.45zM7.294 3.195v.681h5.017V2.515H7.294zm1.241 3.472h-.68v7.244h1.36V6.667zm3.111 0h-.68v7.244h1.36V6.667zM3.196 4.41v.681H6.96V3.73H3.196zM6.96 3.53h-.68v.882H7.64V3.53zm0 .882v.681h5.685V3.73H6.96zm5.685 0v.681h3.764V3.73h-3.764zm0-.882h-.681v.882h1.361V3.53zm-.334-.334v.681a.347.347 0 0 1-.347-.347h1.361c0-.56-.454-1.014-1.014-1.014zm1.844 13.334v.68c.744 0 1.347-.603 1.347-1.347H14.14v-.002l.002-.004q0-.003.003-.004l.004-.003h.003l.002-.001zM7.294 3.195v-.68c-.56 0-1.015.454-1.015 1.014h1.362a.347.347 0 0 1-.347.347zM5.169 15.862h-.68c0 .744.603 1.347 1.347 1.347v-1.361h.002l.004.001.004.003.003.004.001.006z"
                                          />
                                        </svg>
                                      </button>
                                      <button type="button" className={styles.shotIconButton} onClick={() => openShotInlineEditor(act.id, shot.id)} aria-label={`编辑 ${shot.title}`}>
                                        <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                                          <path stroke="currentColor" strokeWidth="1.25" d="M14.049 4.354a1.147 1.147 0 0 1 1.621 0l.811.81a1.147 1.147 0 0 1 0 1.622L6.075 17.192a.46.46 0 0 1-.325.135H3.967a.46.46 0 0 1-.459-.459v-1.784c0-.121.048-.238.134-.324z" />
                                          <path fill="currentColor" d="M14.049 4.354a1.147 1.147 0 0 1 1.621 0l.811.81a1.147 1.147 0 0 1 0 1.622l-2.108 2.108c-.18.18-.47.18-.649 0l-1.783-1.783a.46.46 0 0 1 0-.65z" />
                                        </svg>
                                      </button>
                                    </>
                                  )}
                                </div>
                              </article>
                            );
                          })}
                        </div>
                      </section>
                    ))}
                  </div>
                </section>
              </div>

              <aside className={styles.tocRail} aria-label="文档目录">
                <ul className={styles.tocMiniList}>
                  {DOC_TOC.map((item, index) => (
                    <li key={`mini-${item.id}`}>
                      <a href={`#${item.id}`} className={cx(styles.tocMiniItem, index === 0 && styles.tocMiniItemActive)} aria-label={item.title}>
                        <span className={styles.tocMiniLine} />
                      </a>
                    </li>
                  ))}
                </ul>

                <nav className={styles.tocPopover}>
                  {DOC_TOC.map((item, index) => (
                    <a key={item.id} href={`#${item.id}`} className={cx(styles.tocItem, index === 0 && styles.tocItemActive)}>
                      <span className={styles.tocLine} />
                      <span className={styles.tocText}>{item.title}</span>
                    </a>
                  ))}
                </nav>
              </aside>
            </div>

            <footer className={styles.resultFooter}>
              <div className={styles.footerSelectors}>
                <label>
                  <span>分镜图模型</span>
                  <select value={globalStyleId} onChange={(event) => setGlobalStyleId(Number(event.target.value))}>
                    {STYLE_LIBRARY.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <span>画面比例</span>
                  <select value={aspectRatio} onChange={(event) => setAspectRatio(event.target.value as typeof aspectRatio)}>
                    <option value="9:16">9:16</option>
                    <option value="16:9">16:9</option>
                    <option value="1:1">1:1</option>
                  </select>
                </label>
              </div>

              <button type="button" className={styles.generateButton} onClick={startCreation}>
                生成分镜 · {pointCost}
              </button>
            </footer>
          </section>
        </div>
      </div>

      {subjectDialogCardId && activeSubjectCard ? (
        <div className={styles.assetModalBackdrop} role="presentation" onClick={closeSubjectAdjustDialog}>
          <section className={styles.assetModal} role="dialog" aria-modal="true" aria-label="编辑主体" onClick={(event) => event.stopPropagation()}>
            <header className={styles.assetModalHeader}>
              <h3>编辑主体</h3>
              <button type="button" className={styles.assetModalClose} onClick={closeSubjectAdjustDialog} aria-label="关闭">
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <path d="m6 6 12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </header>

            <div className={styles.assetModalBody}>
              <div className={styles.assetPreviewPane}>
                <img src={subjectImageDraft || activeSubjectCard.image} alt={activeSubjectCard.title} />
                <div className={styles.assetThumbRow}>
                  {SUBJECT_IMAGE_POOL.slice(0, 5).map((image) => (
                    <button
                      key={`subject-thumb-${image}`}
                      type="button"
                      className={cx(styles.assetThumbButton, (subjectImageDraft || activeSubjectCard.image) === image && styles.assetThumbButtonActive)}
                      onClick={() => setSubjectImageDraft(image)}
                    >
                      <img src={image} alt="主体参考图" />
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.assetFormPane}>
                <label className={styles.assetField}>
                  <span>名称</span>
                  <input value={subjectNameDraft} onChange={(event) => setSubjectNameDraft(event.target.value)} disabled />
                </label>

                <div className={styles.assetField}>
                  <span>类别</span>
                  <div className={styles.assetSegmentDisabled}>
                    <span className={styles.assetSegmentActive}>角色</span>
                    <span>场景</span>
                  </div>
                </div>

                <div className={styles.assetField}>
                  <span>音色</span>
                  <div className={styles.assetToneCard}>
                    <strong>{SUBJECT_TONE_LABEL}</strong>
                    <small>{SUBJECT_TONE_META}</small>
                  </div>
                </div>

                <div className={styles.assetField}>
                  <span>形象</span>
                  <div className={styles.assetModeSwitch}>
                    <button type="button" className={cx(styles.assetModeButton, subjectAdjustMode === 'upload' && styles.assetModeButtonActive)} onClick={() => setSubjectAdjustMode('upload')}>
                      本地上传
                    </button>
                    <button type="button" className={cx(styles.assetModeButton, subjectAdjustMode === 'ai' && styles.assetModeButtonActive)} onClick={() => setSubjectAdjustMode('ai')}>
                      AI生成
                    </button>
                  </div>
                  <div className={styles.assetPromptBox}>
                    <textarea
                      value={subjectPromptDraft}
                      placeholder="输入你的主体描述，点击发送即可生成图片"
                      onChange={(event) => setSubjectPromptDraft(event.target.value)}
                    />
                    <button
                      type="button"
                      className={styles.assetPromptSend}
                      onClick={() => setSubjectImageDraft(nextImageFromPool(subjectImageDraft || activeSubjectCard.image, SUBJECT_IMAGE_POOL))}
                      aria-label="根据描述生成"
                    >
                      <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
                        <path d="M4.5 7.427 8 4.072m0 0 3.5 3.355M8 4.072v7.855" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  </div>
                </div>

                <footer className={styles.assetModalFooter}>
                  <span>主体范例</span>
                  <div className={styles.assetModalActions}>
                    <button type="button" className={styles.assetGhostButton} onClick={closeSubjectAdjustDialog}>
                      取消
                    </button>
                    <button type="button" className={styles.assetPrimaryButton} onClick={applySubjectAdjust}>
                      应用
                    </button>
                  </div>
                </footer>
              </div>
            </div>
          </section>
        </div>
      ) : null}

      {sceneDialogCardId && activeSceneCard ? (
        <div className={styles.assetModalBackdrop} role="presentation" onClick={closeSceneAdjustDialog}>
          <section className={styles.assetModal} role="dialog" aria-modal="true" aria-label="编辑场景" onClick={(event) => event.stopPropagation()}>
            <header className={styles.assetModalHeader}>
              <h3>编辑场景</h3>
              <button type="button" className={styles.assetModalClose} onClick={closeSceneAdjustDialog} aria-label="关闭">
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <path d="m6 6 12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </header>

            <div className={styles.assetModalBody}>
              <div className={styles.assetPreviewPane}>
                <img src={sceneImageDraft || activeSceneCard.image} alt={activeSceneCard.title} />
                <div className={styles.assetThumbRow}>
                  {SCENE_IMAGE_POOL.slice(0, 5).map((image) => (
                    <button
                      key={`scene-thumb-${image}`}
                      type="button"
                      className={cx(styles.assetThumbButton, (sceneImageDraft || activeSceneCard.image) === image && styles.assetThumbButtonActive)}
                      onClick={() => setSceneImageDraft(image)}
                    >
                      <img src={image} alt="场景参考图" />
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.assetFormPane}>
                <label className={styles.assetField}>
                  <span>名称</span>
                  <input value={sceneNameDraft} onChange={(event) => setSceneNameDraft(event.target.value)} disabled />
                </label>

                <div className={styles.assetField}>
                  <span>类别</span>
                  <div className={styles.assetSegmentDisabled}>
                    <span>角色</span>
                    <span className={styles.assetSegmentActive}>场景</span>
                  </div>
                </div>

                <div className={styles.assetField}>
                  <span>场景</span>
                  <div className={styles.assetModeSwitch}>
                    <button type="button" className={cx(styles.assetModeButton, sceneAdjustMode === 'upload' && styles.assetModeButtonActive)} onClick={() => setSceneAdjustMode('upload')}>
                      本地上传
                    </button>
                    <button type="button" className={cx(styles.assetModeButton, sceneAdjustMode === 'ai' && styles.assetModeButtonActive)} onClick={() => setSceneAdjustMode('ai')}>
                      AI生成
                    </button>
                  </div>
                  <div className={styles.assetPromptBox}>
                    <textarea
                      value={scenePromptDraft}
                      placeholder="输入你的场景描述，点击发送即可生成图片"
                      onChange={(event) => setScenePromptDraft(event.target.value)}
                    />
                    <button
                      type="button"
                      className={styles.assetPromptSend}
                      onClick={() => setSceneImageDraft(nextImageFromPool(sceneImageDraft || activeSceneCard.image, SCENE_IMAGE_POOL))}
                      aria-label="根据描述生成"
                    >
                      <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
                        <path d="M4.5 7.427 8 4.072m0 0 3.5 3.355M8 4.072v7.855" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  </div>
                </div>

                <footer className={styles.assetModalFooter}>
                  <span>主体范例</span>
                  <div className={styles.assetModalActions}>
                    <button type="button" className={styles.assetGhostButton} onClick={closeSceneAdjustDialog}>
                      取消
                    </button>
                    <button type="button" className={styles.assetPrimaryButton} onClick={applySceneAdjust}>
                      应用
                    </button>
                  </div>
                </footer>
              </div>
            </div>
          </section>
        </div>
      ) : null}

      <Dialog
        open={Boolean(shotDeleteDialog && deletingShot)}
        title="确认删除分镜"
        description="删除此分镜后将无法恢复，确认要删除吗？"
        onClose={closeShotDeleteDialog}
        footer={
          <>
            <button type="button" className={styles.dialogGhostButton} onClick={closeShotDeleteDialog}>
              取消
            </button>
            <button type="button" className={styles.dialogPrimaryButton} onClick={confirmDeleteShot}>
              确定
            </button>
          </>
        }
      >
        <p className={styles.deleteShotHint}>分镜：{deletingShot?.title ?? '未命名分镜'}</p>
      </Dialog>

      <Dialog open={booting} title="正在进入分片生成" description="正在提交任务并切换到 Creation 工作区。" onClose={() => undefined}>
        <div className={styles.bootCard}>
          <div className={styles.bootValue}>{bootProgress}%</div>
          <div className={styles.progressTrack}>
            <span className={styles.progressFill} style={{ width: `${bootProgress}%` }} />
          </div>
          <p>提交分镜任务中，请稍候...</p>
          <p>剩余积分：{remainingPoints}</p>
        </div>
      </Dialog>
    </>
  );
}
