import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from 'react';
import uPlot from 'uplot';
import 'uplot/dist/uPlot.min.css';
import { ArrowLeftRight, Focus, Settings, Square, X } from 'lucide-react';
import {
  buildPersistedPlotAxisFields,
  computeFullPlotAxisLimits,
  formatPlotAxisLimit,
  plotPanelAutoScale,
  plotPanelZoomToFitActive,
  resolvePlotAxisLimits,
  roundPlotAxisLimits,
  type PlotAxisLimits,
} from '../core/plotAxisConfig.ts';
import type { PlotPanelData } from '../core/plotSeries.ts';
import { getFrameIndexAtTime } from '../core/timeline.ts';
import { readPlotThemeColors } from '../core/plotTheme.ts';
import type { PlotPanelConfig, PlotPanelXMode, Timeline } from '../core/types.ts';
import { cn } from '../lib/utils.ts';
import PlotChannelPicker from './PlotChannelPicker.tsx';
import { useTheme } from './ThemeProvider.tsx';
import { Button } from './ui/button.tsx';
import { Input } from './ui/input.tsx';
import { Label } from './ui/label.tsx';

const PLOT_HEIGHT_DEFAULT = 220;
/** Total uPlot height for Y vs X (axes included; see uPlot `setSize`). */
const PLOT_XY_DEFAULT_HEIGHT = 228;

function scalePlotTotalHeight(baseHeight: number, heightScale: number): number {
  return Math.max(1, Math.round(baseHeight * heightScale));
}
/** Reserved below ticks for the X channel name (`labelGap` draws inside this band). */
const PLOT_XY_AXIS_LABEL_SIZE = 18;
const PLOT_XY_AXIS_LABEL_GAP = 2;
const SQUARE_PLOT_SIZE_MAX_PASSES = 4;
/** Square aspect UI is disabled until sizing is fixed — see mgview-plot-square-aspect.md */
const SQUARE_ASPECT_UI_ENABLED = false;
const MANUAL_ZOOM_SENSITIVITY = 100;

/**
 * Right-drag pan tuning (see `panDataShiftFromPixelDelta` / `applyManualPan`).
 * Multiplies how far the axis moves per mouse pixel. Use `chart.rect` (CSS plot area) as
 * the divisor; tweak this if pan still feels slightly off after that.
 * - Plot lags the cursor → increase (try 1.2–1.4)
 * - Plot runs ahead of the cursor → decrease (try 0.8–0.9)
 */
const PAN_DRAG_SCALE = 1;

function plotAreaPointerFromClient(chart: uPlot, clientX: number, clientY: number) {
  const rect = chart.rect;
  return {
    x: clientX - rect.left,
    y: clientY - rect.top,
    width: Math.max(rect.width, 1),
    height: Math.max(rect.height, 1),
  };
}

function panDataShiftFromPixelDelta(
  deltaPixels: number,
  axisSpan: number,
  plotAxisPixels: number,
  scale = PAN_DRAG_SCALE
): number {
  return (deltaPixels / Math.max(plotAxisPixels, 1)) * axisSpan * scale;
}

function zoomAxisRange(min: number, max: number, deltaPixels: number): [number, number] {
  const factor = Math.exp(-deltaPixels / MANUAL_ZOOM_SENSITIVITY);
  const center = (min + max) / 2;
  const half = ((max - min) / 2) / factor;
  return [center - half, center + half];
}

function isTextEditingTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    (target instanceof HTMLElement && target.isContentEditable)
  );
}

/** Drawable plot area from uPlot layout (`bbox` / `pxRatio`). Pan uses `chart.rect`. */
function plotAreaBboxCss(chart: uPlot): { width: number; height: number } | null {
  const pxRatio = chart.pxRatio;
  const width = chart.bbox.width / pxRatio;
  const height = chart.bbox.height / pxRatio;
  if (
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width <= 0 ||
    height <= 0
  ) {
    return null;
  }

  return { width, height };
}

/** Vertical space for axes below/above the drawable plot (ticks + X label). */
function plotAxisChromeHeight(chart: uPlot): number {
  const area = plotAreaBboxCss(chart);
  if (!area) {
    return 0;
  }

  return Math.max(0, chart.height - area.height);
}

/**
 * Max total uPlot height for square mode: square drawable side ≈ host width minus
 * Y-axis, plus axis chrome — never viewport-scale.
 */
function maxSquarePlotTotalHeight(hostWidth: number, heightScale: number): number {
  return scalePlotTotalHeight(hostWidth + 64, heightScale);
}

function applySquarePlotSize(chart: uPlot, hostWidth: number, heightScale: number): void {
  const maxHeight = maxSquarePlotTotalHeight(hostWidth, heightScale);

  if (chart.width !== hostWidth) {
    chart.setSize({ width: hostWidth, height: chart.height });
  }

  for (let pass = 0; pass < SQUARE_PLOT_SIZE_MAX_PASSES; pass++) {
    const area = plotAreaBboxCss(chart);
    if (!area) {
      return;
    }

    const { width: plotW, height: plotH } = area;
    if (Math.abs(plotW - plotH) < 0.5) {
      return;
    }

    const targetHeight = Math.min(
      scalePlotTotalHeight(plotW + plotAxisChromeHeight(chart), heightScale),
      maxHeight
    );
    if (targetHeight === chart.height) {
      return;
    }

    chart.setSize({ width: hostWidth, height: targetHeight });
  }
}

function applyPlotSize(
  chart: uPlot,
  hostWidth: number,
  squareAspect: boolean,
  isTimePlot: boolean,
  heightScale: number
): void {
  if (isTimePlot) {
    chart.setSize({
      width: hostWidth,
      height: scalePlotTotalHeight(PLOT_HEIGHT_DEFAULT, heightScale),
    });
    return;
  }

  if (squareAspect) {
    applySquarePlotSize(chart, hostWidth, heightScale);
    return;
  }

  chart.setSize({
    width: hostWidth,
    height: scalePlotTotalHeight(PLOT_XY_DEFAULT_HEIGHT, heightScale),
  });
}

