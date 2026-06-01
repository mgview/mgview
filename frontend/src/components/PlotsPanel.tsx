import { useLayoutEffect, useMemo, useRef } from "react";
import { Plus } from "lucide-react";
import { extractPlotPanelData } from "../core/plotSeries.ts";
import { mergePlotAxisFields } from "../core/plotAxisConfig.ts";
import {
  createEmptyPlotPanel,
  normalizePlotHeightScale,
  normalizeStoredChannelScale,
  normalizeStoredPlotHeightScale,
  PLOT_HEIGHT_SCALE_OPTIONS,
} from "../core/plotsConfig.ts";
import { Label } from "./ui/label.tsx";
import type {
  NormalizedSceneConfig,
  PlotPanelConfig,
  PlotPanelXMode,
  Timeline,
} from "../core/types.ts";
import PlotPanel from "./PlotPanel.tsx";
import { Button } from "./ui/button.tsx";

interface PlotsPanelProps {
  activeScene: NormalizedSceneConfig | null;
  channelNames: string[];
  currentTime: number;
  timeline: Timeline;
  onChangeTime: (time: number) => void;
  updateDraftScene: (updater: (scene: NormalizedSceneConfig) => void) => void;
}

function updatePlotPanel(
  updateDraftScene: PlotsPanelProps["updateDraftScene"],
  panelIndex: number,
  updater: (panel: PlotPanelConfig) => PlotPanelConfig,
) {
  updateDraftScene((scene) => {
    const panels = scene.plots.panels.map((panel, index) =>
      index === panelIndex ? updater(panel) : panel,
    );
    scene.plots = { ...scene.plots, panels };
  });
}

