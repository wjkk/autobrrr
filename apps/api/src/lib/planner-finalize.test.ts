import assert from 'node:assert/strict';
import test from 'node:test';

import { finalizePlannerRefinementToCreation } from './planner-finalize.js';

test('finalizePlannerRefinementToCreation blocks when it would delete creation shots with history', async () => {
  const fakeDb = {
    shot: {
      findMany: async () => [
        {
          id: 'existing-shot-1',
          activeVersionId: 'shot-version-1',
          versions: [{ id: 'shot-version-1' }],
        },
      ],
    },
  } as never;

  await assert.rejects(
    () =>
      finalizePlannerRefinementToCreation({
        db: fakeDb,
        projectId: 'project-1',
        episodeId: 'episode-1',
        refinementVersionId: 'refinement-1',
        targetVideoModel: {
          familyId: 'family-1',
          familySlug: 'seedance-2-0',
          familyName: 'Seedance 2.0',
          summary: '支持多镜头叙事',
          capability: {
            supportsMultiShot: true,
            maxShotsPerGeneration: 6,
            timestampMeaning: 'narrative-hint',
            audioDescStyle: 'inline',
            referenceImageSupport: 'full',
            maxReferenceImages: 4,
            maxReferenceVideos: 0,
            maxReferenceAudios: 0,
            cameraVocab: 'english-cinematic',
            maxDurationSeconds: 10,
            maxResolution: '1080p',
            promptStyle: 'narrative',
            knownIssues: [],
          },
        },
        subjects: [],
        scenes: [],
        shotScripts: [],
      }),
    /Finalize would remove existing Creation shots with generated history/i,
  );
});
