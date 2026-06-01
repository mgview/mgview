import { computePlotYBounds, type PlotPanelData, type PlotSeries } from './plotSeries.ts';
import type { PlotPanelConfig, Timeline } from './types.ts';

export interface PlotAxisLimits {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
}

const LIMIT_EPSILON = 1e-9;

function plotLimitDecimalPlaces(abs: number): number {
  if (abs >= 100) {
    return 2;
  }

  if (abs >= 10) {
    return 3;
  }

  if (abs >= 1) {
    return 4;
  }

  return 5;
}

export function formatPlotAxisLimit(value: number): string {
  if (!Number.isFinite(value)) {
    return '';
  }

  const abs = Math.abs(value);
  if (abs >= 1e4 || (abs > 0 && abs < 1e-4)) {
    return value.toPrecision(6).replace(/\.?0+(?=[eE])/, '');
  }

  return value.toFixed(plotLimitDecimalPlaces(abs)).replace(/\.?0+$/, '');
}

export function roundPlotAxisLimit(value: number): number {
  if (!Number.isFinite(value)) {
    return value;
  }

  const abs = Math.abs(value);
  if (abs >= 1e4 || (abs > 0 && abs < 1e-4)) {
    return Number(value.toPrecision(6));
  }

  return Number(value.toFixed(plotLimitDecimalPlaces(abs)));
}

export function roundPlotAxisLimits(limits: PlotAxisLimits): PlotAxisLimits {
  return {
    xMin: roundPlotAxisLimit(limits.xMin),
    xMax: roundPlotAxisLimit(limits.xMax),
    yMin: roundPlotAxisLimit(limits.yMin),
    yMax: roundPlotAxisLimit(limits.yMax),
  };
}

export function plotPanelAutoScale(panel: Pick<PlotPanelConfig, 'autoScale'>): boolean {
  return panel.autoScale !== false;
}

export function plotPanelHasStoredAxisFields(
  panel: Pick<PlotPanelConfig, 'xMin' | 'xMax' | 'yMin' | 'yMax'>
): boolean {
  return (
    finitePlotLimit(panel.xMin) != null ||
    finitePlotLimit(panel.xMax) != null ||
    finitePlotLimit(panel.yMin) != null ||
    finitePlotLimit(panel.yMax) != null
  );
}

/** Zoom-to-fit: axes follow data; no stored axis limits and auto-scale not disabled. */
export function plotPanelZoomToFitActive(
  panel: Pick<PlotPanelConfig, 'autoScale' | 'xMin' | 'xMax' | 'yMin' | 'yMax'>,
  fullLimits: PlotAxisLimits | null
): boolean {
  return (
    plotPanelAutoScale(panel) && fullLimits != null && !plotPanelHasStoredAxisFields(panel)
  );
}

export function computeFullPlotAxisLimits(
  panelData: PlotPanelData,
  visibleSeries: PlotSeries[],
  timeline: Timeline,
  isTimePlot: boolean
): PlotAxisLimits | null {
  if (isTimePlot) {
    const { tInitial, tFinal } = timeline;
    const yBounds = computePlotYBounds(panelData.xValues, visibleSeries, tInitial, tFinal);
    if (!yBounds) {
      return null;
    }

    return {
      xMin: tInitial,
      xMax: tFinal,
      yMin: yBounds.yMin,
      yMax: yBounds.yMax,
    };
  }

  const yBounds = computePlotYBounds(panelData.xValues, visibleSeries);
  if (!yBounds) {
    return null;
  }

  let xMinValue = Number.POSITIVE_INFINITY;
  let xMaxValue = Number.NEGATIVE_INFINITY;
  let count = 0;

  for (const xValue of panelData.xValues) {
    if (!Number.isFinite(xValue)) {
      continue;
    }

    xMinValue = Math.min(xMinValue, xValue);
    xMaxValue = Math.max(xMaxValue, xValue);
    count += 1;
  }

  if (count === 0) {
    return null;
  }

  const xPad = Math.max((xMaxValue - xMinValue) * 0.05, 1e-6);

  return {
    xMin: xMinValue - xPad,
    xMax: xMaxValue + xPad,
    yMin: yBounds.yMin,
    yMax: yBounds.yMax,
  };
}

export function finitePlotLimit(value: number | undefined): number | undefined {
  return value != null && Number.isFinite(value) ? value : undefined;
}

function finiteLimit(value: number | undefined): number | undefined {
  return finitePlotLimit(value);
}

export function resolvePlotAxisLimits(
  panel: Pick<PlotPanelConfig, 'autoScale' | 'xMin' | 'xMax' | 'yMin' | 'yMax'>,
  fullLimits: PlotAxisLimits | null
): PlotAxisLimits | null {
  if (!fullLimits) {
    return null;
  }

  if (plotPanelZoomToFitActive(panel, fullLimits)) {
    return fullLimits;
  }

  return {
    xMin: finiteLimit(panel.xMin) ?? fullLimits.xMin,
    xMax: finiteLimit(panel.xMax) ?? fullLimits.xMax,
    yMin: finiteLimit(panel.yMin) ?? fullLimits.yMin,
    yMax: finiteLimit(panel.yMax) ?? fullLimits.yMax,
  };
}

export function plotAxisLimitsDiffer(
  limits: PlotAxisLimits,
  fullLimits: PlotAxisLimits,
  epsilon = LIMIT_EPSILON
): boolean {
  return (
    Math.abs(limits.xMin - fullLimits.xMin) > epsilon ||
    Math.abs(limits.xMax - fullLimits.xMax) > epsilon ||
    Math.abs(limits.yMin - fullLimits.yMin) > epsilon ||
    Math.abs(limits.yMax - fullLimits.yMax) > epsilon
  );
}

export function plotAxisViewIsZoomed(
  panel: Pick<PlotPanelConfig, 'autoScale' | 'xMin' | 'xMax' | 'yMin' | 'yMax'>,
  fullLimits: PlotAxisLimits | null
): boolean {
  if (!fullLimits || plotPanelZoomToFitActive(panel, fullLimits)) {
    return false;
  }

  const limits = resolvePlotAxisLimits(panel, fullLimits);
  if (!limits) {
    return false;
  }

  return plotAxisLimitsDiffer(limits, fullLimits);
}

/** Persist axis view after zoom/pan. Any deviation from full data span is fully manual (all four limits). */
export function buildPersistedPlotAxisFields(
  limits: PlotAxisLimits,
  fullLimits: PlotAxisLimits
): Pick<PlotPanelConfig, 'autoScale' | 'xMin' | 'xMax' | 'yMin' | 'yMax'> {
  const rounded = roundPlotAxisLimits(limits);

  if (!plotAxisLimitsDiffer(rounded, fullLimits)) {
    return {};
  }

  return {
    autoScale: false,
    xMin: rounded.xMin,
    xMax: rounded.xMax,
    yMin: rounded.yMin,
    yMax: rounded.yMax,
  };
}

export function clearPlotAxisFields(panel: PlotPanelConfig): PlotPanelConfig {
  const { autoScale: _autoScale, xMin: _xMin, xMax: _xMax, yMin: _yMin, yMax: _yMax, ...rest } = panel;
  return rest;
}

export function mergePlotAxisFields(
  panel: PlotPanelConfig,
  fields: Pick<PlotPanelConfig, 'autoScale' | 'xMin' | 'xMax' | 'yMin' | 'yMax'> | null
): PlotPanelConfig {
  const cleared = clearPlotAxisFields(panel);
  if (!fields) {
    return cleared;
  }

  return {
    ...cleared,
    ...fields,
  };
}
