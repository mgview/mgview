import type { SimulationTable, Timeline, TimelineFrame, TimelineLookupResult } from './types.ts';

function timeKey(time: number): string {
  return time.toPrecision(15);
}

export function buildTimeline(tables: SimulationTable[]): Timeline {
  const framesByTime = new Map<string, TimelineFrame>();

  for (const table of tables) {
    for (const row of table.rows) {
      const key = timeKey(row.time);
      const existing = framesByTime.get(key);

      if (existing) {
        Object.assign(existing.data, row.values);
        continue;
      }

      framesByTime.set(key, {
        time: row.time,
        data: { ...row.values },
      });
    }
  }

  const frames = [...framesByTime.values()].sort((left, right) => left.time - right.time);
  const firstFrame = frames[0];
  const lastFrame = frames.at(-1);
  if (!firstFrame || !lastFrame) {
    return {
      frames,
      tInitial: 0,
      tFinal: 0,
      tStep: 0,
    };
  }

  return {
    frames,
    tInitial: firstFrame.time,
    tFinal: lastFrame.time,
    tStep: frames.length > 1 ? frames[1]!.time - firstFrame.time : 0,
  };
}

export function getFrameAtTime(timeline: Timeline, time: number): TimelineLookupResult | undefined {
  if (timeline.frames.length === 0) {
    return undefined;
  }

  const { tInitial, tStep } = timeline;
  const safeStep = tStep === 0 ? 1 : tStep;
  let index = Math.floor((time - tInitial) / safeStep);
  let tFinalExceeded = false;

  if (index < 0) {
    index = 0;
  }

  if (index >= timeline.frames.length) {
    index = timeline.frames.length - 1;
    tFinalExceeded = true;
  }

  return {
    frame: timeline.frames[index]!,
    tFinalExceeded,
  };
}

export function getFrameIndexAtTime(timeline: Timeline, time: number): number {
  if (timeline.frames.length === 0) {
    return 0;
  }

  const { tInitial, tStep, frames } = timeline;
  const safeStep = tStep === 0 ? 1 : tStep;
  let index = Math.floor((time - tInitial) / safeStep);

  if (index < 0) {
    return 0;
  }

  if (index >= frames.length) {
    return frames.length - 1;
  }

  return index;
}
