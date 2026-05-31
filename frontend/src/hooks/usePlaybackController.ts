import { useEffect, useRef, useState } from 'react';
import type { Timeline } from '../core/types.ts';

export function getPlaybackResetKey(timeline: Timeline | null, resetIdentity: string | null): string {
  if (!timeline) {
    return resetIdentity ?? 'no-timeline';
  }

  return [
    resetIdentity ?? 'anonymous-scene',
    timeline.tInitial,
    timeline.tFinal,
    timeline.tStep,
  ].join('::');
}

export function usePlaybackController(
  timeline: Timeline | null,
  playbackSpeed: number,
  resetIdentity: string | null = null
) {
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const currentTimeRef = useRef(0);
  const playbackResetKey = getPlaybackResetKey(timeline, resetIdentity);

  useEffect(() => {
    currentTimeRef.current = currentTime;
  }, [currentTime]);

  useEffect(() => {
    setIsPlaying(false);
    if (timeline) {
      currentTimeRef.current = timeline.tInitial;
      setCurrentTime(timeline.tInitial);
    }
  }, [playbackResetKey, timeline]);

  useEffect(() => {
    if (!isPlaying || !timeline) {
      return;
    }

    const effectiveSpeed = Math.max(playbackSpeed, 0);
    let animationFrameId = 0;
    let lastTimestamp: number | null = null;

    const advance = (timestamp: number) => {
      if (lastTimestamp === null) {
        lastTimestamp = timestamp;
        animationFrameId = requestAnimationFrame(advance);
        return;
      }

      const elapsedSeconds = (timestamp - lastTimestamp) / 1000;
      lastTimestamp = timestamp;
      const nextTime = currentTimeRef.current + elapsedSeconds * effectiveSpeed;

      if (nextTime >= timeline.tFinal) {
        currentTimeRef.current = timeline.tFinal;
        setCurrentTime(timeline.tFinal);
        setIsPlaying(false);
        return;
      }

      currentTimeRef.current = nextTime;
      setCurrentTime(nextTime);
      animationFrameId = requestAnimationFrame(advance);
    };

    animationFrameId = requestAnimationFrame(advance);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isPlaying, playbackSpeed, timeline]);

  const togglePlay = () => {
    if (!timeline) {
      return;
    }

    if (currentTimeRef.current >= timeline.tFinal) {
      currentTimeRef.current = timeline.tInitial;
      setCurrentTime(timeline.tInitial);
    }

    setIsPlaying((current) => !current);
  };

  const resetPlayback = () => {
    if (!timeline) {
      return;
    }

    setIsPlaying(false);
    currentTimeRef.current = timeline.tInitial;
    setCurrentTime(timeline.tInitial);
  };

  const changeTime = (nextTime: number) => {
    setIsPlaying(false);
    currentTimeRef.current = nextTime;
    setCurrentTime(nextTime);
  };

  return {
    changeTime,
    currentTime,
    isPlaying,
    resetPlayback,
    togglePlay,
  };
}
