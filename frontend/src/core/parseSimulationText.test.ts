import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

import { parseSimulationText } from './parseSimulationText.ts';
import { buildTimeline, getFrameAtTime } from './timeline.ts';

async function readSample(relativePath: string): Promise<string> {
  const url = new URL(`../../../samples/${relativePath}`, import.meta.url);
  return readFile(url, 'utf8');
}

test('simulation parser reads channel names and numeric rows from MGView output', async () => {
  const text = await readSample('skycam/FixedCamera_FeedForward_Animation.1');
  const table = parseSimulationText(text, 'FixedCamera_FeedForward_Animation.1');

  assert.deepEqual(table.channelNames.slice(0, 5), ['xfb', 'yfb', 'zfb', 'qa', 'qb']);
  assert.equal(table.rows.length > 0, true);
  assert.equal(table.rows[0].time, 0);
  assert.equal(table.rows[0].values.xfb, 0);
  assert.equal(table.rows[1].values.yfb, 22.76352);
});

test('timeline builder merges multiple simulation tables by time', async () => {
  const positionText = await readSample('skycam/FixedCamera_FeedForward_Animation.1');
  const angleText = await readSample('tricycle/VehicleTricycleFreeMotionBackwardForces.1');

  const positionTable = parseSimulationText(positionText);
  const angleTable = parseSimulationText(angleText);
  const timeline = buildTimeline([positionTable, angleTable]);

  assert.equal(timeline.tInitial, 0);
  assert.equal(timeline.frames.length > 0, true);
  assert.equal(timeline.frames[0].data.xfb, 0);
  assert.equal(timeline.frames[0].data.qA, 180);
});

test('timeline lookup follows legacy clamp behavior at the ends', async () => {
  const text = await readSample('tricycle/VehicleTricycleFreeMotionBackwardForces.1');
  const table = parseSimulationText(text);
  const timeline = buildTimeline([table]);

  const beforeStart = getFrameAtTime(timeline, -10);
  const afterEnd = getFrameAtTime(timeline, 999);
  const nearStart = getFrameAtTime(timeline, 0.001);

  assert.ok(beforeStart);
  assert.ok(afterEnd);
  assert.ok(nearStart);
  assert.equal(beforeStart.frame.time, 0);
  assert.equal(afterEnd.tFinalExceeded, true);
  assert.equal(nearStart.frame.time, 0);
});