function plotSizeNeedsUpdate(
  chart: uPlot,
  hostWidth: number,
  squareAspect: boolean,
  isTimePlot: boolean,
  heightScale: number
): boolean {
  if (chart.width !== hostWidth) {
    return true;
  }

  if (isTimePlot) {
    return chart.height !== scalePlotTotalHeight(PLOT_HEIGHT_DEFAULT, heightScale);
  }

  if (squareAspect) {
    const area = plotAreaBboxCss(chart);
    if (!area) {
      return true;
    }

    return Math.abs(area.width - area.height) >= 0.5;
  }

  return chart.height !== scalePlotTotalHeight(PLOT_XY_DEFAULT_HEIGHT, heightScale);
}

type PersistedPlotAxisFields = Pick<PlotPanelConfig, 'autoScale' | 'xMin' | 'xMax' | 'yMin' | 'yMax'>;

interface PlotPanelProps {
  title?: string;
  xMode: PlotPanelXMode;
  xChannel?: string;
  yChannelScale?: number;
  xChannelScale?: number;
  channels: string[];
  channelNames: string[];
  autoScale?: boolean;
  xMin?: number;
  xMax?: number;
  yMin?: number;
  yMax?: number;
  panelData: PlotPanelData;
  timeline: Timeline;
  currentTimeRef: RefObject<number>;
  panelIndex: number;
  /** Multiplier on default plot height (Y vs t and Y vs X bases). */
  heightScale?: number;
  onChangeTime: (time: number) => void;
  onChangeTitle: (title: string | undefined) => void;
  onChangeXMode: (xMode: PlotPanelXMode) => void;
  onChangeXChannel: (xChannel: string | undefined) => void;
  onChangeChannels: (channels: string[]) => void;
  onChangeYChannelScale: (scale: number | undefined) => void;
  onChangeXChannelScale: (scale: number | undefined) => void;
  onChangeAxisView: (fields: PersistedPlotAxisFields | null) => void;
  onSwapXyChannels: () => void;
  onRemove: () => void;
}

