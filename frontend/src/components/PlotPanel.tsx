import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from 'react';
import uPlot from 'uplot';
import 'uplot/dist/uPlot.min.css';
import { ArrowLeftRight, Focus, Settings, X } from 'lucide-react';
import {
  buildPersistedPlotAxisFields,
  computeFullPlotAxisLimits,
  plotAxisViewIsZoomed,
  plotPanelAutoScale,
  resolvePlotAxisLimits,
  type PlotAxisLimits,
} from '../core/plotAxisConfig.ts';
import { computePlotYBounds, type PlotPanelData } from '../core/plotSeries.ts';
import { getFrameIndexAtTime } from '../core/timeline.ts';
import { readPlotThemeColors } from '../core/plotTheme.ts';
import type { PlotPanelConfig, PlotPanelXMode, Timeline } from '../core/types.ts';
import { cn } from '../lib/utils.ts';
import PlotChannelPicker from './PlotChannelPicker.tsx';
import { useTheme } from './ThemeProvider.tsx';
import { Button } from './ui/button.tsx';
import { Checkbox } from './ui/checkbox.tsx';
import { Input } from './ui/input.tsx';
import { Label } from './ui/label.tsx';

const PLOT_HEIGHT_DEFAULT = 220;
const MANUAL_ZOOM_SENSITIVITY = 100;

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

function resolvePlotHeight(hostWidth: number, squareAspect: boolean, isTimePlot: boolean): number {
  if (!isTimePlot && squareAspect && hostWidth > 0) {
    return Math.round(hostWidth);
  }

  return PLOT_HEIGHT_DEFAULT;
}

type PersistedPlotAxisFields = Pick<PlotPanelConfig, 'autoScale' | 'xMin' | 'xMax' | 'yMin' | 'yMax'>;

interface PlotPanelProps {
  title?: string;
  xMode: PlotPanelXMode;
  xChannel?: string;
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
  onChangeTime: (time: number) => void;
  onChangeTitle: (title: string | undefined) => void;
  onChangeXMode: (xMode: PlotPanelXMode) => void;
  onChangeXChannel: (xChannel: string | undefined) => void;
  onChangeChannels: (channels: string[]) => void;
  onChangeAxisView: (fields: PersistedPlotAxisFields | null) => void;
  onSwapXyChannels: () => void;
  onRemove: () => void;
}

