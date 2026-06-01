import { finitePlotLimit } from './plotAxisConfig.ts';
import type { PlotPanelConfig, PlotPanelXMode, SceneConfig, ScenePlotsConfig } from './types.ts';

export { plotPanelAutoScale } from './plotAxisConfig.ts';

function normalizeStoredAxisFields(
  panel: PlotPanelConfig
): Pick<PlotPanelConfig, 'autoScale' | 'xMin' | 'xMax' | 'yMin' | 'yMax'> {
  const fields: Pick<PlotPanelConfig, 'autoScale' | 'xMin' | 'xMax' | 'yMin' | 'yMax'> = {};
  if (panel.autoScale === false) {
    fields.autoScale = false;
  }

  const xMin = finitePlotLimit(panel.xMin);
  const xMax = finitePlotLimit(panel.xMax);
  const yMin = finitePlotLimit(panel.yMin);
  const yMax = finitePlotLimit(panel.yMax);

  if (xMin != null) {
    fields.xMin = xMin;
  }
  if (xMax != null) {
    fields.xMax = xMax;
  }
  if (yMin != null) {
    fields.yMin = yMin;
  }
  if (yMax != null) {
    fields.yMax = yMax;
  }

  return fields;
}

export const EMPTY_PLOTS_CONFIG: ScenePlotsConfig = { panels: [] };

function normalizeXMode(xMode: PlotPanelXMode | undefined): PlotPanelXMode {
  return xMode === 'channel' ? 'channel' : 'time';
}

export function normalizeStoredChannelScale(scale: number | undefined): number | undefined {
  return finiteChannelScale(scale);
}

function finiteChannelScale(scale: number | undefined): number | undefined {
  if (scale == null || !Number.isFinite(scale) || scale === 1) {
    return undefined;
  }

  return scale;
}

function normalizeChannelScaleFields(
  panel: PlotPanelConfig,
  xMode: PlotPanelXMode
): Pick<PlotPanelConfig, 'yChannelScale' | 'xChannelScale'> {
  if (xMode !== 'channel') {
    return {};
  }

  const fields: Pick<PlotPanelConfig, 'yChannelScale' | 'xChannelScale'> = {};
  const yChannelScale = finiteChannelScale(panel.yChannelScale);
  const xChannelScale = finiteChannelScale(panel.xChannelScale);

  if (yChannelScale != null) {
    fields.yChannelScale = yChannelScale;
  }
  if (xChannelScale != null) {
    fields.xChannelScale = xChannelScale;
  }

  return fields;
}

function normalizePanel(panel: PlotPanelConfig): PlotPanelConfig {
  const channels = [...new Set((panel.channels ?? []).filter((channel) => channel.trim().length > 0))];
  const title = panel.title?.trim();
  const xMode = normalizeXMode(panel.xMode);
  const xChannel = panel.xChannel?.trim();

  const axisFields = normalizeStoredAxisFields(panel);

  return {
    ...(title ? { title } : {}),
    channels,
    xMode,
    ...(xMode === 'channel' && xChannel ? { xChannel } : {}),
    ...normalizeChannelScaleFields(panel, xMode),
    ...axisFields,
  };
}

export function normalizePlotsConfig(plots: SceneConfig['plots']): ScenePlotsConfig {
  if (!plots || !Array.isArray(plots.panels)) {
    return { panels: [] };
  }

  return {
    panels: plots.panels.map((panel) => normalizePanel(panel)),
  };
}

export function collectPlotConfigDiagnostics(
  plots: ScenePlotsConfig,
  channelNames: string[]
): string[] {
  const available = new Set(channelNames);
  const warnings: string[] = [];

  for (const [panelIndex, panel] of plots.panels.entries()) {
    const panelLabel = panel.title?.trim() || `Panel ${panelIndex + 1}`;
    for (const channel of panel.channels) {
      if (!available.has(channel)) {
        warnings.push(`Plot "${panelLabel}" references unknown channel "${channel}".`);
      }
    }
    if (panel.xMode === 'channel' && panel.xChannel && !available.has(panel.xChannel)) {
      warnings.push(`Plot "${panelLabel}" references unknown X channel "${panel.xChannel}".`);
    }
  }

  return warnings;
}

export function createEmptyPlotPanel(): PlotPanelConfig {
  return { channels: [], xMode: 'time' };
}