function PlotPanel({
  title,
  xMode,
  xChannel,
  yChannelScale,
  xChannelScale,
  channels,
  channelNames,
  panelData,
  timeline,
  currentTimeRef,
  panelIndex,
  heightScale: heightScaleProp = 1,
  autoScale: autoScaleProp,
  xMin: storedXMin,
  xMax: storedXMax,
  yMin: storedYMin,
  yMax: storedYMax,
  onChangeTime,
  onChangeTitle,
  onChangeXMode,
  onChangeXChannel,
  onChangeChannels,
  onChangeYChannelScale,
  onChangeXChannelScale,
  onChangeAxisView,
  onSwapXyChannels,
  onRemove,
}: PlotPanelProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const xyMarkerRef = useRef<HTMLDivElement>(null);
  const plotRef = useRef<uPlot | null>(null);
  const scrubbingRef = useRef(false);
  const manualZoomRef = useRef<{
    startClientX: number;
    startClientY: number;
    startLimits: PlotAxisLimits;
  } | null>(null);
  const panningRef = useRef<{
    startPlotX: number;
    startPlotY: number;
    startLimits: PlotAxisLimits;
  } | null>(null);
  const liveDragLimitsRef = useRef<PlotAxisLimits | null>(null);
  const activePointerIdRef = useRef<number | null>(null);
  const plotLimitsRef = useRef<PlotAxisLimits | null>(null);
  const autoScaleRef = useRef(true);
  const squareAspectRef = useRef(false);
  const heightScaleRef = useRef(heightScaleProp);
  /** Last host width applied; ignore ResizeObserver height-only churn from square sizing. */
  const hostLayoutWidthRef = useRef(0);
  const plotHoveredRef = useRef(false);
  const breakViewLatchesRef = useRef<() => void>(() => { });
  const onChangeTimeRef = useRef(onChangeTime);
  const onChangeAxisViewRef = useRef(onChangeAxisView);
  const timelineRef = useRef(timeline);
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const axisPanel = useMemo(
    () => ({ autoScale: autoScaleProp, xMin: storedXMin, xMax: storedXMax, yMin: storedYMin, yMax: storedYMax }),
    [autoScaleProp, storedXMax, storedXMin, storedYMax, storedYMin]
  );
  const autoScale = plotPanelAutoScale(axisPanel);
  const [dragLimits, setDragLimits] = useState<PlotAxisLimits | null>(null);
  const [editingLimitKey, setEditingLimitKey] = useState<keyof PlotAxisLimits | null>(null);
  const [editingLimitDraft, setEditingLimitDraft] = useState('');
  const [showSettings, setShowSettings] = useState(channels.length === 0);
  const [squareAspect, setSquareAspect] = useState(false);
  /** Optimistic: zoom-to-fit button dims as soon as a zoom/pan gesture starts. */
  const [zoomToFitUiOff, setZoomToFitUiOff] = useState(false);
  const [xyChannelFilter, setXyChannelFilter] = useState('');
  const [editingChannelScale, setEditingChannelScale] = useState<'y' | 'x' | null>(null);
  const [editingChannelScaleDraft, setEditingChannelScaleDraft] = useState('');

  onChangeTimeRef.current = onChangeTime;
  onChangeAxisViewRef.current = onChangeAxisView;
  timelineRef.current = timeline;

  useEffect(() => {
    autoScaleRef.current = autoScale;
  }, [autoScale]);

  const { tInitial, tFinal } = timeline;

  const isTimePlot = (xMode ?? 'time') === 'time';
  const visibleSeries = useMemo(
    () => (isTimePlot ? panelData.series : panelData.series.slice(0, 1)),
    [isTimePlot, panelData.series]
  );

  const fullPlotLimits = useMemo(
    () => computeFullPlotAxisLimits(panelData, visibleSeries, timeline, isTimePlot),
    [isTimePlot, panelData, timeline, visibleSeries]
  );

  const zoomToFitActive = plotPanelZoomToFitActive(axisPanel, fullPlotLimits);
  const zoomToFitUiActive = zoomToFitActive && !zoomToFitUiOff;

  useEffect(() => {
    if (zoomToFitActive) {
      setZoomToFitUiOff(false);
    }
  }, [zoomToFitActive]);

  squareAspectRef.current = squareAspect;
  heightScaleRef.current = heightScaleProp;

  const resolvedPlotLimits = useMemo(
    () => resolvePlotAxisLimits(axisPanel, fullPlotLimits),
    [axisPanel, fullPlotLimits]
  );

  const plotLimits = dragLimits ?? resolvedPlotLimits;
  plotLimitsRef.current = plotLimits;

  const plotData = useMemo((): uPlot.AlignedData => {
    return [panelData.xValues, ...visibleSeries.map((series) => series.values)];
  }, [panelData.xValues, visibleSeries]);

  const colors = useMemo(
    () => readPlotThemeColors(visibleSeries.length, isDark),
    [isDark, visibleSeries.length]
  );

  const panelSignature = [
    panelData.xMode,
    panelData.xChannel ?? '',
    panelData.series.map((series) => series.id).join('\0'),
  ].join('\n');
  const hasRenderableSeries = isTimePlot
    ? visibleSeries.some((series) => !series.missing && series.times.length > 0)
    : Boolean(
      xChannel &&
      !panelData.xChannelMissing &&
      visibleSeries.some((series) => !series.missing && series.times.length > 0)
    );

  const yAxisLabel = !isTimePlot ? visibleSeries[0]?.label ?? 'Y' : undefined;

  const readChartLimits = (chart: uPlot): PlotAxisLimits | null => {
    const { min: xMin, max: xMax } = chart.scales.x;
    const { min: yMin, max: yMax } = chart.scales.y;
    if (
      xMin == null ||
      xMax == null ||
      yMin == null ||
      yMax == null ||
      !Number.isFinite(xMin) ||
      !Number.isFinite(xMax) ||
      !Number.isFinite(yMin) ||
      !Number.isFinite(yMax)
    ) {
      return null;
    }

    return { xMin, xMax, yMin, yMax };
  };

  const commitAxisLimitsRef = useRef<(limits: PlotAxisLimits) => void>(() => { });
  commitAxisLimitsRef.current = (limits: PlotAxisLimits) => {
    if (!fullPlotLimits) {
      return;
    }

    setDragLimits(null);
    liveDragLimitsRef.current = null;
    onChangeAxisViewRef.current(
      buildPersistedPlotAxisFields(roundPlotAxisLimits(limits), fullPlotLimits)
    );
    if (!isTimePlot) {
      setSquareAspect(false);
    }
  };

  breakViewLatchesRef.current = () => {
    setZoomToFitUiOff(true);
    autoScaleRef.current = false;
    if (!isTimePlot) {
      setSquareAspect(false);
    }
  };

  const trimmedXyChannelFilter = xyChannelFilter.trim().toLowerCase();
  const filteredChannelNames = useMemo(() => {
    if (!trimmedXyChannelFilter) {
      return channelNames;
    }

    return channelNames.filter((channelName) => channelName.toLowerCase().includes(trimmedXyChannelFilter));
  }, [channelNames, trimmedXyChannelFilter]);
  const selectedYChannel = channels[0] ?? '';
  const resolvedYChannelScale = yChannelScale != null && Number.isFinite(yChannelScale) ? yChannelScale : 1;
  const resolvedXChannelScale = xChannelScale != null && Number.isFinite(xChannelScale) ? xChannelScale : 1;

  const channelScaleInputValue = (axis: 'y' | 'x', scale: number) =>
    editingChannelScale === axis ? editingChannelScaleDraft : formatPlotAxisLimit(scale);

  const beginEditingChannelScale = (axis: 'y' | 'x', scale: number) => {
    setEditingChannelScale(axis);
    setEditingChannelScaleDraft(formatPlotAxisLimit(scale));
  };

  const finishEditingChannelScale = (axis: 'y' | 'x', rawValue: string) => {
    setEditingChannelScale(null);
    setEditingChannelScaleDraft('');
    const parsed = Number.parseFloat(rawValue.trim());
    const nextScale = Number.isFinite(parsed) ? parsed : 1;
    if (axis === 'y') {
      onChangeYChannelScale(nextScale === 1 ? undefined : nextScale);
      return;
    }

    onChangeXChannelScale(nextScale === 1 ? undefined : nextScale);
  };

  const ensureXyMarker = (plot: uPlot) => {
    if (isTimePlot) {
      return;
    }

    let marker = xyMarkerRef.current;
    if (!marker) {
      marker = document.createElement('div');
      marker.className = 'plot-xy-marker';
      xyMarkerRef.current = marker;
    }

    if (marker.parentElement !== plot.over) {
      plot.over.appendChild(marker);
    }
  };

  const syncPlaybackCursorRef = useRef<(plot: uPlot, time: number) => void>(() => { });

  const syncPlaybackCursor = (plot: uPlot, time: number) => {
    if (isTimePlot) {
      if (xyMarkerRef.current) {
        xyMarkerRef.current.style.opacity = '0';
      }
      plot.setCursor({ left: plot.valToPos(time, 'x'), top: 0 });
      return;
    }

    ensureXyMarker(plot);

    const idx = getFrameIndexAtTime(timelineRef.current, time);
    const xValue = panelData.xValues[idx];
    const yValue = visibleSeries[0]?.values[idx];
    if (!Number.isFinite(xValue) || !Number.isFinite(yValue)) {
      if (xyMarkerRef.current) {
        xyMarkerRef.current.style.opacity = '0';
      }
      return;
    }

    const left = plot.valToPos(xValue, 'x');
    const top = plot.valToPos(yValue, 'y');
    plot.setCursor({ left, top });

    if (xyMarkerRef.current) {
      xyMarkerRef.current.style.opacity = '1';
      xyMarkerRef.current.style.left = `${left}px`;
      xyMarkerRef.current.style.top = `${top}px`;
    }
  };

  syncPlaybackCursorRef.current = syncPlaybackCursor;

  const scrubToPointer = (plot: uPlot, clientX: number, clientY: number) => {
    if (isTimePlot) {
      const left = clientX - plot.over.getBoundingClientRect().left;
      const time = plot.posToVal(left, 'x');
      if (!Number.isFinite(time)) {
        return;
      }

      onChangeTimeRef.current(Math.min(tFinal, Math.max(tInitial, time)));
      return;
    }

    const rect = plot.over.getBoundingClientRect();
    const left = clientX - rect.left;
    const top = clientY - rect.top;
    const yValues = visibleSeries[0]?.values;
    if (!yValues?.length) {
      return;
    }

    let bestIndex = 0;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (let index = 0; index < yValues.length; index += 1) {
      const xValue = panelData.xValues[index];
      const yValue = yValues[index];
      if (!Number.isFinite(xValue) || !Number.isFinite(yValue)) {
        continue;
      }

      const px = plot.valToPos(xValue, 'x');
      const py = plot.valToPos(yValue, 'y');
      const distance = (px - left) ** 2 + (py - top) ** 2;
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = index;
      }
    }

    const frameTime = panelData.times[bestIndex];
    if (Number.isFinite(frameTime)) {
      onChangeTimeRef.current(frameTime);
    }
  };

  const panelSignatureRef = useRef(panelSignature);
  useEffect(() => {
    if (panelSignatureRef.current === panelSignature) {
      return;
    }

    panelSignatureRef.current = panelSignature;
    setDragLimits(null);
    onChangeAxisView(null);
  }, [onChangeAxisView, panelSignature]);

  useEffect(() => {
    if (isTimePlot) {
      setSquareAspect(false);
    }
  }, [isTimePlot]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!SQUARE_ASPECT_UI_ENABLED || isTimePlot || event.defaultPrevented || event.repeat) {
        return;
      }

      if (event.key !== '1' || event.ctrlKey || event.metaKey || event.altKey) {
        return;
      }

      if (isTextEditingTarget(event.target)) {
        return;
      }

      const section = sectionRef.current;
      if (!section) {
        return;
      }

      const activeInSection = section.contains(document.activeElement);
      if (!activeInSection && !plotHoveredRef.current) {
        return;
      }

      event.preventDefault();
      setSquareAspect((current) => !current);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isTimePlot]);

  const modeToggle = (
    <div className="flex shrink-0 items-center rounded-md border border-border p-0.5">
      <Button
        type="button"
        variant={isTimePlot ? 'default' : 'ghost'}
        size="sm"
        className="h-7 px-2 text-[0.68rem]"
        onClick={() => onChangeXMode('time')}
      >
        Y vs t
      </Button>
      <Button
        type="button"
        variant={!isTimePlot ? 'default' : 'ghost'}
        size="sm"
        className="h-7 px-2 text-[0.68rem]"
        onClick={() => onChangeXMode('channel')}
      >
        Y vs X
      </Button>
    </div>
  );

  useLayoutEffect(() => {
    const host = hostRef.current;
    const plot = plotRef.current;
    if (host && plot && plot.root.parentElement !== host) {
      host.replaceChildren(plot.root);
    }
  });

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !hasRenderableSeries) {
      plotRef.current?.destroy();
      plotRef.current = null;
      return;
    }

    let cancelled = false;
    let plot: uPlot | null = null;
    let resizeObserver: ResizeObserver | null = null;
    let cursorFrameId = 0;
    let detachScrubHandlers: (() => void) | null = null;
    let lastCursorTime: number | null = null;

    const attachScrubHandlers = (chart: uPlot) => {
      const getCurrentLimits = (): PlotAxisLimits | null =>
        liveDragLimitsRef.current ?? readChartLimits(chart) ?? plotLimitsRef.current;

      const setChartLimits = (limits: PlotAxisLimits) => {
        liveDragLimitsRef.current = limits;
        chart.setScale('x', { min: limits.xMin, max: limits.xMax });
        chart.setScale('y', { min: limits.yMin, max: limits.yMax });
      };

      const releasePlotPointer = (event: PointerEvent) => {
        if (chart.over.hasPointerCapture(event.pointerId)) {
          chart.over.releasePointerCapture(event.pointerId);
        }
      };

      const commitLiveDragLimits = () => {
        const limits = liveDragLimitsRef.current ?? readChartLimits(chart);
        liveDragLimitsRef.current = null;
        if (limits) {
          commitAxisLimitsRef.current(limits);
        }
      };

      const clearGestureState = () => {
        scrubbingRef.current = false;
        manualZoomRef.current = null;
        panningRef.current = null;
        activePointerIdRef.current = null;
      };

      const beginPointerGesture = (event: PointerEvent) => {
        if (
          activePointerIdRef.current !== null &&
          activePointerIdRef.current !== event.pointerId
        ) {
          if (panningRef.current || manualZoomRef.current) {
            commitLiveDragLimits();
          }
          clearGestureState();
        }

        activePointerIdRef.current = event.pointerId;
        chart.over.setPointerCapture(event.pointerId);
      };

      const applyManualPan = (event: PointerEvent) => {
        const panState = panningRef.current;
        if (!panState) {
          return;
        }

        const { startLimits, startPlotX, startPlotY } = panState;
        const pointer = plotAreaPointerFromClient(chart, event.clientX, event.clientY);
        const xSpan = startLimits.xMax - startLimits.xMin;
        const ySpan = startLimits.yMax - startLimits.yMin;
        const dxVal = panDataShiftFromPixelDelta(
          startPlotX - pointer.x,
          xSpan,
          pointer.width
        );
        const dyVal = panDataShiftFromPixelDelta(
          pointer.y - startPlotY,
          ySpan,
          pointer.height
        );

        setChartLimits({
          xMin: startLimits.xMin + dxVal,
          xMax: startLimits.xMax + dxVal,
          yMin: startLimits.yMin + dyVal,
          yMax: startLimits.yMax + dyVal,
        });
      };

      const applyManualAxisZoom = (event: PointerEvent) => {
        const zoomState = manualZoomRef.current;
        if (!zoomState) {
          return;
        }

        const deltaX = event.clientX - zoomState.startClientX;
        const deltaY = event.clientY - zoomState.startClientY;
        const [xMin, xMax] = zoomAxisRange(
          zoomState.startLimits.xMin,
          zoomState.startLimits.xMax,
          -deltaX
        );
        const [yMin, yMax] = zoomAxisRange(
          zoomState.startLimits.yMin,
          zoomState.startLimits.yMax,
          deltaY
        );

        setChartLimits({ xMin, xMax, yMin, yMax });
      };

      const onPointerDown = (event: PointerEvent) => {
        if (event.button === 2) {
          event.preventDefault();
          const limits = getCurrentLimits();
          if (!limits) {
            return;
          }

          breakViewLatchesRef.current();
          scrubbingRef.current = false;
          manualZoomRef.current = null;
          const pointer = plotAreaPointerFromClient(chart, event.clientX, event.clientY);
          panningRef.current = {
            startPlotX: pointer.x,
            startPlotY: pointer.y,
            startLimits: limits,
          };
          beginPointerGesture(event);
          return;
        }

        if (event.button !== 0) {
          return;
        }

        if (event.shiftKey) {
          event.preventDefault();
          event.stopPropagation();
          scrubbingRef.current = false;
          panningRef.current = null;

          const limits = getCurrentLimits();
          if (!limits) {
            return;
          }

          breakViewLatchesRef.current();
          manualZoomRef.current = {
            startClientX: event.clientX,
            startClientY: event.clientY,
            startLimits: limits,
          };
          beginPointerGesture(event);
          return;
        }

        manualZoomRef.current = null;
        panningRef.current = null;
        scrubbingRef.current = true;
        beginPointerGesture(event);
        scrubToPointer(chart, event.clientX, event.clientY);
      };

      const onPointerMove = (event: PointerEvent) => {
        if (manualZoomRef.current) {
          applyManualAxisZoom(event);
          return;
        }

        if (panningRef.current) {
          applyManualPan(event);
          return;
        }

        if (!scrubbingRef.current || (event.buttons & 1) === 0) {
          return;
        }

        scrubToPointer(chart, event.clientX, event.clientY);
      };

      const endPointer = (event: PointerEvent) => {
        if (activePointerIdRef.current !== event.pointerId) {
          return;
        }

        activePointerIdRef.current = null;
        releasePlotPointer(event);

        if (manualZoomRef.current) {
          manualZoomRef.current = null;
          commitLiveDragLimits();
          return;
        }

        if (panningRef.current) {
          panningRef.current = null;
          commitLiveDragLimits();
          return;
        }

        if (!scrubbingRef.current) {
          return;
        }

        scrubbingRef.current = false;
        syncPlaybackCursor(chart, currentTimeRef.current ?? tInitial);
        lastCursorTime = currentTimeRef.current ?? tInitial;
      };

      const onContextMenu = (event: MouseEvent) => {
        event.preventDefault();
      };

      chart.over.addEventListener('pointerdown', onPointerDown);
      chart.over.addEventListener('pointermove', onPointerMove);
      chart.over.addEventListener('pointerup', endPointer);
      chart.over.addEventListener('pointercancel', endPointer);
      chart.over.addEventListener('lostpointercapture', endPointer);
      chart.over.addEventListener('contextmenu', onContextMenu);

      return () => {
        chart.over.removeEventListener('pointerdown', onPointerDown);
        chart.over.removeEventListener('pointermove', onPointerMove);
        chart.over.removeEventListener('pointerup', endPointer);
        chart.over.removeEventListener('pointercancel', endPointer);
        chart.over.removeEventListener('lostpointercapture', endPointer);
        chart.over.removeEventListener('contextmenu', onContextMenu);
        clearGestureState();
        liveDragLimitsRef.current = null;
      };
    };

    const buildOptions = (width: number): uPlot.Options => {
      const baseHeight = isTimePlot ? PLOT_HEIGHT_DEFAULT : PLOT_XY_DEFAULT_HEIGHT;
      const height = scalePlotTotalHeight(baseHeight, heightScaleRef.current);

      return {
        width,
        height,
        scales: {
          x: {
            time: false,
            auto: false,
            ...(plotLimits
              ? { min: plotLimits.xMin, max: plotLimits.xMax }
              : {}),
          },
          y: {
            auto: false,
            ...(plotLimits
              ? { min: plotLimits.yMin, max: plotLimits.yMax }
              : {}),
          },
        },
        axes: [
          {
            label: isTimePlot ? undefined : panelData.xLabel,
            labelSize: isTimePlot ? 0 : PLOT_XY_AXIS_LABEL_SIZE,
            labelGap: isTimePlot ? 0 : PLOT_XY_AXIS_LABEL_GAP,
            stroke: colors.axis,
            grid: { stroke: colors.grid, width: 1 },
            ticks: { stroke: colors.grid },
            font: '11px IBM Plex Mono, ui-monospace, monospace',
          },
          {
            label: isTimePlot ? undefined : yAxisLabel,
            stroke: colors.axis,
            grid: { stroke: colors.grid, width: 1 },
            ticks: { stroke: colors.grid },
            font: '11px IBM Plex Mono, ui-monospace, monospace',
          },
        ],
        series: [
          {},
          ...visibleSeries.map((series, index) => ({
            label: series.label,
            stroke: series.missing ? colors.grid : colors.series[index],
            width: series.missing ? 1 : 1.5,
            dash: series.missing ? [6, 6] : undefined,
            points: { show: false },
            // XY traces can have non-monotonic X values; disable sorted-X assumption.
            sorted: isTimePlot ? 1 : 0,
          })),
        ],
        legend: { show: false },
        cursor: {
          show: true,
          points: { show: false },
          drag: { x: false, y: false, setScale: false },
        },
        select: { show: false },
        hooks: {
          ready: [
            (chart) => {
              syncPlaybackCursor(chart, currentTimeRef.current ?? tInitial);
            },
          ],
          setSize: [
            (chart) => {
              if (!isTimePlot) {
                syncPlaybackCursor(chart, currentTimeRef.current ?? tInitial);
              }
            },
          ],
        },
      };
    };

    const createPlot = (width: number) => {
      plot = new uPlot(buildOptions(width), plotData, host);
      plotRef.current = plot;
      detachScrubHandlers = attachScrubHandlers(plot) ?? null;
      const initialTime = currentTimeRef.current ?? tInitial;
      syncPlaybackCursor(plot, initialTime);
      lastCursorTime = initialTime;
    };

    const ensurePlotSize = () => {
      if (cancelled) {
        return;
      }

      const width = host.clientWidth;
      if (width <= 0) {
        return;
      }

      if (!plot) {
        createPlot(width);
        return;
      }

      if (
        plotSizeNeedsUpdate(plot, width, squareAspectRef.current, isTimePlot, heightScaleRef.current)
      ) {
        applyPlotSize(plot, width, squareAspectRef.current, isTimePlot, heightScaleRef.current);
        syncPlaybackCursor(plot, currentTimeRef.current ?? tInitial);
      }

      hostLayoutWidthRef.current = width;
    };

    const syncCursorLoop = () => {
      if (cancelled || !plotRef.current || scrubbingRef.current) {
        cursorFrameId = requestAnimationFrame(syncCursorLoop);
        return;
      }

      const nextTime = currentTimeRef.current ?? tInitial;
      if (!isTimePlot || lastCursorTime !== nextTime) {
        syncPlaybackCursor(plotRef.current, nextTime);
        lastCursorTime = nextTime;
      }

      cursorFrameId = requestAnimationFrame(syncCursorLoop);
    };

    resizeObserver = new ResizeObserver(() => {
      const width = host.clientWidth;
      if (width <= 0 || width === hostLayoutWidthRef.current) {
        return;
      }
      ensurePlotSize();
    });
    resizeObserver.observe(host);

    let retryId = 0;
    const retryUntilSized = () => {
      if (cancelled) {
        return;
      }
      ensurePlotSize();
      if (!plotRef.current && host.clientWidth <= 0) {
        retryId = window.requestAnimationFrame(retryUntilSized);
      }
    };
    retryUntilSized();
    cursorFrameId = requestAnimationFrame(syncCursorLoop);

    return () => {
      cancelled = true;
      cancelAnimationFrame(retryId);
      cancelAnimationFrame(cursorFrameId);
      detachScrubHandlers?.();
      resizeObserver?.disconnect();
      plot?.destroy();
      plotRef.current = null;
      xyMarkerRef.current = null;
    };
  }, [
    colors,
    currentTimeRef,
    hasRenderableSeries,
    isDark,
    isTimePlot,
    panelData.xLabel,
    panelSignature,
    tFinal,
    tInitial,
    timeline,
    xMode,
    panelData.xValues,
    visibleSeries,
    yAxisLabel,
  ]);

  useEffect(() => {
    const host = hostRef.current;
    const plot = plotRef.current;
    if (!host || !plot || !hasRenderableSeries) {
      return;
    }

    const width = host.clientWidth;
    if (width <= 0) {
      return;
    }

    applyPlotSize(plot, width, squareAspect, isTimePlot, heightScaleProp);
    hostLayoutWidthRef.current = width;
    requestAnimationFrame(() => {
      const chart = plotRef.current;
      if (chart) {
        syncPlaybackCursorRef.current(chart, currentTimeRef.current ?? tInitial);
      }
    });
  }, [currentTimeRef, hasRenderableSeries, heightScaleProp, isTimePlot, squareAspect, tInitial]);

  useEffect(() => {
    const plot = plotRef.current;
    if (!plot) {
      return;
    }

    plot.setData(plotData, false);
    if (plotLimits && !panningRef.current && !manualZoomRef.current) {
      plot.setScale('x', { min: plotLimits.xMin, max: plotLimits.xMax });
      plot.setScale('y', { min: plotLimits.yMin, max: plotLimits.yMax });
    }
    requestAnimationFrame(() => {
      const chart = plotRef.current;
      if (!chart) {
        return;
      }

      syncPlaybackCursorRef.current(chart, currentTimeRef.current ?? tInitial);
    });
  }, [plotData, currentTimeRef, tInitial, plotLimits]);

  useEffect(() => {
    const plot = plotRef.current;
    if (!plot) {
      return;
    }

    if (!plotLimits || panningRef.current || manualZoomRef.current) {
      return;
    }

    plot.setScale('x', { min: plotLimits.xMin, max: plotLimits.xMax });
    plot.setScale('y', { min: plotLimits.yMin, max: plotLimits.yMax });
    if (!isTimePlot) {
      requestAnimationFrame(() => {
        syncPlaybackCursorRef.current(plot, currentTimeRef.current ?? tInitial);
      });
    }
  }, [currentTimeRef, isTimePlot, plotLimits, tInitial]);

  const applyZoomToFit = () => {
    if (!fullPlotLimits) {
      return;
    }

    setZoomToFitUiOff(false);
    autoScaleRef.current = true;
    setDragLimits(null);
    onChangeAxisView(null);
  };

  const limitInputValue = (key: keyof PlotAxisLimits, value: number) =>
    editingLimitKey === key ? editingLimitDraft : formatPlotAxisLimit(value);

  const beginEditingLimit = (key: keyof PlotAxisLimits, value: number) => {
    setEditingLimitKey(key);
    setEditingLimitDraft(formatPlotAxisLimit(value));
  };

  const updateManualLimit = (key: keyof PlotAxisLimits, rawValue: string) => {
    setEditingLimitDraft(rawValue);
    const parsed = Number.parseFloat(rawValue);
    if (!Number.isFinite(parsed) || !plotLimits || !fullPlotLimits) {
      return;
    }

    commitAxisLimitsRef.current({ ...plotLimits, [key]: parsed });
  };

  const finishEditingLimit = () => {
    setEditingLimitKey(null);
    setEditingLimitDraft('');
  };

  const panelLabel = title?.trim() || `Panel ${panelIndex + 1}`;
  const plotBaseHeight = isTimePlot ? PLOT_HEIGHT_DEFAULT : PLOT_XY_DEFAULT_HEIGHT;
  const plotHostHeight = scalePlotTotalHeight(plotBaseHeight, heightScaleProp);
  const plotHostStyle = isTimePlot
    ? { height: plotHostHeight }
    : { width: '100%', minHeight: plotHostHeight };
  const emptyPlotStyle = { minHeight: plotHostHeight, height: plotHostHeight };

  return (
    <section
      ref={sectionRef}
      className="grid gap-2 rounded-md border border-border bg-background/40 p-2"
      onMouseEnter={() => {
        plotHoveredRef.current = true;
      }}
      onMouseLeave={() => {
        plotHoveredRef.current = false;
      }}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={title ?? ''}
          onChange={(event) => {
            const nextTitle = event.target.value;
            onChangeTitle(nextTitle.length > 0 ? nextTitle : undefined);
          }}
          onBlur={(event) => {
            const trimmed = event.target.value.trim();
            onChangeTitle(trimmed.length > 0 ? trimmed : undefined);
          }}
          placeholder={panelLabel}
          className="h-7 min-w-0 flex-1 text-xs"
        />
        <Button
          type="button"
          variant={showSettings ? 'default' : 'outline'}
          size="icon"
          className={cn(
            'h-7 w-7 shrink-0',
            showSettings &&
              'shadow-sm ring-2 ring-primary/40 ring-offset-1 ring-offset-background'
          )}
          onClick={() => setShowSettings((current) => !current)}
          aria-label={showSettings ? 'Hide plot settings' : 'Show plot settings'}
          aria-expanded={showSettings}
          aria-pressed={showSettings}
          title={showSettings ? 'Hide settings' : 'Plot settings'}
        >
          <Settings className="h-3.5 w-3.5" />
        </Button>
        {hasRenderableSeries ? (
          <>
            <Button
              type="button"
              variant={zoomToFitUiActive ? 'default' : 'outline'}
              size="icon"
              className={cn(
                'plot-zoom-to-fit-toggle h-7 w-7 shrink-0',
                zoomToFitUiActive
                  ? 'border-primary bg-primary text-primary-foreground shadow-sm ring-2 ring-primary/40 ring-offset-1 ring-offset-background hover:bg-primary/90'
                  : 'border-dashed border-muted-foreground/70 bg-muted/70 text-muted-foreground hover:border-foreground/50 hover:bg-muted hover:text-foreground'
              )}
              onClick={applyZoomToFit}
              aria-label={zoomToFitUiActive ? 'Zoom to fit (on)' : 'Zoom to fit (off)'}
              aria-pressed={zoomToFitUiActive}
              title={
                zoomToFitUiActive
                  ? 'Zoom to fit — drag scrubs; Shift-drag zooms (turns fit off); right-drag pans after zoom'
                  : 'Click to zoom to fit. Shift-drag to zoom X and Y; right-drag (two-finger drag) to pan'
              }
            >
              <Focus
                className={cn('h-3.5 w-3.5', !zoomToFitUiActive && 'opacity-65')}
                strokeWidth={zoomToFitUiActive ? 2.5 : 2}
              />
            </Button>
            {!isTimePlot && SQUARE_ASPECT_UI_ENABLED ? (
              <Button
                type="button"
                variant={squareAspect ? 'default' : 'outline'}
                size="icon"
                className={cn(
                  'plot-square-aspect-toggle h-7 w-7 shrink-0',
                  squareAspect
                    ? 'border-primary bg-primary text-primary-foreground shadow-sm ring-2 ring-primary/40 ring-offset-1 ring-offset-background hover:bg-primary/90'
                    : 'border-dashed border-muted-foreground/70 bg-muted/70 text-muted-foreground hover:border-foreground/50 hover:bg-muted hover:text-foreground'
                )}
                onClick={() => {
                  setSquareAspect((current) => !current);
                }}
                aria-label={squareAspect ? 'Square aspect (on)' : 'Square aspect (off)'}
                aria-pressed={squareAspect}
                title={
                  squareAspect
                    ? 'Square plot area — zoom or pan turns this off'
                    : 'Square plot area (1) — zoom or pan turns this off'
                }
              >
                <Square
                  className={cn('h-3.5 w-3.5', !squareAspect && 'opacity-65')}
                  strokeWidth={squareAspect ? 2.5 : 2}
                />
              </Button>
            ) : null}
          </>
        ) : null}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onRemove}
          aria-label={`Remove ${panelLabel}`}
          title={`Remove ${panelLabel}`}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      {showSettings ? (
        <div className="grid gap-2 rounded-md border border-border/70 bg-card/40 p-2">
          {!isTimePlot ? (
            <div className="grid gap-2">
              <div className="flex items-end gap-2">
                <div className="grid min-w-0 flex-1 gap-1">
                  <Label htmlFor={`plot-xy-filter-${panelIndex}`} className="text-[0.68rem] text-muted-foreground">
                    Filter
                  </Label>
                  <Input
                    id={`plot-xy-filter-${panelIndex}`}
                    value={xyChannelFilter}
                    onChange={(event) => setXyChannelFilter(event.target.value)}
                    placeholder="Filter X/Y channels…"
                    className="h-8 font-mono text-xs"
                  />
                </div>
                {modeToggle}
              </div>
              <div className="grid gap-2">
                <div className="flex items-end gap-2">
                  <div className="grid min-w-0 flex-1 gap-1">
                    <Label htmlFor={`plot-y-channel-${panelIndex}`} className="text-[0.68rem] text-muted-foreground">
                      Y channel
                    </Label>
                    <select
                      id={`plot-y-channel-${panelIndex}`}
                      value={selectedYChannel}
                      onChange={(event) => {
                        const next = event.target.value.trim();
                        onChangeChannels(next.length > 0 ? [next] : []);
                      }}
                      className="h-8 rounded-md border border-input bg-card px-2 font-mono text-xs"
                    >
                      <option value="">Select Y channel…</option>
                      {filteredChannelNames.map((channelName) => (
                        <option key={channelName} value={channelName}>
                          {channelName}
                        </option>
                      ))}
                    </select>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="mb-px h-8 w-8 shrink-0"
                    aria-label="Swap X and Y channels"
                    title="Swap X and Y channels"
                    disabled={!selectedYChannel || !xChannel}
                    onClick={onSwapXyChannels}
                  >
                    <ArrowLeftRight className="h-3.5 w-3.5" />
                  </Button>
                  <div className="grid min-w-0 flex-1 gap-1">
                    <Label htmlFor={`plot-x-channel-${panelIndex}`} className="text-[0.68rem] text-muted-foreground">
                      X channel
                    </Label>
                    <select
                      id={`plot-x-channel-${panelIndex}`}
                      value={xChannel ?? ''}
                      onChange={(event) => {
                        const next = event.target.value.trim();
                        onChangeXChannel(next.length > 0 ? next : undefined);
                      }}
                      className="h-8 rounded-md border border-input bg-card px-2 font-mono text-xs"
                    >
                      <option value="">Select X channel…</option>
                      {filteredChannelNames.map((channelName) => (
                        <option key={channelName} value={channelName}>
                          {channelName}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="grid min-w-0 flex-1 gap-1">
                    <Label htmlFor={`plot-y-scale-${panelIndex}`} className="text-[0.68rem] text-muted-foreground">
                      Y scale
                    </Label>
                    <Input
                      id={`plot-y-scale-${panelIndex}`}
                      type="text"
                      inputMode="decimal"
                      className="h-8 font-mono text-xs"
                      value={channelScaleInputValue('y', resolvedYChannelScale)}
                      onFocus={() => beginEditingChannelScale('y', resolvedYChannelScale)}
                      onBlur={(event) => finishEditingChannelScale('y', event.target.value)}
                      onChange={(event) => setEditingChannelScaleDraft(event.target.value)}
                    />
                  </div>
                  <div className="w-8 shrink-0" aria-hidden="true" />
                  <div className="grid min-w-0 flex-1 gap-1">
                    <Label htmlFor={`plot-x-scale-${panelIndex}`} className="text-[0.68rem] text-muted-foreground">
                      X scale
                    </Label>
                    <Input
                      id={`plot-x-scale-${panelIndex}`}
                      type="text"
                      inputMode="decimal"
                      className="h-8 font-mono text-xs"
                      value={channelScaleInputValue('x', resolvedXChannelScale)}
                      onFocus={() => beginEditingChannelScale('x', resolvedXChannelScale)}
                      onBlur={(event) => finishEditingChannelScale('x', event.target.value)}
                      onChange={(event) => setEditingChannelScaleDraft(event.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <PlotChannelPicker
              channelNames={channelNames}
              selectedChannels={channels}
              onChange={onChangeChannels}
              toolbarRight={modeToggle}
            />
          )}
          <div className="flex flex-wrap items-center gap-3 border-t border-border/60 pt-2">
            <span className="text-[0.68rem] text-muted-foreground">
              {"Shift-drag to zoom X and Y; right-drag (two-finger drag) to pan."}
            </span>
          </div>
          {!zoomToFitActive && plotLimits ? (
            <div className="grid gap-2 border-t border-border/60 pt-2 sm:grid-cols-2">
              <div className="grid gap-1">
                <Label htmlFor={`plot-x-min-${panelIndex}`} className="text-[0.68rem] text-muted-foreground">
                  {isTimePlot ? 'Time min' : 'X min'}
                </Label>
                <Input
                  id={`plot-x-min-${panelIndex}`}
                  type="text"
                  inputMode="decimal"
                  className="h-8 font-mono text-xs"
                  value={limitInputValue('xMin', plotLimits.xMin)}
                  onFocus={() => beginEditingLimit('xMin', plotLimits.xMin)}
                  onBlur={finishEditingLimit}
                  onChange={(event) => updateManualLimit('xMin', event.target.value)}
                />
              </div>
              <div className="grid gap-1">
                <Label htmlFor={`plot-x-max-${panelIndex}`} className="text-[0.68rem] text-muted-foreground">
                  {isTimePlot ? 'Time max' : 'X max'}
                </Label>
                <Input
                  id={`plot-x-max-${panelIndex}`}
                  type="text"
                  inputMode="decimal"
                  className="h-8 font-mono text-xs"
                  value={limitInputValue('xMax', plotLimits.xMax)}
                  onFocus={() => beginEditingLimit('xMax', plotLimits.xMax)}
                  onBlur={finishEditingLimit}
                  onChange={(event) => updateManualLimit('xMax', event.target.value)}
                />
              </div>
              <div className="grid gap-1">
                <Label htmlFor={`plot-y-min-${panelIndex}`} className="text-[0.68rem] text-muted-foreground">
                  Y min
                </Label>
                <Input
                  id={`plot-y-min-${panelIndex}`}
                  type="text"
                  inputMode="decimal"
                  className="h-8 font-mono text-xs"
                  value={limitInputValue('yMin', plotLimits.yMin)}
                  onFocus={() => beginEditingLimit('yMin', plotLimits.yMin)}
                  onBlur={finishEditingLimit}
                  onChange={(event) => updateManualLimit('yMin', event.target.value)}
                />
              </div>
              <div className="grid gap-1">
                <Label htmlFor={`plot-y-max-${panelIndex}`} className="text-[0.68rem] text-muted-foreground">
                  Y max
                </Label>
                <Input
                  id={`plot-y-max-${panelIndex}`}
                  type="text"
                  inputMode="decimal"
                  className="h-8 font-mono text-xs"
                  value={limitInputValue('yMax', plotLimits.yMax)}
                  onFocus={() => beginEditingLimit('yMax', plotLimits.yMax)}
                  onBlur={finishEditingLimit}
                  onChange={(event) => updateManualLimit('yMax', event.target.value)}
                />
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {channels.length === 0 || (!isTimePlot && (!xChannel || channels[0] == null)) ? (
        <div
          className="flex items-center justify-center rounded-md border border-dashed border-border text-xs text-muted-foreground"
          style={emptyPlotStyle}
        >
          {isTimePlot ? 'Select Y channels to plot vs simulation time (t).' : 'Select one X channel and one Y channel.'}
        </div>
      ) : !hasRenderableSeries ? (
        <div
          className="flex items-center justify-center rounded-md border border-dashed border-border text-xs text-muted-foreground"
          style={emptyPlotStyle}
        >
          {panelData.xChannelMissing
            ? `X channel "${panelData.xChannel}" is missing from the loaded simulation data.`
            : 'Selected channels are missing from the loaded simulation data.'}
        </div>
      ) : (
        <div
          ref={hostRef}
          className="plot-panel-host w-full min-w-0 rounded-md border border-border/60 bg-card"
          style={plotHostStyle}
        />
      )}

      {isTimePlot && channels.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {visibleSeries.map((series, index) => (
            <span
              key={series.id}
              className="inline-flex items-center gap-1 rounded-sm bg-secondary px-1.5 py-0.5 text-[0.68rem] font-mono"
              style={{ color: series.missing ? undefined : colors.seriesCss[index] }}
            >
              {series.label}
              {series.missing ? ' (missing)' : null}
            </span>
          ))}
        </div>
      ) : null}
    </section>
  );
}

export default memo(PlotPanel);
