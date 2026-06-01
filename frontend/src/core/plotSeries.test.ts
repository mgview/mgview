import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

import { parseSimulationText } from './parseSimulationText.ts';
import { buildTimeline } from './timeline.ts';
import { computePlotYBounds, extractPlotPanelData, extractPlotSeries } from './plotSeries.ts';
import { normalizePlotsConfig } from './plotsConfig.ts';
import { createSavableScene } from '../hooks/useSceneWorkspace.ts';
import { createSceneDocument } from './sceneDocument.ts';
import type { SceneConfig } from './types.ts';

test('extractPlotSeries builds aligned time/value arrays from timeline', async () => {
  const url = new URL('../../../samples/robot_arm/circle_step/robot_arm.1', import.meta.url);
  const text = await readFile(url, 'utf8');
  const table = parseSimulationText(text, 'robot_arm.1');
  const timeline = buildTimeline([table]);
  const bundle = extractPlotSeries(timeline, ['Ta', 'Tb', 'missingChannel'], table.channelNames);

  assert.equal(bundle.series.length, 3);
  assert.deepEqual(bundle.missingChannels, ['missingChannel']);
  assert.equal(bundle.series[0]?.values.length, timeline.frames.length);
  assert.equal(bundle.series[0]?.values[0], timeline.frames[0]?.data.Ta);
  assert.equal(bundle.series[2]?.missing, true);
  assert.equal(bundle.series[2]?.values[0], null);
});

test('plot config normalizes and round-trips through createSavableScene', () => {
  const rawScene: SceneConfig = {
    name: 'plot_scene',
    simulationData: ['demo.1'],
    plots: {
      panels: [
        { title: 'Torques', channels: ['Ta', 'Ta', ''] },
        { channels: ['Tb'] },
        {
          xMode: 'channel',
          xChannel: 'Ta',
          channels: ['Tb'],
          yChannelScale: -1,
          autoScale: false,
          xMin: 1,
          xMax: 9,
          yMin: -2,
          yMax: 2,
        },
      ],
    },
  };

  const draftScene = createSceneDocument(rawScene, ['Ta', 'Tb']);
  assert.equal(draftScene.plots.panels.length, 3);
  assert.equal(draftScene.plots.panels[0]?.title, 'Torques');
  assert.deepEqual(draftScene.plots.panels[0]?.channels, ['Ta']);
  assert.equal(draftScene.plots.panels[0]?.xMode, 'time');
  assert.equal(typeof draftScene.plots.panels[0]?.id, 'string');
  assert.deepEqual(draftScene.plots.panels[1], {
    id: draftScene.plots.panels[1]?.id,
    channels: ['Tb'],
    xMode: 'time',
  });
  assert.deepEqual(draftScene.plots.panels[2], {
    id: draftScene.plots.panels[2]?.id,
    xMode: 'channel',
    xChannel: 'Ta',
    channels: ['Tb'],
    yChannelScale: -1,
    autoScale: false,
    xMin: 1,
    xMax: 9,
    yMin: -2,
    yMax: 2,
  });

  const saved = createSavableScene(rawScene, draftScene);
  assert.deepEqual(saved.plots, draftScene.plots);
});

test('normalizePlotsConfig tolerates missing plot section', () => {
  assert.deepEqual(normalizePlotsConfig(undefined), { panels: [] });
  assert.deepEqual(normalizePlotsConfig({ panels: [] }), { panels: [] });
});

test('extractPlotPanelData supports Y vs X channel mode', async () => {
  const url = new URL('../../../samples/robot_arm/circle_step/robot_arm.1', import.meta.url);
  const text = await readFile(url, 'utf8');
  const table = parseSimulationText(text, 'robot_arm.1');
  const timeline = buildTimeline([table]);
  const panelData = extractPlotPanelData(
    timeline,
    { xMode: 'channel', xChannel: 'Ta', channels: ['Tb'] },
    table.channelNames
  );

  assert.equal(panelData.xMode, 'channel');
  assert.equal(panelData.xLabel, 'Ta');
  assert.equal(panelData.xValues.length, timeline.frames.length);
  assert.equal(panelData.series.length, 1);
  assert.equal(panelData.xValues[0], timeline.frames[0]?.data.Ta);
  assert.equal(panelData.series[0]?.values[0], timeline.frames[0]?.data.Tb);
});

test('extractPlotPanelData applies per-channel scales in Y vs X mode', async () => {
  const url = new URL('../../../samples/robot_arm/circle_step/robot_arm.1', import.meta.url);
  const text = await readFile(url, 'utf8');
  const table = parseSimulationText(text, 'robot_arm.1');
  const timeline = buildTimeline([table]);
  const rawTa = timeline.frames[0]?.data.Ta;
  const rawTb = timeline.frames[0]?.data.Tb;
  assert.ok(Number.isFinite(rawTa));
  assert.ok(Number.isFinite(rawTb));

  const panelData = extractPlotPanelData(
    timeline,
    {
      xMode: 'channel',
      xChannel: 'Ta',
      channels: ['Tb'],
      yChannelScale: -1,
      xChannelScale: 2,
    },
    table.channelNames
  );

  assert.equal(panelData.xValues[0], (rawTa as number) * 2);
  assert.equal(panelData.series[0]?.values[0], (rawTb as number) * -1);
});

test('computePlotYBounds spans all series extrema with padding', async () => {
  const url = new URL('../../../samples/robot_arm/circle_step/robot_arm.1', import.meta.url);
  const text = await readFile(url, 'utf8');
  const table = parseSimulationText(text, 'robot_arm.1');
  const timeline = buildTimeline([table]);
  const times = timeline.frames.map((frame) => frame.time);
  const bundle = extractPlotSeries(timeline, ['Ta', 'Tb', 'Tcd'], table.channelNames);
  const bounds = computePlotYBounds(times, bundle.series);

  assert.ok(bounds);
  for (const series of bundle.series) {
    for (const value of series.values) {
      if (!Number.isFinite(value)) {
        continue;
      }

      assert.ok(value >= bounds.yMin, `expected yMin to include ${value}`);
      assert.ok(value <= bounds.yMax, `expected yMax to include ${value}`);
    }
  }
});
