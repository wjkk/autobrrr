import assert from 'node:assert/strict';
import test from 'node:test';

import { readTargetVideoModelFamilySlugFromSettings } from './target-video-model.js';

test('readTargetVideoModelFamilySlugFromSettings prefers top-level field', () => {
  const slug = readTargetVideoModelFamilySlugFromSettings({
    targetVideoModelFamilySlug: 'seedance-2-0',
    storyboardConfig: {
      targetVideoModelFamilySlug: 'veo-3-1',
    },
    videoModelFamilySlug: 'wan-2-6',
  });

  assert.equal(slug, 'seedance-2-0');
});

test('readTargetVideoModelFamilySlugFromSettings falls back to storyboardConfig and legacy field', () => {
  assert.equal(
    readTargetVideoModelFamilySlugFromSettings({
      storyboardConfig: {
        targetVideoModelFamilySlug: 'veo-3-1',
      },
    }),
    'veo-3-1',
  );

  assert.equal(
    readTargetVideoModelFamilySlugFromSettings({
      videoModelFamilySlug: 'wan-2-6',
    }),
    'wan-2-6',
  );
});
