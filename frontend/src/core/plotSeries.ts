import type { PlotPanelConfig, PlotPanelXMode, Timeline } from './types.ts';

export interface PlotSeries {
  id: string;
  label: string;
  times: number[];
  values: Array<number | null>;
  missing: boolean;
}

export interface PlotSeriesBundle {
  series: PlotSeries[];
  missingChannels: string[];
}

export interface PlotPanelData {
  xMode: PlotPanelXMode;
  xLabel: string;
  xValues: Array<number | null>;
  times: number[];
  series: PlotSeries[];
  missingChannels: string[];
  xChannel?: string;
  xChannelMissing?: boolean;
}

export function extractPlotSeries(
  timeline: Timeline,
  channels: string[],
  availableChannelNames: readonly string[]
): PlotSeriesBundle {
  const available = new Set(availableChannelNames);
  const times = timeline.frames.map((frame) => frame.time);
  const missingChannels: string[] = [];
  const series: PlotSeries[] = [];

  for (const channel of channels) {
    if (!available.has(channel)) {
      missingChannels.push(channel);
      series.push({
        id: channel,
        label: channel,
        times,
        values: times.map(() => null),
        missing: true,
      });
      continue;
    }

    series.push({
      id: channel,
      label: channel,
      times,
      values: timeline.frames.map((frame) => frame.data[channel] ?? null),
      missing: false,
    });
  }

  return { series, missingChannels };
}

export function extractPlotPanelData(
  timeline: Timeline,
  panel: Pick<PlotPanelConfig, 'channels' | 'xMode' | 'xChannel'>,
  availableChannelNames: readonly string[]
): PlotPanelData {
  const xMode = panel.xMode ?? 'time';
  const times = timeline.frames.map((frame) => frame.time);
  const bundle = extractPlotSeries(timeline, panel.channels, availableChannelNames);

  if (xMode === 'channel') {
    const xChannel = panel.xChannel?.trim();
    if (!xChannel) {
      return {
        xMode,
        xLabel: 'X',
        xValues: times,
        times,
        series: bundle.series,
        missingChannels: bundle.missingChannels,
      };
    }

    const available = new Set(availableChannelNames);
    if (!available.has(xChannel)) {
      return {
        xMode,
        xLabel: xChannel,
        xValues: times.map(() => null),
        times,
        series: bundle.series,
        missingChannels: bundle.missingChannels,
        xChannel,
        xChannelMissing: true,
      };
    }

    return {
      xMode,
      xLabel: xChannel,
      xValues: timeline.frames.map((frame) => frame.data[xChannel] ?? null),
      times,
      series: bundle.series,
      missingChannels: bundle.missingChannels,
      xChannel,
    };
  }

  return {
    xMode: 'time',
    xLabel: 't',
    xValues: times,
    times,
    series: bundle.series,
    missingChannels: bundle.missingChannels,
  };
}

/** Y-axis bounds with 5% padding; optional X window filters samples (time zoom). */
export function computePlotYBounds(
  xValues: Array<number | null>,
  seriesList: PlotSeries[],
  xMin?: number | null,
  xMax?: number | null
): { yMin: number; yMax: number } | null {
  let yMinValue = Number.POSITIVE_INFINITY;
  let yMaxValue = Number.NEGATIVE_INFINITY;
  let count = 0;

  for (const series of seriesList) {
    if (series.missing) {
      continue;
    }

    for (let index = 0; index < series.values.length; index += 1) {
      const xValue = xValues[index];
      if (
        xMin != null &&
        xMax != null &&
        Number.isFinite(xValue) &&
        (xValue < xMin || xValue > xMax)
      ) {
        continue;
      }

      const yValue = series.values[index];
      if (!Number.isFinite(yValue)) {
        continue;
      }

      yMinValue = Math.min(yMinValue, yValue);
      yMaxValue = Math.max(yMaxValue, yValue);
      count += 1;
    }
  }

  if (count === 0) {
    return null;
  }

  if (yMinValue === yMaxValue) {
    const pad = Math.max(Math.abs(yMinValue) * 0.05, 1e-6);
    return { yMin: yMinValue - pad, yMax: yMaxValue + pad };
  }

  const yPad = Math.max((yMaxValue - yMinValue) * 0.05, 1e-6);
  return { yMin: yMinValue - yPad, yMax: yMaxValue + yPad };
}
