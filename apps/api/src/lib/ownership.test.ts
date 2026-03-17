import assert from 'node:assert/strict';
import test from 'node:test';

import { __testables } from './ownership.js';

test('findOwnedProjectWithDeps scopes project lookup by owner', async () => {
  let captured: Record<string, unknown> | null = null;
  const project = { id: 'project-1' };

  const result = await __testables.findOwnedProjectWithDeps('project-1', 'user-1', {
    findProject: async (args) => {
      captured = args as Record<string, unknown>;
      return project as never;
    },
  });

  assert.equal(result, project);
  assert.deepEqual(captured, {
    where: {
      id: 'project-1',
      createdById: 'user-1',
    },
  });
});

test('findOwnedEpisodeWithDeps scopes episode lookup by project owner and includes project context', async () => {
  let captured: Record<string, unknown> | null = null;
  const episode = { id: 'episode-1' };

  const result = await __testables.findOwnedEpisodeWithDeps('project-1', 'episode-1', 'user-1', {
    findEpisode: async (args) => {
      captured = args as Record<string, unknown>;
      return episode as never;
    },
  });

  assert.equal(result, episode);
  assert.deepEqual(captured, {
    where: {
      id: 'episode-1',
      projectId: 'project-1',
      project: {
        createdById: 'user-1',
      },
    },
    include: {
      project: {
        select: {
          id: true,
          title: true,
          status: true,
          contentMode: true,
          currentEpisodeId: true,
        },
      },
    },
  });
});

test('findOwnedShotWithDeps scopes shot lookup by project owner and includes episode/version context', async () => {
  let captured: Record<string, unknown> | null = null;
  const shot = { id: 'shot-1' };

  const result = await __testables.findOwnedShotWithDeps('project-1', 'shot-1', 'user-1', {
    findShot: async (args) => {
      captured = args as Record<string, unknown>;
      return shot as never;
    },
  });

  assert.equal(result, shot);
  assert.deepEqual(captured, {
    where: {
      id: 'shot-1',
      projectId: 'project-1',
      project: {
        createdById: 'user-1',
      },
    },
    include: {
      episode: {
        select: {
          id: true,
          episodeNo: true,
          title: true,
          status: true,
        },
      },
      activeVersion: {
        select: {
          id: true,
          label: true,
          mediaKind: true,
          status: true,
        },
      },
    },
  });
});

test('findOwnedRunWithDeps scopes run lookup by project owner', async () => {
  let captured: Record<string, unknown> | null = null;
  const run = { id: 'run-1' };

  const result = await __testables.findOwnedRunWithDeps('run-1', 'user-1', {
    findRun: async (args) => {
      captured = args as Record<string, unknown>;
      return run as never;
    },
  });

  assert.equal(result, run);
  assert.deepEqual(captured, {
    where: {
      id: 'run-1',
      project: {
        createdById: 'user-1',
      },
    },
  });
});
