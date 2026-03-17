import assert from 'node:assert/strict';
import test from 'node:test';

import { resolvePlannerCreationActionState } from './planner-creation-flow-logic';

test('resolvePlannerCreationActionState requires finalize when refinement is not confirmed', () => {
  const result = resolvePlannerCreationActionState({
    runtimeApi: {
      projectId: 'project-1',
      episodeId: 'episode-1',
    },
    runtimeWorkspace: {
      project: {
        status: 'ready_for_storyboard',
      },
      episode: {
        status: 'ready_for_storyboard',
      },
    } as never,
    runtimeActiveRefinement: {
      isConfirmed: false,
      shotScripts: [
        {
          targetModelFamilySlug: 'ark-seedance-2-video',
        },
      ],
    } as never,
    displayVersionStatus: 'ready',
    displayScriptActs: [
      {
        id: 'act-1',
        title: '第一幕',
        time: '夜',
        location: '天台',
        shots: [{ id: 'shot-1' }],
      } as never,
    ],
    remainingPoints: 100,
    pointCost: 10,
    storyboardModelId: 'ark-seedance-2-video',
    booting: false,
  });

  assert.equal(result.creationReady, true);
  assert.equal(result.shouldFinalizeBeforeNavigate, true);
  assert.equal(result.creationActionLabel, '确认策划，进入创作');
  assert.equal(result.creationActionDisabled, false);
});

test('resolvePlannerCreationActionState allows direct navigation when model and status are aligned', () => {
  const result = resolvePlannerCreationActionState({
    runtimeApi: {
      projectId: 'project-1',
      episodeId: 'episode-1',
    },
    runtimeWorkspace: {
      project: {
        status: 'ready_for_storyboard',
      },
      episode: {
        status: 'ready_for_storyboard',
      },
    } as never,
    runtimeActiveRefinement: {
      isConfirmed: true,
      shotScripts: [
        {
          targetModelFamilySlug: 'ark-seedance-2-video',
        },
      ],
    } as never,
    displayVersionStatus: 'ready',
    displayScriptActs: [
      {
        id: 'act-1',
        title: '第一幕',
        time: '夜',
        location: '天台',
        shots: [{ id: 'shot-1' }],
      } as never,
    ],
    remainingPoints: 100,
    pointCost: 10,
    storyboardModelId: 'ark-seedance-2-video',
    booting: false,
  });

  assert.equal(result.shouldFinalizeBeforeNavigate, false);
  assert.equal(result.creationActionLabel, '进入创作');
  assert.equal(result.creationActionDisabled, false);
});

test('resolvePlannerCreationActionState disables creation when no shot drafts or points are insufficient', () => {
  const result = resolvePlannerCreationActionState({
    runtimeApi: undefined,
    runtimeWorkspace: null,
    runtimeActiveRefinement: {
      isConfirmed: true,
      shotScripts: [],
    } as never,
    displayVersionStatus: 'ready',
    displayScriptActs: [],
    remainingPoints: 5,
    pointCost: 10,
    storyboardModelId: 'ark-seedance-2-video',
    booting: false,
  });

  assert.equal(result.creationReady, true);
  assert.equal(result.hasReadyShots, false);
  assert.equal(result.hasSufficientPoints, false);
  assert.equal(result.creationActionDisabled, true);
});
