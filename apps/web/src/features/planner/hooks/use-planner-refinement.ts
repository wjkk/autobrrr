import type { PlannerStepStatus } from '@aiv/domain';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { SekoActDraft, SekoImageCard } from '../lib/seko-plan-data';

export type PlannerRefinementStatus = 'running' | 'ready' | 'failed';
export type PlannerRefinementTrigger = 'confirm_outline' | 'rerun';

export interface PlannerSectionVisibility {
  summary: boolean;
  style: boolean;
  subjects: boolean;
  scenes: boolean;
  script: boolean;
}

export interface PlannerRefinementVersion {
  id: string;
  versionNumber: number;
  trigger: PlannerRefinementTrigger;
  createdAt: number;
  instruction: string;
  status: PlannerRefinementStatus;
  progressPercent: number;
  steps: PlannerStepStatus[];
  sections: PlannerSectionVisibility;
  subjectCards: SekoImageCard[];
  sceneCards: SekoImageCard[];
  scriptActs: SekoActDraft[];
}

interface UsePlannerRefinementOptions {
  stepCount: number;
  seedSubjects: SekoImageCard[];
  seedScenes: SekoImageCard[];
  seedActs: SekoActDraft[];
}

interface StartRefinementOptions {
  trigger: PlannerRefinementTrigger;
  instruction?: string;
}

const PROGRESS_STEPS = [18, 36, 58, 80, 100];

function nextId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
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

function emptySections(): PlannerSectionVisibility {
  return {
    summary: false,
    style: false,
    subjects: false,
    scenes: false,
    script: false,
  };
}

function revealByStep(stepIndex: number): PlannerSectionVisibility {
  return {
    summary: stepIndex >= 0,
    style: stepIndex >= 1,
    subjects: stepIndex >= 2,
    scenes: stepIndex >= 3,
    script: stepIndex >= 4,
  };
}

export function usePlannerRefinement({ stepCount, seedSubjects, seedScenes, seedActs }: UsePlannerRefinementOptions) {
  const timersRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const [versions, setVersions] = useState<PlannerRefinementVersion[]>([]);
  const [activeVersionId, setActiveVersionId] = useState<string | null>(null);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((timer) => clearTimeout(timer));
    timersRef.current = [];
  }, []);

  useEffect(() => {
    return () => {
      clearTimers();
    };
  }, [clearTimers]);

  const activeVersion = useMemo(() => {
    if (!activeVersionId) {
      return null;
    }

    return versions.find((item) => item.id === activeVersionId) ?? null;
  }, [versions, activeVersionId]);

  const patchVersion = useCallback((versionId: string, updater: (version: PlannerRefinementVersion) => PlannerRefinementVersion) => {
    setVersions((current) => current.map((item) => (item.id === versionId ? updater(item) : item)));
  }, []);

  const patchActiveVersion = useCallback(
    (updater: (version: PlannerRefinementVersion) => PlannerRefinementVersion) => {
      if (!activeVersionId) {
        return;
      }

      patchVersion(activeVersionId, updater);
    },
    [activeVersionId, patchVersion],
  );

  const startRefinement = useCallback(
    ({ trigger, instruction = '' }: StartRefinementOptions) => {
      clearTimers();

      const nextVersionNumber = (versions[versions.length - 1]?.versionNumber ?? 0) + 1;
      const baseVersion = activeVersion;
      const versionId = nextId('refinement');

      const nextVersion: PlannerRefinementVersion = {
        id: versionId,
        versionNumber: nextVersionNumber,
        trigger,
        createdAt: Date.now(),
        instruction,
        status: 'running',
        progressPercent: 0,
        steps: Array.from({ length: stepCount }, (_item, index) => (index === 0 ? 'running' : 'waiting')),
        sections: emptySections(),
        subjectCards: cloneImageCards(baseVersion?.subjectCards ?? seedSubjects),
        sceneCards: cloneImageCards(baseVersion?.sceneCards ?? seedScenes),
        scriptActs: cloneActs(baseVersion?.scriptActs ?? seedActs),
      };

      setVersions((current) => [...current, nextVersion]);
      setActiveVersionId(versionId);

      for (let index = 0; index < stepCount; index += 1) {
        const timer = setTimeout(() => {
          patchVersion(versionId, (currentVersion) => ({
            ...currentVersion,
            status: 'running',
            progressPercent: PROGRESS_STEPS[index] ?? 100,
            sections: revealByStep(index),
            steps: currentVersion.steps.map((step, stepIndex) => {
              if (stepIndex < index) {
                return 'done';
              }
              if (stepIndex === index) {
                return 'running';
              }
              return 'waiting';
            }),
          }));
        }, index * 760);

        timersRef.current.push(timer);
      }

      const doneTimer = setTimeout(() => {
        patchVersion(versionId, (currentVersion) => ({
          ...currentVersion,
          status: 'ready',
          progressPercent: 100,
          sections: {
            summary: true,
            style: true,
            subjects: true,
            scenes: true,
            script: true,
          },
          steps: currentVersion.steps.map(() => 'done'),
        }));
      }, stepCount * 760 + 180);

      timersRef.current.push(doneTimer);
      return versionId;
    },
    [activeVersion, clearTimers, patchVersion, seedActs, seedScenes, seedSubjects, stepCount, versions],
  );

  const selectVersion = useCallback((versionId: string) => {
    setActiveVersionId(versionId);
  }, []);

  const updateSubject = useCallback(
    (subjectId: string, updater: (subject: SekoImageCard) => SekoImageCard) => {
      patchActiveVersion((version) => ({
        ...version,
        subjectCards: version.subjectCards.map((item) => (item.id === subjectId ? updater(item) : item)),
      }));
    },
    [patchActiveVersion],
  );

  const updateScene = useCallback(
    (sceneId: string, updater: (scene: SekoImageCard) => SekoImageCard) => {
      patchActiveVersion((version) => ({
        ...version,
        sceneCards: version.sceneCards.map((item) => (item.id === sceneId ? updater(item) : item)),
      }));
    },
    [patchActiveVersion],
  );

  const updateShot = useCallback(
    (actId: string, shotId: string, updater: (shot: SekoActDraft['shots'][number]) => SekoActDraft['shots'][number]) => {
      patchActiveVersion((version) => ({
        ...version,
        scriptActs: version.scriptActs.map((act) => {
          if (act.id !== actId) {
            return act;
          }

          return {
            ...act,
            shots: act.shots.map((shot) => (shot.id === shotId ? updater(shot) : shot)),
          };
        }),
      }));
    },
    [patchActiveVersion],
  );

  const deleteShot = useCallback(
    (actId: string, shotId: string) => {
      patchActiveVersion((version) => ({
        ...version,
        scriptActs: version.scriptActs.map((act) => {
          if (act.id !== actId) {
            return act;
          }

          return {
            ...act,
            shots: act.shots.filter((shot) => shot.id !== shotId),
          };
        }),
      }));
    },
    [patchActiveVersion],
  );

  return {
    versions,
    activeVersionId,
    activeVersion,
    startRefinement,
    selectVersion,
    updateSubject,
    updateScene,
    updateShot,
    deleteShot,
  };
}
