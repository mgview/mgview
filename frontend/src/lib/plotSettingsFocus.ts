/** Root element for an open plot panel's channel/settings editor. */
export const PLOT_SETTINGS_SELECTOR = '[data-plot-settings]';

let activePanelIndex: number | null = null;
let documentListenerInstalled = false;

function readPanelIndexFromSettingsRoot(element: HTMLElement): number | null {
  const raw = element.dataset.plotSettings;
  if (raw === undefined) {
    return null;
  }
  const index = Number.parseInt(raw, 10);
  return Number.isFinite(index) ? index : null;
}

function ensureDocumentListener() {
  if (documentListenerInstalled) {
    return;
  }
  documentListenerInstalled = true;
  document.addEventListener(
    'pointerdown',
    (event) => {
      const target = event.target;
      if (!(target instanceof Node)) {
        activePanelIndex = null;
        return;
      }

      const settingsRoot = target.closest(PLOT_SETTINGS_SELECTOR);
      if (settingsRoot instanceof HTMLElement) {
        activePanelIndex = readPanelIndexFromSettingsRoot(settingsRoot);
        return;
      }

      activePanelIndex = null;
    },
    true
  );
}

export function claimPlotSettings(panelIndex: number) {
  ensureDocumentListener();
  activePanelIndex = panelIndex;
}

export function getActivePlotSettingsPanelIndex(): number | null {
  return activePanelIndex;
}

export function clearActivePlotSettings() {
  activePanelIndex = null;
}
