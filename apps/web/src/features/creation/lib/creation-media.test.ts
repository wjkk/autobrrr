import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getCreationShotMediaUrl,
  getCreationShotSummaryMediaUrl,
  getCreationVersionMediaUrl,
} from './creation-media';

test('getCreationShotMediaUrl normalizes shot indices and keeps configured missing shots empty', () => {
  assert.equal(getCreationShotMediaUrl('shot-1'), '/seko-creation/shot-01.jpg');
  assert.equal(getCreationShotMediaUrl('shot-16'), '/seko-creation/shot-02.jpg');
  assert.equal(getCreationShotMediaUrl('shot-2'), '');
  assert.equal(getCreationShotMediaUrl('shot-no-number'), '/seko-creation/shot-01.jpg');
});

test('getCreationShotSummaryMediaUrl exposes dedicated summary strip for the first shot', () => {
  assert.equal(getCreationShotSummaryMediaUrl('shot-1'), '/seko-creation/shot-01-strip.jpg');
  assert.equal(getCreationShotSummaryMediaUrl('shot-3'), '/seko-creation/shot-03.jpg');
});

test('getCreationVersionMediaUrl offsets local media previews by version number', () => {
  assert.equal(getCreationVersionMediaUrl('shot-3', 'version-1'), '/seko-creation/shot-03.jpg');
  assert.equal(getCreationVersionMediaUrl('shot-3', 'version-4'), '/seko-creation/shot-06.jpg');
  assert.equal(getCreationVersionMediaUrl('shot-14', 'version-3'), '/seko-creation/shot-02.jpg');
});
