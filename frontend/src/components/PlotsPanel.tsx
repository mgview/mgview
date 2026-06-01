import { useLayoutEffect, useMemo, useRef } from 'react';
import { Plus } from 'lucide-react';
import { extractPlotPanelData } from '../core/plotSeries.ts';
import { mergePlotAxisFields } from '../core/plotAxisConfig.ts';
import { createEmptyPlotPanel } from '../core/plotsConfig.ts';
import type { NormalizedSceneConfig, PlotPanelConfig, PlotPanelXMode, Timeline } from '../core/types.ts';
import PlotPanel from './PlotPanel.tsx';
import { Button } from './ui/button.tsx';

interface PlotsPanelProps {
  activeScene: NormalizedSceneConfig | null;
  channelNames: string[];
  currentTime: number;
  timeline: Timeline;
  onChangeTime: (time: number) => void;
  updateDraftScene: (updater: (scene: NormalizedSceneConfig) => void) => void;
}

function updatePlotPanel(
  updateDraftScene: PlotsPanelProps['updateDraftScene'],
  panelIndex: number,
  updater: (panel: PlotPanelConfig) => PlotPanelConfig
) {
  updateDraftScene((scene) => {
    const panels = scene.plots.panels.map((panel, index) => (index === panelIndex ? updater(panel) : panel));
    scene.plots = { panels };
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
  const availableChannels = useMemo(() => new Set(channelNames), [channelNames]);
  const currentTimeRef = useRef(currentTime);
  const panelCountRef = useRef(panels.length);
  const panelElementRefs = useRef<Array<HTMLDivElement | null>>([]);
  currentTimeRef.current = currentTime;

  useLayoutEffect(() => {
    if (panels.length > panelCountRef.current) {
      const newPanelIndex = panels.length - 1;
      panelElementRefs.current[newPanelIndex]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    panelCountRef.current = panels.length;
  }, [panels.length]);

  const panelDataList = useMemo(
    () => panels.map((panel) => extractPlotPanelData(timeline, panel, [...availableChannels])),
    [availableChannels, panels, timeline]
  );

  const addPanel = () => {
    if (!activeScene) {
      return;
    }

    updateDraftScene((scene) => {
      scene.plots = {
        panels: [...scene.plots.panels, createEmptyPlotPanel()],
      };
    });
  };

  const removePanel = (panelIndex: number) => {
    updateDraftScene((scene) => {
      scene.plots = {
        panels: scene.plots.panels.filter((_, index) => index !== panelIndex),
      };
    });
  };

  if (!activeScene) {
    return null;
  }

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={addPanel}>
          <Plus className="mr-1 h-3.5 w-3.5" />
          Add panel
        </Button>
        {channelNames.length === 0 ? (
          <span className="text-xs text-muted-foreground">Load simulation data to chart channels over time.</span>
        ) : null}
      </div>

      {panels.length === 0 ? (
        <div className="rounded-md border border-dashed border-border px-3 py-8 text-center text-xs text-muted-foreground">
          No plot panels yet. Add a panel and chart channels vs time (t) or vs another channel.
        </div>
      ) : (
        panels.map((panel, panelIndex) => (
          <div
            key={`plot-panel-${panelIndex}`}
            ref={(element) => {
              panelElementRefs.current[panelIndex] = element;
            }}
            className="grid gap-2"
          >
            <PlotPanel
              title={panel.title}
              xMode={panel.xMode ?? 'time'}
              xChannel={panel.xChannel}
              channels={panel.channels}
              autoScale={panel.autoScale}
              xMin={panel.xMin}
              xMax={panel.xMax}
              yMin={panel.yMin}
              yMax={panel.yMax}
              channelNames={channelNames}
              panelData={panelDataList[panelIndex] ?? { xMode: 'time', xLabel: 't', xValues: [], times: [], series: [], missingChannels: [] }}
              timeline={timeline}
              currentTimeRef={currentTimeRef}
              panelIndex={panelIndex}
              onChangeTime={onChangeTime}
              onChangeTitle={(nextTitle) => {
                updatePlotPanel(updateDraftScene, panelIndex, (currentPanel) => ({
                  ...currentPanel,
                  title: nextTitle,
                }));
              }}
              onChangeXMode={(nextXMode: PlotPanelXMode) => {
                updatePlotPanel(updateDraftScene, panelIndex, (currentPanel) => {
                  if (nextXMode === 'time') {
                    return mergePlotAxisFields(
                      {
                        ...currentPanel,
                        xMode: 'time',
                        xChannel: undefined,
                      },
                      null
                    );
                  }

                  const nextChannels = currentPanel.channels.slice(0, 1);
                  const nextXChannel =
                    currentPanel.xChannel ??
                    (currentPanel.channels.length >= 2 ? currentPanel.channels[1] : undefined);

                  return mergePlotAxisFields(
                    {
                      ...currentPanel,
                      xMode: 'channel',
                      channels: nextChannels,
                      ...(nextXChannel ? { xChannel: nextXChannel } : {}),
                    },
                    null
                  );
                });
              }}
              onSwapXyChannels={() => {
                updatePlotPanel(updateDraftScene, panelIndex, (currentPanel) => {
                  const yChannel = currentPanel.channels[0];
                  const x = currentPanel.xChannel;
                  if (!yChannel || !x) {
                    return currentPanel;
                  }

                  return {
                    ...currentPanel,
                    xMode: 'channel',
                    channels: [x],
                    xChannel: yChannel,
                  };
                });
              }}
              onChangeXChannel={(nextXChannel) => {
                updatePlotPanel(updateDraftScene, panelIndex, (currentPanel) => ({
                  ...currentPanel,
                  xChannel: nextXChannel,
                  xMode: 'channel',
                }));
              }}
              onChangeChannels={(nextChannels) => {
                updatePlotPanel(updateDraftScene, panelIndex, (currentPanel) =>
                  mergePlotAxisFields(
                    {
                      ...currentPanel,
                      channels: nextChannels,
                    },
                    null
                  )
                );
              }}
              onChangeAxisView={(fields) => {
                updatePlotPanel(updateDraftScene, panelIndex, (currentPanel) =>
                  mergePlotAxisFields(currentPanel, fields)
                );
              }}
              onRemove={() => removePanel(panelIndex)}
            />
          </div>
        ))
      )}
    </div>
  );
}
