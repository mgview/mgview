import { computePlotYBounds, type PlotPanelData, type PlotSeries } from './plotSeries.ts';
import type { PlotPanelConfig, Timeline } from './types.ts';

export interface PlotAxisLimits {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
}

const LIMIT_EPSILON = 1e-9;

export function plotPanelAutoScale(panel: Pick<PlotPanelConfig, 'autoScale'>): boolean {
  return panel.autoScale !== false;
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
  fullLimits: PlotAxisLimits | null,
  panelData: PlotPanelData,
  visibleSeries: PlotSeries[],
  isTimePlot: boolean
): PlotAxisLimits | null {
  if (!fullLimits) {
    return null;
  }

  const autoScale = plotPanelAutoScale(panel);
  const storedXMin = finiteLimit(panel.xMin);
  const storedXMax = finiteLimit(panel.xMax);
  const storedYMin = finiteLimit(panel.yMin);
  const storedYMax = finiteLimit(panel.yMax);

  if (!autoScale) {
    return {
      xMin: storedXMin ?? fullLimits.xMin,
      xMax: storedXMax ?? fullLimits.xMax,
      yMin: storedYMin ?? fullLimits.yMin,
      yMax: storedYMax ?? fullLimits.yMax,
    };
  }

  if (isTimePlot) {
    const xMin = storedXMin ?? fullLimits.xMin;
    const xMax = storedXMax ?? fullLimits.xMax;
    const yBounds = computePlotYBounds(panelData.xValues, visibleSeries, xMin, xMax);
    if (!yBounds) {
      return fullLimits;
    }

    return { xMin, xMax, yMin: yBounds.yMin, yMax: yBounds.yMax };
  }

  if (
    storedXMin != null &&
    storedXMax != null &&
    storedYMin != null &&
    storedYMax != null
  ) {
    return {
      xMin: storedXMin,
      xMax: storedXMax,
      yMin: storedYMin,
      yMax: storedYMax,
    };
  }

  return fullLimits;
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
  fullLimits: PlotAxisLimits | null,
  isTimePlot: boolean
): boolean {
  if (!fullLimits) {
    return false;
  }

  if (!plotPanelAutoScale(panel)) {
    const limits: PlotAxisLimits = {
      xMin: finiteLimit(panel.xMin) ?? fullLimits.xMin,
      xMax: finiteLimit(panel.xMax) ?? fullLimits.xMax,
      yMin: finiteLimit(panel.yMin) ?? fullLimits.yMin,
      yMax: finiteLimit(panel.yMax) ?? fullLimits.yMax,
    };
    return plotAxisLimitsDiffer(limits, fullLimits);
  }

  if (isTimePlot) {
    const xMin = finiteLimit(panel.xMin);
    const xMax = finiteLimit(panel.xMax);
    if (xMin == null && xMax == null) {
      return false;
    }

    return (
      (xMin != null && Math.abs(xMin - fullLimits.xMin) > LIMIT_EPSILON) ||
      (xMax != null && Math.abs(xMax - fullLimits.xMax) > LIMIT_EPSILON)
    );
  }

  return (
    finiteLimit(panel.xMin) != null &&
    finiteLimit(panel.xMax) != null &&
    finiteLimit(panel.yMin) != null &&
    finiteLimit(panel.yMax) != null
  );
}

export function buildPersistedPlotAxisFields(
  autoScale: boolean,
  limits: PlotAxisLimits,
  fullLimits: PlotAxisLimits,
  isTimePlot: boolean
): Pick<PlotPanelConfig, 'autoScale' | 'xMin' | 'xMax' | 'yMin' | 'yMax'> {
  if (!autoScale) {
    return {
      autoScale: false,
      xMin: limits.xMin,
      xMax: limits.xMax,
      yMin: limits.yMin,
      yMax: limits.yMax,
    };
  }

  if (isTimePlot) {
    const xZoomed =
      Math.abs(limits.xMin - fullLimits.xMin) > LIMIT_EPSILON ||
      Math.abs(limits.xMax - fullLimits.xMax) > LIMIT_EPSILON;

    if (!xZoomed) {
      return {};
    }

    return { xMin: limits.xMin, xMax: limits.xMax };
  }

  if (!plotAxisLimitsDiffer(limits, fullLimits)) {
    return {};
  }

  return {
    xMin: limits.xMin,
    xMax: limits.xMax,
    yMin: limits.yMin,
    yMax: limits.yMax,
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
