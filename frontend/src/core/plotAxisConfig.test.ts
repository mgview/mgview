import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildPersistedPlotAxisFields,
  clearPlotAxisFields,
  formatPlotAxisLimit,
  mergePlotAxisFields,
  plotAxisViewIsZoomed,
  plotPanelAutoScale,
  plotPanelHasStoredAxisFields,
  plotPanelZoomToFitActive,
  resolvePlotAxisLimits,
  roundPlotAxisLimit,
} from './plotAxisConfig.ts';
import type { PlotAxisLimits } from './plotAxisConfig.ts';

const fullLimits: PlotAxisLimits = { xMin: 0, xMax: 10, yMin: -1, yMax: 1 };

test('formatPlotAxisLimit trims float noise', () => {
  assert.equal(formatPlotAxisLimit(0.123456789), '0.12346');
  assert.equal(formatPlotAxisLimit(12.5), '12.5');
  assert.equal(formatPlotAxisLimit(1234), '1234');
});

test('roundPlotAxisLimit matches display precision', () => {
  assert.equal(roundPlotAxisLimit(0.123456789), 0.12346);
});

test('plotPanelAutoScale defaults to true', () => {
  assert.equal(plotPanelAutoScale({}), true);
  assert.equal(plotPanelAutoScale({ autoScale: false }), false);
});

test('plotPanelHasStoredAxisFields detects any stored limit', () => {
  assert.equal(plotPanelHasStoredAxisFields({}), false);
  assert.equal(plotPanelHasStoredAxisFields({ xMin: 1 }), true);
});

test('buildPersistedPlotAxisFields stores full manual limits when zoomed', () => {
  const limits = { xMin: 1, xMax: 9, yMin: 0, yMax: 2 };
  assert.deepEqual(buildPersistedPlotAxisFields(limits, fullLimits), {
    autoScale: false,
    ...limits,
  });
});

test('buildPersistedPlotAxisFields clears fields when limits match full span', () => {
  assert.deepEqual(buildPersistedPlotAxisFields(fullLimits, fullLimits), {});
});

test('buildPersistedPlotAxisFields never keeps partial auto-scale', () => {
  const limits = { xMin: 2, xMax: 8, yMin: -0.5, yMax: 0.5 };
  assert.deepEqual(buildPersistedPlotAxisFields(limits, fullLimits), {
    autoScale: false,
    ...limits,
  });
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

test('plotAxisViewIsZoomed detects stored axis view', () => {
  assert.equal(plotAxisViewIsZoomed({}, fullLimits), false);
  assert.equal(plotAxisViewIsZoomed({ xMin: 2, xMax: 8 }, fullLimits), true);
});

test('plotPanelZoomToFitActive is false when zoomed or manual', () => {
  assert.equal(plotPanelZoomToFitActive({}, fullLimits), true);
  assert.equal(plotPanelZoomToFitActive({ xMin: 2, xMax: 8 }, fullLimits), false);
  assert.equal(plotPanelZoomToFitActive({ autoScale: false }, fullLimits), false);
});

test('resolvePlotAxisLimits uses full span for zoom-to-fit', () => {
  assert.deepEqual(resolvePlotAxisLimits({}, fullLimits), fullLimits);
});

test('resolvePlotAxisLimits uses stored manual limits without refitting Y', () => {
  const resolved = resolvePlotAxisLimits(
    { autoScale: false, xMin: 1, xMax: 9, yMin: 0, yMax: 2 },
    fullLimits
  );

  assert.deepEqual(resolved, { xMin: 1, xMax: 9, yMin: 0, yMax: 2 });
});

test('resolvePlotAxisLimits does not refit Y for legacy partial stored fields', () => {
  const resolved = resolvePlotAxisLimits({ xMin: 2, xMax: 8 }, fullLimits);

  assert.deepEqual(resolved, { xMin: 2, xMax: 8, yMin: -1, yMax: 1 });
});
