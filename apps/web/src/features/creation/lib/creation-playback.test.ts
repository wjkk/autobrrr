import test from 'node:test';
import assert from 'node:assert/strict';

import { getMockStudioProject } from '@aiv/mock-data';

import {
  getPlaybackShot,
  getPlaybackSubtitle,
  getShotPlaybackWindow,
  getStageMotionStyle,
  getTimelinePlayheadRatio,
} from './creation-playback';

function getFixtureWorkspace() {
  const fixture = getMockStudioProject('proj-rain-cat');
  assert.ok(fixture);
  return fixture.creation;
}

test('getShotPlaybackWindow derives local progress from playback second and shot offset', () => {
  const workspace = getFixtureWorkspace();
  const shot = workspace.shots[0]!;

  const window = getShotPlaybackWindow(workspace, shot);

  assert.equal(window.shotOffset, 0);
  assert.equal(window.isInWindow, true);
  assert.ok(window.progress >= 0 && window.progress <= 1);
});

test('getPlaybackShot resolves current shot from timeline and falls back to the first shot', () => {
  const workspace = getFixtureWorkspace();
  const totalShotDuration = workspace.shots.reduce((sum, shot) => sum + shot.durationSeconds, 0);

  assert.equal(getPlaybackShot(workspace)?.id, workspace.shots[0]?.id);
  assert.equal(
    getPlaybackShot({
      ...workspace,
      playback: {
        ...workspace.playback,
        currentSecond: totalShotDuration + 1,
      },
    })?.id,
    workspace.shots.at(-1)?.id,
  );
});

test('getPlaybackSubtitle respects visibility, scripted subtitle timeline and shot fallback text', () => {
  const workspace = getFixtureWorkspace();
  const shot = workspace.shots[0]!;

  const visibleSubtitle = getPlaybackSubtitle(
    {
      ...workspace,
      playback: { ...workspace.playback, subtitleVisible: true, currentSecond: 0.2 },
    },
    shot,
  );

  const hiddenSubtitle = getPlaybackSubtitle(
    {
      ...workspace,
      playback: { ...workspace.playback, subtitleVisible: false },
    },
    shot,
  );

  assert.equal(visibleSubtitle, '科技宅大刘');
  assert.equal(hiddenSubtitle, '');
});

test('getStageMotionStyle and getTimelinePlayheadRatio keep CSS and ratio outputs clamped', () => {
  const workspace = getFixtureWorkspace();
  const shot = workspace.shots[0]!;

  const style = getStageMotionStyle(workspace, shot);
  const ratio = getTimelinePlayheadRatio(workspace);
  const styleVars = style as Record<string, string | undefined>;

  assert.ok(typeof styleVars['--stage-drift-x'] === 'string');
  assert.ok(typeof styleVars['--stage-scale'] === 'string');
  assert.ok(ratio >= 0 && ratio <= 1);
});
