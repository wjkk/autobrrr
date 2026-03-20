'use client';

import type { CreationWorkspace } from '@aiv/domain';
import { useEffect, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';

import { advancePlaybackState } from './creation-state';

export function useCreationPlayback(args: {
  creation: CreationWorkspace;
  playbackFrameRef: MutableRefObject<number | null>;
  playbackLastTickRef: MutableRefObject<number | null>;
  setCreation: Dispatch<SetStateAction<CreationWorkspace>>;
}) {
  const { creation, playbackFrameRef, playbackLastTickRef, setCreation } = args;

  useEffect(() => {
    if (!creation.playback.playing) {
      if (playbackFrameRef.current !== null) {
        cancelAnimationFrame(playbackFrameRef.current);
        playbackFrameRef.current = null;
      }
      playbackLastTickRef.current = null;
      return;
    }

    const tick = (timestamp: number) => {
      if (playbackLastTickRef.current === null) {
        playbackLastTickRef.current = timestamp;
      }

      const deltaSeconds = Math.min((timestamp - playbackLastTickRef.current) / 1000, 0.08);
      playbackLastTickRef.current = timestamp;

      setCreation((current) => {
        if (!current.playback.playing) {
          return current;
        }
        return advancePlaybackState(current, deltaSeconds);
      });

      playbackFrameRef.current = window.requestAnimationFrame(tick);
    };

    playbackFrameRef.current = window.requestAnimationFrame(tick);

    return () => {
      if (playbackFrameRef.current !== null) {
        cancelAnimationFrame(playbackFrameRef.current);
        playbackFrameRef.current = null;
      }
      playbackLastTickRef.current = null;
    };
  }, [creation.playback.playing, playbackFrameRef, playbackLastTickRef, setCreation]);
}