function PlotPanel({
  title,
  xMode,
  xChannel,
  channels,
  channelNames,
  panelData,
  timeline,
  currentTimeRef,
  panelIndex,
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
  onChangeAxisView,
  onSwapXyChannels,
  onRemove,
}: PlotPanelProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const xyMarkerRef = useRef<HTMLDivElement>(null);
  const plotRef = useRef<uPlot | null>(null);
  const scrubbingRef = useRef(false);
  const zoomSelectingRef = useRef(false);
  const manualZoomRef = useRef<{
    axis?: 'x' | 'y';
    startClientX: number;
    startClientY: number;
    startLimits: PlotAxisLimits;
  } | null>(null);
  const panningRef = useRef<{ startClientX: number; startClientY: number; startLimits: PlotAxisLimits } | null>(null);
  const zoomStartXRef = useRef(0);
  const zoomStartYRef = useRef(0);
  const autoScaleRef = useRef(true);
  const plotHoveredRef = useRef(false);
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
  const [showSettings, setShowSettings] = useState(channels.length === 0);
  const [squareAspect, setSquareAspect] = useState(false);
  const [xyChannelFilter, setXyChannelFilter] = useState('');

  onChangeTimeRef.current = onChangeTime;
  onChangeAxisViewRef.current = onChangeAxisView;
  timelineRef.current = timeline;
  autoScaleRef.current = autoScale;

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

  const resolvedPlotLimits = useMemo(
    () => resolvePlotAxisLimits(axisPanel, fullPlotLimits, panelData, visibleSeries, isTimePlot),
    [axisPanel, fullPlotLimits, isTimePlot, panelData, visibleSeries]
  );

  const plotLimits = dragLimits ?? resolvedPlotLimits;

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

  const commitAxisLimitsRef = useRef<(limits: PlotAxisLimits) => void>(() => {});
  commitAxisLimitsRef.current = (limits: PlotAxisLimits) => {
    if (!fullPlotLimits) {
      return;
    }

    setDragLimits(null);
    onChangeAxisViewRef.current(
      buildPersistedPlotAxisFields(autoScale, limits, fullPlotLimits, isTimePlot)
    );
  };

  const resetPlotView = () => {
    setDragLimits(null);
    onChangeAxisView(null);
  };
  const trimmedXyChannelFilter = xyChannelFilter.trim().toLowerCase();
  const filteredChannelNames = useMemo(() => {
    if (!trimmedXyChannelFilter) {
      return channelNames;
    }

    return channelNames.filter((channelName) => channelName.toLowerCase().includes(trimmedXyChannelFilter));
  }, [channelNames, trimmedXyChannelFilter]);
  const selectedYChannel = channels[0] ?? '';

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

  const syncPlaybackCursorRef = useRef<(plot: uPlot, time: number) => void>(() => {});

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
      if (isTimePlot || event.defaultPrevented || event.repeat) {
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
      const plotXFromClient = (clientX: number) => clientX - chart.over.getBoundingClientRect().left;
      const plotYFromClient = (clientY: number) => clientY - chart.over.getBoundingClientRect().top;

      const updateZoomSelect = (startX: number, endX: number, startY: number, endY: number) => {
        const left = Math.min(startX, endX);
        const top = Math.min(startY, endY);
        const width = Math.max(Math.abs(endX - startX), 1);
        const height = Math.max(Math.abs(endY - startY), 1);

        if (isTimePlot) {
          // Selection lives in chart.over (plot-area CSS coords), not canvas bbox space.
          chart.setSelect(
            {
              left,
              top: 0,
              width,
              height: chart.over.clientHeight,
            },
            false
          );
          return;
        }

        chart.setSelect({ left, top, width, height }, false);
      };

      const clearZoomSelect = () => {
        chart.setSelect({ left: 0, top: 0, width: 0, height: 0 }, false);
      };

      const applyManualPan = (event: PointerEvent) => {
        const panState = panningRef.current;
        if (!panState) {
          return;
        }

        const dxPx = event.clientX - panState.startClientX;
        const dyPx = event.clientY - panState.startClientY;
        const xSpan = panState.startLimits.xMax - panState.startLimits.xMin;
        const ySpan = panState.startLimits.yMax - panState.startLimits.yMin;
        const dxVal = (-dxPx / chart.bbox.width) * xSpan;
        const dyVal = (dyPx / chart.bbox.height) * ySpan;

        setDragLimits({
          xMin: panState.startLimits.xMin + dxVal,
          xMax: panState.startLimits.xMax + dxVal,
          yMin: panState.startLimits.yMin + dyVal,
          yMax: panState.startLimits.yMax + dyVal,
        });
      };

      const applyManualAxisZoom = (event: PointerEvent) => {
        const zoomState = manualZoomRef.current;
        if (!zoomState) {
          return;
        }

        const deltaX = event.clientX - zoomState.startClientX;
        const deltaY = event.clientY - zoomState.startClientY;

        if (!zoomState.axis && (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3)) {
          zoomState.axis = Math.abs(deltaX) >= Math.abs(deltaY) ? 'x' : 'y';
        }

        if (!zoomState.axis) {
          return;
        }

        const [xMin, xMax] =
          zoomState.axis === 'x'
            ? zoomAxisRange(zoomState.startLimits.xMin, zoomState.startLimits.xMax, deltaX)
            : [zoomState.startLimits.xMin, zoomState.startLimits.xMax];
        const [yMin, yMax] =
          zoomState.axis === 'y'
            ? zoomAxisRange(zoomState.startLimits.yMin, zoomState.startLimits.yMax, deltaY)
            : [zoomState.startLimits.yMin, zoomState.startLimits.yMax];

        setDragLimits({ xMin, xMax, yMin, yMax });
      };

      const onPointerDown = (event: PointerEvent) => {
        if (event.button === 2) {
          if (!autoScaleRef.current) {
            event.preventDefault();
            const limits = readChartLimits(chart);
            if (!limits) {
              return;
            }

            scrubbingRef.current = false;
            zoomSelectingRef.current = false;
            manualZoomRef.current = null;
            panningRef.current = {
              startClientX: event.clientX,
              startClientY: event.clientY,
              startLimits: limits,
            };
            chart.over.setPointerCapture(event.pointerId);
          }

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

          if (autoScaleRef.current) {
            zoomSelectingRef.current = true;
            manualZoomRef.current = null;
            const startX = plotXFromClient(event.clientX);
            const startY = plotYFromClient(event.clientY);
            zoomStartXRef.current = startX;
            zoomStartYRef.current = startY;
            chart.over.setPointerCapture(event.pointerId);
            updateZoomSelect(startX, startX, startY, startY);
            return;
          }

          const limits = readChartLimits(chart);
          if (!limits) {
            return;
          }

          zoomSelectingRef.current = false;
          manualZoomRef.current = {
            startClientX: event.clientX,
            startClientY: event.clientY,
            startLimits: limits,
          };
          chart.over.setPointerCapture(event.pointerId);
          return;
        }

        scrubbingRef.current = true;
        chart.over.setPointerCapture(event.pointerId);
        scrubToPointer(chart, event.clientX, event.clientY);
      };

      const onPointerMove = (event: PointerEvent) => {
        if (zoomSelectingRef.current) {
          updateZoomSelect(
            zoomStartXRef.current,
            plotXFromClient(event.clientX),
            zoomStartYRef.current,
            plotYFromClient(event.clientY)
          );
          return;
        }

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
        if (zoomSelectingRef.current) {
          zoomSelectingRef.current = false;
          if (chart.over.hasPointerCapture(event.pointerId)) {
            chart.over.releasePointerCapture(event.pointerId);
          }

          const { left, top, width, height } = chart.select;
          clearZoomSelect();

          if (width > 2 && height > 2) {
            const x0 = chart.posToVal(left, 'x');
            const x1 = chart.posToVal(left + width, 'x');
            const yTop = chart.posToVal(top, 'y');
            const yBottom = chart.posToVal(top + height, 'y');
            if (
              Number.isFinite(x0) &&
              Number.isFinite(x1) &&
              Number.isFinite(yTop) &&
              Number.isFinite(yBottom)
            ) {
              const xMin = Math.min(x0, x1);
              const xMax = Math.max(x0, x1);
              const yMin = Math.min(yTop, yBottom);
              const yMax = Math.max(yTop, yBottom);

              if (isTimePlot) {
                const yBounds = computePlotYBounds(panelData.xValues, visibleSeries, xMin, xMax);
                if (yBounds) {
                  commitAxisLimitsRef.current({ xMin, xMax, yMin: yBounds.yMin, yMax: yBounds.yMax });
                }
              } else {
                commitAxisLimitsRef.current({ xMin, xMax, yMin, yMax });
              }
            }
          }

          return;
        }

        if (manualZoomRef.current) {
          const limits = readChartLimits(chart);
          manualZoomRef.current = null;
          if (chart.over.hasPointerCapture(event.pointerId)) {
            chart.over.releasePointerCapture(event.pointerId);
          }
          if (limits) {
            commitAxisLimitsRef.current(limits);
          }
          return;
        }

        if (panningRef.current) {
          const limits = readChartLimits(chart);
          panningRef.current = null;
          if (chart.over.hasPointerCapture(event.pointerId)) {
            chart.over.releasePointerCapture(event.pointerId);
          }
          if (limits) {
            commitAxisLimitsRef.current(limits);
          }
          return;
        }

        if (!scrubbingRef.current) {
          return;
        }

        scrubbingRef.current = false;
        if (chart.over.hasPointerCapture(event.pointerId)) {
          chart.over.releasePointerCapture(event.pointerId);
        }
        syncPlaybackCursor(chart, currentTimeRef.current ?? tInitial);
        lastCursorTime = currentTimeRef.current ?? tInitial;
      };

      const onContextMenu = (event: MouseEvent) => {
        if (!autoScaleRef.current) {
          event.preventDefault();
        }
      };

      chart.over.addEventListener('pointerdown', onPointerDown);
      chart.over.addEventListener('pointermove', onPointerMove);
      chart.over.addEventListener('pointerup', endPointer);
      chart.over.addEventListener('pointercancel', endPointer);
      chart.over.addEventListener('contextmenu', onContextMenu);

      return () => {
        chart.over.removeEventListener('pointerdown', onPointerDown);
        chart.over.removeEventListener('pointermove', onPointerMove);
        chart.over.removeEventListener('pointerup', endPointer);
        chart.over.removeEventListener('pointercancel', endPointer);
        chart.over.removeEventListener('contextmenu', onContextMenu);
        zoomSelectingRef.current = false;
        manualZoomRef.current = null;
        panningRef.current = null;
      };
    };

    const buildOptions = (width: number): uPlot.Options => {
      const height = resolvePlotHeight(width, squareAspect, isTimePlot);

      return {
      width,
      height,
      scales: {
        x: {
          time: false,
          ...(plotLimits
            ? { min: plotLimits.xMin, max: plotLimits.xMax }
            : {}),
        },
        y: plotLimits
          ? { auto: false, min: plotLimits.yMin, max: plotLimits.yMax }
          : { auto: true },
      },
      axes: [
        {
          label: isTimePlot ? undefined : panelData.xLabel,
          labelSize: isTimePlot ? 0 : undefined,
          labelGap: isTimePlot ? 0 : undefined,
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
      select: { show: true, over: true },
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

      const height = resolvePlotHeight(width, squareAspect, isTimePlot);
      if (plot.width !== width || plot.height !== height) {
        plot.setSize({ width, height });
        syncPlaybackCursor(plot, currentTimeRef.current ?? tInitial);
      }
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
    squareAspect,
    visibleSeries,
    yAxisLabel,
  ]);

  useEffect(() => {
    const plot = plotRef.current;
    if (!plot) {
      return;
    }

    plot.setData(plotData, false);
    if (plotLimits) {
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

    if (plotLimits) {
      plot.setScale('x', { min: plotLimits.xMin, max: plotLimits.xMax });
      plot.setScale('y', { min: plotLimits.yMin, max: plotLimits.yMax });
      if (!isTimePlot) {
        requestAnimationFrame(() => {
          syncPlaybackCursorRef.current(plot, currentTimeRef.current ?? tInitial);
        });
      }
      return;
    }

    plot.setScale('x', { min: null, max: null });
  }, [currentTimeRef, isTimePlot, plotLimits, tInitial]);

  const toggleAutoScale = () => {
    if (!fullPlotLimits) {
      return;
    }

    if (autoScale) {
      const plot = plotRef.current;
      const limits = plot ? readChartLimits(plot) : plotLimits;
      if (limits) {
        onChangeAxisView(buildPersistedPlotAxisFields(false, limits, fullPlotLimits, isTimePlot));
      }
      return;
    }

    onChangeAxisView({});
  };

  const updateManualLimit = (key: keyof PlotAxisLimits, rawValue: string) => {
    const parsed = Number.parseFloat(rawValue);
    if (!Number.isFinite(parsed) || !plotLimits || !fullPlotLimits) {
      return;
    }

    commitAxisLimitsRef.current({ ...plotLimits, [key]: parsed });
  };

  const showResetView =
    hasRenderableSeries && fullPlotLimits != null && plotAxisViewIsZoomed(axisPanel, fullPlotLimits, isTimePlot);

  const panelLabel = title?.trim() || `Panel ${panelIndex + 1}`;
  const plotHostStyle =
    squareAspect && !isTimePlot
      ? { aspectRatio: '1 / 1', width: '100%', minHeight: PLOT_HEIGHT_DEFAULT }
      : { height: PLOT_HEIGHT_DEFAULT };
  const emptyPlotStyle = { minHeight: PLOT_HEIGHT_DEFAULT, height: PLOT_HEIGHT_DEFAULT };

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
            const nextTitle = event.target.value.trim();
            onChangeTitle(nextTitle.length > 0 ? nextTitle : undefined);
          }}
          placeholder={panelLabel}
          className="h-7 min-w-0 flex-1 text-xs"
        />
        <Button
          type="button"
          variant={showSettings ? 'secondary' : 'outline'}
          size="icon"
          className="h-7 w-7 shrink-0"
          onClick={() => setShowSettings((current) => !current)}
          aria-label={showSettings ? 'Hide plot settings' : 'Show plot settings'}
          aria-expanded={showSettings}
          title={showSettings ? 'Hide settings' : 'Plot settings'}
        >
          <Settings className="h-3.5 w-3.5" />
        </Button>
        {hasRenderableSeries ? (
          <Button
            type="button"
            variant={autoScale ? 'default' : 'outline'}
            size="icon"
            className={cn(
              'plot-auto-scale-toggle h-7 w-7 shrink-0',
              autoScale
                ? 'border-primary bg-primary text-primary-foreground shadow-sm ring-2 ring-primary/40 ring-offset-1 ring-offset-background hover:bg-primary/90'
                : 'border-dashed border-muted-foreground/70 bg-muted/70 text-muted-foreground hover:border-foreground/50 hover:bg-muted hover:text-foreground'
            )}
            onClick={toggleAutoScale}
            aria-label={autoScale ? 'Auto-scale axes (on)' : 'Auto-scale axes (off)'}
            aria-pressed={autoScale}
            title={
              autoScale
                ? isTimePlot
                  ? 'Auto-scale on — Y follows data; Shift-drag selects a time region to zoom'
                  : 'Auto-scale on — Shift-drag selects a region to zoom'
                : 'Manual axes — Shift-drag to zoom, right-drag to pan'
            }
          >
            <Focus className={cn('h-3.5 w-3.5', !autoScale && 'opacity-65')} strokeWidth={autoScale ? 2.5 : 2} />
          </Button>
        ) : null}
        {showResetView ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={resetPlotView}
          >
            Reset view
          </Button>
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
              <div className="flex items-end gap-2">
                <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-2">
                  <div className="grid gap-1">
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
                  <div className="grid gap-1">
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
            <span className="text-[0.68rem] font-medium text-muted-foreground">Axis</span>
            {!isTimePlot ? (
              <Label className="flex cursor-pointer items-center gap-1.5 text-xs">
                <Checkbox checked={squareAspect} onCheckedChange={(checked) => setSquareAspect(checked === true)} />
                Square aspect
                <span className="font-mono text-[0.64rem] text-muted-foreground">(1)</span>
              </Label>
            ) : null}
            {autoScale ? (
              <span className="text-[0.68rem] text-muted-foreground">
                {isTimePlot
                  ? 'Shift-drag on the chart to zoom a time region (Y refits to visible data)'
                  : 'Shift-drag on the chart to zoom a region'}
              </span>
            ) : (
              <span className="text-[0.68rem] text-muted-foreground">
                Shift-drag horizontally or vertically to zoom; right-drag (two-finger drag) to pan
              </span>
            )}
          </div>
          {!autoScale && plotLimits ? (
            <div className="grid gap-2 border-t border-border/60 pt-2 sm:grid-cols-2">
              <div className="grid gap-1">
                <Label htmlFor={`plot-x-min-${panelIndex}`} className="text-[0.68rem] text-muted-foreground">
                  {isTimePlot ? 'Time min' : 'X min'}
                </Label>
                <Input
                  id={`plot-x-min-${panelIndex}`}
                  type="number"
                  step="any"
                  className="h-8 font-mono text-xs"
                  value={plotLimits.xMin}
                  onChange={(event) => updateManualLimit('xMin', event.target.value)}
                />
              </div>
              <div className="grid gap-1">
                <Label htmlFor={`plot-x-max-${panelIndex}`} className="text-[0.68rem] text-muted-foreground">
                  {isTimePlot ? 'Time max' : 'X max'}
                </Label>
                <Input
                  id={`plot-x-max-${panelIndex}`}
                  type="number"
                  step="any"
                  className="h-8 font-mono text-xs"
                  value={plotLimits.xMax}
                  onChange={(event) => updateManualLimit('xMax', event.target.value)}
                />
              </div>
              <div className="grid gap-1">
                <Label htmlFor={`plot-y-min-${panelIndex}`} className="text-[0.68rem] text-muted-foreground">
                  Y min
                </Label>
                <Input
                  id={`plot-y-min-${panelIndex}`}
                  type="number"
                  step="any"
                  className="h-8 font-mono text-xs"
                  value={plotLimits.yMin}
                  onChange={(event) => updateManualLimit('yMin', event.target.value)}
                />
              </div>
              <div className="grid gap-1">
                <Label htmlFor={`plot-y-max-${panelIndex}`} className="text-[0.68rem] text-muted-foreground">
                  Y max
                </Label>
                <Input
                  id={`plot-y-max-${panelIndex}`}
                  type="number"
                  step="any"
                  className="h-8 font-mono text-xs"
                  value={plotLimits.yMax}
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
