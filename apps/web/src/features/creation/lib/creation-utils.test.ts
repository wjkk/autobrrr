import test from 'node:test';
import assert from 'node:assert/strict';

import { getMockStudioProject } from '@aiv/mock-data';

import {
  buildVersion,
  cloneShot,
  formatClock,
  formatShotDuration,
  getShotAtSecond,
  getShotOffset,
  shotAccent,
  statusLabel,
  syncVersionStatuses,
} from './creation-utils';

function getFixtureShots() {
  const fixture = getMockStudioProject('proj-rain-cat');
  assert.ok(fixture);
  return fixture.creation.shots;
}

test('cloneShot performs a nested clone for versions, materials and canvas transform', () => {
  const shot = getFixtureShots()[0];
  const cloned = cloneShot(shot);

  assert.notEqual(cloned, shot);
  assert.notEqual(cloned.versions, shot.versions);
  assert.notEqual(cloned.materials, shot.materials);
  assert.notEqual(cloned.canvasTransform, shot.canvasTransform);
  assert.deepEqual(cloned, shot);
});

test('buildVersion appends a pending_apply version with current shot numbering', () => {
  const shot = getFixtureShots()[0];
  const version = buildVersion(shot, 'ark-seedance-2-video');

  assert.match(version.id, new RegExp(`^${shot.id}-v-`));
  assert.equal(version.label, `版本 ${shot.versions.length + 1}`);
  assert.equal(version.status, 'pending_apply');
  assert.equal(version.modelId, 'ark-seedance-2-video');
});

test('syncVersionStatuses marks active and pending versions while archiving the rest', () => {
  const shot = getFixtureShots()[0];
  const activeVersionId = shot.versions[0]?.id ?? '';
  const pendingApplyVersionId = shot.versions[1]?.id ?? null;

  const versions = syncVersionStatuses(shot, activeVersionId, pendingApplyVersionId);

  assert.equal(versions.find((item) => item.id === activeVersionId)?.status, 'active');
  assert.equal(versions.find((item) => item.id === pendingApplyVersionId)?.status, 'pending_apply');
  for (const version of versions) {
    if (version.id !== activeVersionId && version.id !== pendingApplyVersionId) {
      assert.equal(version.status, 'archived');
    }
  }
});

test('creation time helpers keep timeline and formatting stable', () => {
  const shots = getFixtureShots();

  assert.equal(formatClock(65), '01:05');
  assert.equal(formatShotDuration(8), '00:08');
  assert.equal(getShotOffset(shots, shots[1]!.id), shots[0]!.durationSeconds);
  assert.equal(getShotAtSecond(shots, 0)?.id, shots[0]!.id);
  assert.equal(getShotAtSecond(shots, shots[0]!.durationSeconds + 0.1)?.id, shots[1]!.id);
});

test('statusLabel and shotAccent return stable UI mapping values', () => {
  assert.equal(statusLabel('success'), '已完成');
  assert.equal(statusLabel('failed'), '失败');
  assert.equal(statusLabel('generating'), '生成中');
  assert.equal(statusLabel('queued'), '排队中');
  assert.equal(statusLabel('pending'), '待生成');

  const accent = shotAccent('shot-1');
  assert.ok(accent.from.startsWith('#'));
  assert.ok(accent.to.startsWith('#'));
  assert.match(accent.glow, /^rgba\(/);
});
