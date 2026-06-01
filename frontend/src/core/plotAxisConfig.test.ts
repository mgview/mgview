import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildPersistedPlotAxisFields,
  clearPlotAxisFields,
  mergePlotAxisFields,
  plotAxisViewIsZoomed,
  plotPanelAutoScale,
  resolvePlotAxisLimits,
} from './plotAxisConfig.ts';
import type { PlotAxisLimits } from './plotAxisConfig.ts';

const fullLimits: PlotAxisLimits = { xMin: 0, xMax: 10, yMin: -1, yMax: 1 };

test('plotPanelAutoScale defaults to true', () => {
  assert.equal(plotPanelAutoScale({}), true);
  assert.equal(plotPanelAutoScale({ autoScale: false }), false);
});

test('buildPersistedPlotAxisFields stores manual limits', () => {
  const limits = { xMin: 1, xMax: 9, yMin: 0, yMax: 2 };
  assert.deepEqual(buildPersistedPlotAxisFields(false, limits, fullLimits, true), {
    autoScale: false,
    ...limits,
  });
});

test('buildPersistedPlotAxisFields stores only X zoom for time auto-scale', () => {
  const limits = { xMin: 2, xMax: 8, yMin: -0.5, yMax: 0.5 };
  assert.deepEqual(buildPersistedPlotAxisFields(true, limits, fullLimits, true), {
    xMin: 2,
    xMax: 8,
  });
});

test('buildPersistedPlotAxisFields stores full box for XY auto-scale zoom', () => {
  const limits = { xMin: 1, xMax: 5, yMin: 2, yMax: 6 };
  assert.deepEqual(buildPersistedPlotAxisFields(true, limits, fullLimits, false), limits);
});

test('mergePlotAxisFields clears axis fields when null', () => {
  const panel = {
    channels: ['a'],
    autoScale: false,
    xMin: 1,
    xMax: 2,
    yMin: 3,
    yMax: 4,
  };
  assert.deepEqual(clearPlotAxisFields(panel), { channels: ['a'] });
  assert.deepEqual(mergePlotAxisFields(panel, null), { channels: ['a'] });
});

test('plotAxisViewIsZoomed detects time-axis zoom', () => {
  assert.equal(plotAxisViewIsZoomed({}, fullLimits, true), false);
  assert.equal(plotAxisViewIsZoomed({ xMin: 2, xMax: 8 }, fullLimits, true), true);
});

test('resolvePlotAxisLimits uses stored manual limits', () => {
  const panelData = {
    xMode: 'time' as const,
    xLabel: 't',
    xValues: [0, 5, 10],
    times: [0, 5, 10],
    series: [
      {
        id: 'y',
        label: 'y',
        times: [0, 5, 10],
        values: [0, 1, 0],
        missing: false,
      },
    ],
    missingChannels: [],
  };

  const resolved = resolvePlotAxisLimits(
    { autoScale: false, xMin: 1, xMax: 9, yMin: 0, yMax: 2 },
    fullLimits,
    panelData,
    panelData.series,
    true
  );

  assert.deepEqual(resolved, { xMin: 1, xMax: 9, yMin: 0, yMax: 2 });
});