export default function PlotsPanel({
  activeScene,
  channelNames,
  currentTime,
  timeline,
  onChangeTime,
  updateDraftScene,
}: PlotsPanelProps) {
  const panels = activeScene?.plots.panels ?? [];
  const plotHeightScale = normalizePlotHeightScale(
    activeScene?.plots.heightScale,
  );
  const availableChannels = useMemo(
    () => new Set(channelNames),
    [channelNames],
  );
  const currentTimeRef = useRef(currentTime);
  const panelCountRef = useRef(panels.length);
  const panelElementRefs = useRef<Array<HTMLDivElement | null>>([]);
  currentTimeRef.current = currentTime;

  useLayoutEffect(() => {
    if (panels.length > panelCountRef.current) {
      const newPanelIndex = panels.length - 1;
      panelElementRefs.current[newPanelIndex]?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }

    panelCountRef.current = panels.length;
  }, [panels.length]);

  const panelDataList = useMemo(
    () =>
      panels.map((panel) =>
        extractPlotPanelData(timeline, panel, [...availableChannels]),
      ),
    [availableChannels, panels, timeline],
  );

  const addPanel = () => {
    if (!activeScene) {
      return;
    }

    updateDraftScene((scene) => {
      scene.plots = {
        ...scene.plots,
        panels: [...scene.plots.panels, createEmptyPlotPanel()],
      };
    });
  };

  const setPlotHeightScale = (nextScale: number) => {
    updateDraftScene((scene) => {
      const stored = normalizeStoredPlotHeightScale(nextScale);
      const nextPlots = { panels: scene.plots.panels };
      if (stored != null) {
        nextPlots.heightScale = stored;
      }
      scene.plots = nextPlots;
    });
  };

  const removePanel = (panelIndex: number) => {
    updateDraftScene((scene) => {
      scene.plots = {
        ...scene.plots,
        panels: scene.plots.panels.filter((_, index) => index !== panelIndex),
      };
    });
  };

  if (!activeScene) {
    return null;
  }

  return (
    <div className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-3">
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          onClick={addPanel}
        >
          <Plus className="mr-1 h-3.5 w-3.5" />
          Add panel
        </Button>
        <div className="flex items-center gap-1.5">
          <Label
            htmlFor="plot-height-scale"
            className="text-xs text-muted-foreground"
          >
            Height
          </Label>
          <select
            id="plot-height-scale"
            className="h-7 rounded-md border border-input bg-background px-2 text-xs"
            value={String(plotHeightScale)}
            onChange={(event) => {
              setPlotHeightScale(Number(event.target.value));
            }}
            title="Scale default plot height for all panels"
            aria-label="Plot height scale"
          >
            {PLOT_HEIGHT_SCALE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option === 1 ? "1×" : `${option}×`}
              </option>
            ))}
          </select>
        </div>
        {channelNames.length === 0 ? (
          <span className="text-xs text-muted-foreground">
            Load simulation data to chart channels over time.
          </span>
        ) : null}
      </div>

      <div className="min-h-0 overflow-auto pr-0.5">
        {panels.length === 0 ? (
          <div className="rounded-md border border-dashed border-border px-3 py-8 text-center text-xs text-muted-foreground">
            No plot panels yet. Add a panel and chart channels vs time (t) or vs
            another channel.
          </div>
        ) : (
          <div className="grid gap-3">
            {panels.map((panel, panelIndex) => (
              <div
                key={`plot-panel-${panelIndex}`}
                ref={(element) => {
                  panelElementRefs.current[panelIndex] = element;
                }}
                className="grid gap-2"
              >
                <PlotPanel
                  title={panel.title}
                  xMode={panel.xMode ?? "time"}
                  xChannel={panel.xChannel}
                  yChannelScale={panel.yChannelScale}
                  xChannelScale={panel.xChannelScale}
                  channels={panel.channels}
                  autoScale={panel.autoScale}
                  xMin={panel.xMin}
                  xMax={panel.xMax}
                  yMin={panel.yMin}
                  yMax={panel.yMax}
                  channelNames={channelNames}
                  panelData={
                    panelDataList[panelIndex] ?? {
                      xMode: "time",
                      xLabel: "t",
                      xValues: [],
                      times: [],
                      series: [],
                      missingChannels: [],
                    }
                  }
                  timeline={timeline}
                  currentTimeRef={currentTimeRef}
                  panelIndex={panelIndex}
                  heightScale={plotHeightScale}
                  onChangeTime={onChangeTime}
                  onChangeTitle={(nextTitle) => {
                    updatePlotPanel(
                      updateDraftScene,
                      panelIndex,
                      (currentPanel) => ({
                        ...currentPanel,
                        title: nextTitle,
                      }),
                    );
                  }}
                  onChangeXMode={(nextXMode: PlotPanelXMode) => {
                    updatePlotPanel(
                      updateDraftScene,
                      panelIndex,
                      (currentPanel) => {
                        if (nextXMode === "time") {
                          const {
                            yChannelScale: _y,
                            xChannelScale: _x,
                            xChannel: _xc,
                            ...rest
                          } = currentPanel;
                          return mergePlotAxisFields(
                            {
                              ...rest,
                              xMode: "time",
                            },
                            null,
                          );
                        }

                        const nextChannels = currentPanel.channels.slice(0, 1);
                        const nextXChannel =
                          currentPanel.xChannel ??
                          (currentPanel.channels.length >= 2
                            ? currentPanel.channels[1]
                            : undefined);

                        return mergePlotAxisFields(
                          {
                            ...currentPanel,
                            xMode: "channel",
                            channels: nextChannels,
                            ...(nextXChannel ? { xChannel: nextXChannel } : {}),
                          },
                          null,
                        );
                      },
                    );
                  }}
                  onSwapXyChannels={() => {
                    updatePlotPanel(
                      updateDraftScene,
                      panelIndex,
                      (currentPanel) => {
                        const yChannel = currentPanel.channels[0];
                        const x = currentPanel.xChannel;
                        if (!yChannel || !x) {
                          return currentPanel;
                        }

                        const nextPanel: PlotPanelConfig = {
                          ...currentPanel,
                          xMode: "channel",
                          channels: [x],
                          xChannel: yChannel,
                        };

                        if (currentPanel.yChannelScale != null) {
                          nextPanel.xChannelScale = currentPanel.yChannelScale;
                        } else {
                          delete nextPanel.xChannelScale;
                        }

                        if (currentPanel.xChannelScale != null) {
                          nextPanel.yChannelScale = currentPanel.xChannelScale;
                        } else {
                          delete nextPanel.yChannelScale;
                        }

                        return nextPanel;
                      },
                    );
                  }}
                  onChangeYChannelScale={(nextScale) => {
                    updatePlotPanel(
                      updateDraftScene,
                      panelIndex,
                      (currentPanel) => {
                        const nextPanel = { ...currentPanel };
                        const stored = normalizeStoredChannelScale(nextScale);
                        if (stored != null) {
                          nextPanel.yChannelScale = stored;
                        } else {
                          delete nextPanel.yChannelScale;
                        }
                        return nextPanel;
                      },
                    );
                  }}
                  onChangeXChannelScale={(nextScale) => {
                    updatePlotPanel(
                      updateDraftScene,
                      panelIndex,
                      (currentPanel) => {
                        const nextPanel = { ...currentPanel };
                        const stored = normalizeStoredChannelScale(nextScale);
                        if (stored != null) {
                          nextPanel.xChannelScale = stored;
                        } else {
                          delete nextPanel.xChannelScale;
                        }
                        return nextPanel;
                      },
                    );
                  }}
                  onChangeXChannel={(nextXChannel) => {
                    updatePlotPanel(
                      updateDraftScene,
                      panelIndex,
                      (currentPanel) => ({
                        ...currentPanel,
                        xChannel: nextXChannel,
                        xMode: "channel",
                      }),
                    );
                  }}
                  onChangeChannels={(nextChannels) => {
                    updatePlotPanel(
                      updateDraftScene,
                      panelIndex,
                      (currentPanel) =>
                        mergePlotAxisFields(
                          {
                            ...currentPanel,
                            channels: nextChannels,
                          },
                          null,
                        ),
                    );
                  }}
                  onChangeAxisView={(fields) => {
                    updatePlotPanel(
                      updateDraftScene,
                      panelIndex,
                      (currentPanel) =>
                        mergePlotAxisFields(currentPanel, fields),
                    );
                  }}
                  onRemove={() => removePanel(panelIndex)}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
