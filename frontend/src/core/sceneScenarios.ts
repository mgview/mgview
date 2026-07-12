import type { FileBrowserListing } from '../api/localFiles.ts';
import type { SceneConfig, SceneScenario } from './types.ts';
import { expandSimulationDataEntries } from './expandSimulationFiles.ts';

export const DEFAULT_SCENARIO_ID = 'default';
export const DEFAULT_SCENARIO_LABEL = 'Default';

export function nextSimDataLabel(scenarios: Array<Pick<SceneScenario, 'label'>>): string {
  const labels = new Set(scenarios.map((scenario) => scenario.label.trim()));
  let number = 1;
  while (labels.has(`Sim Data ${number}`)) {
    number += 1;
  }
  return `Sim Data ${number}`;
}

export function hasScenarioMode(scene: Pick<SceneConfig, 'scenarios'>): boolean {
  return Array.isArray(scene.scenarios) && scene.scenarios.length > 0;
}

export function ensureScenarios(
  scene: Pick<SceneConfig, 'scenarios' | 'simulationData' | 'activeScenario'>
): { scenarios: SceneScenario[]; activeScenario: string } {
  const normalized = normalizeScenarios(scene.scenarios);
  if (normalized.length > 0) {
    const active = resolveActiveScenario(normalized, scene.activeScenario);
    return {
      scenarios: normalized,
      activeScenario: active?.id ?? DEFAULT_SCENARIO_ID,
    };
  }

  const defaultScenario: SceneScenario = {
    id: DEFAULT_SCENARIO_ID,
    label: DEFAULT_SCENARIO_LABEL,
    simulationData: expandSimulationDataEntries(
      (scene.simulationData ?? [])
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0)
    ),
  };

  return {
    scenarios: [defaultScenario],
    activeScenario: DEFAULT_SCENARIO_ID,
  };
}

export function resolveActiveScenario(
  scenarios: SceneScenario[],
  activeScenarioId: string | null | undefined
): SceneScenario | null {
  if (scenarios.length === 0) {
    return null;
  }

  const trimmedId = activeScenarioId?.trim();
  if (trimmedId) {
    const match = scenarios.find((scenario) => scenario.id === trimmedId);
    if (match) {
      return match;
    }
  }

  return scenarios[0] ?? null;
}

export function getEffectiveSimulationData(scene: SceneConfig): string[] {
  if (hasScenarioMode(scene)) {
    const active = resolveActiveScenario(scene.scenarios ?? [], scene.activeScenario);
    return active ? expandSimulationDataEntries(active.simulationData) : [];
  }

  return expandSimulationDataEntries(scene.simulationData ?? []);
}

export function normalizeScenarios(scenarios: SceneScenario[] | undefined): SceneScenario[] {
  if (!Array.isArray(scenarios)) {
    return [];
  }

  return scenarios
    .map((scenario) => ({
      id: scenario.id.trim(),
      label: scenario.label.trim(),
      simulationData: expandSimulationDataEntries(
        scenario.simulationData
          .map((entry) => entry.trim())
          .filter((entry) => entry.length > 0)
      ),
    }))
    .filter((scenario) => scenario.id.length > 0 && scenario.label.length > 0);
}

export function slugifyScenarioId(value: string): string {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return normalized.length > 0 ? normalized : 'scenario';
}

const GENERIC_ODE_FILE_STEMS = new Set(['data', 'output', 'results', 'out', 'ode']);

function titleCaseWords(value: string): string {
  return value
    .split(/[_-]+/)
    .filter((piece) => piece.length > 0)
    .map((piece) => piece.charAt(0).toUpperCase() + piece.slice(1))
    .join(' ');
}

function splitOdeBasePathPieces(odeBasePath: string): { directory: string; fileStem: string; parentStem: string | null } {
  const pieces = odeBasePath.replace(/\\/g, '/').replace(/\/+$/g, '').split('/').filter((piece) => piece.length > 0);
  const fileStem = pieces[pieces.length - 1] ?? odeBasePath;
  const parentStem = pieces.length > 1 ? pieces[pieces.length - 2] ?? null : null;
  const directory =
    pieces.length > 1 ? pieces.slice(0, -1).join('/') : '.';

  return { directory, fileStem, parentStem };
}

export function scenarioIdentityFromOdeBasePath(odeBasePath: string): { idBase: string; label: string } {
  const { fileStem, parentStem } = splitOdeBasePathPieces(odeBasePath);
  if (parentStem && GENERIC_ODE_FILE_STEMS.has(fileStem.toLowerCase())) {
    return { idBase: parentStem, label: titleCaseWords(parentStem) };
  }

  return { idBase: fileStem, label: titleCaseWords(fileStem) };
}

export function labelFromOdeBasePath(odeBasePath: string): string {
  return scenarioIdentityFromOdeBasePath(odeBasePath).label;
}

export function stripSimulationDataSuffix(entry: string): string {
  return entry.trim().replace(/\.(\d+)(:\d+)?$/, '');
}

export function uniqueScenarioId(idBase: string, existingIds: string[]): string {
  const baseId = slugifyScenarioId(idBase);
  let id = baseId;
  let suffix = 2;
  while (existingIds.includes(id)) {
    id = `${baseId}_${suffix}`;
    suffix += 1;
  }
  return id;
}

export function detectCompletedOdeOutputs(output: string): string[] {
  const lines = output.split('\n');
  const results: string[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? '';
    const match = line.trimStart().match(/^\(\d+\)\s+ODE\([^)]*\)\s*(.*)$/i);
    if (!match) {
      continue;
    }

    let completed = false;
    for (let cursor = index + 1; cursor < lines.length; cursor += 1) {
      const nextLine = lines[cursor]?.trimStart() ?? '';
      if (/^ODE completed\b/i.test(nextLine)) {
        completed = true;
        break;
      }
      if (/^\(\d+\)\s+ODE\(/i.test(nextLine)) {
        break;
      }
    }

    if (!completed) {
      continue;
    }

    const outputPath = (match[1] ?? '').trim();
    results.push(outputPath.length > 0 ? outputPath : 'Data');
  }

  return [...new Set(results)];
}

function splitOdeBasePath(odeBasePath: string): { directory: string; fileStem: string } {
  const { directory, fileStem } = splitOdeBasePathPieces(odeBasePath);
  return { directory, fileStem };
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function discoverSimulationDataEntryFromListing(
  odeBasePath: string,
  listing: FileBrowserListing
): string | null {
  const { directory, fileStem } = splitOdeBasePath(odeBasePath);
  const pattern = new RegExp(`^${escapeRegExp(fileStem)}\\.(\\d+)$`, 'i');
  const fileNumbers = listing.entries
    .filter((entry) => entry.type === 'file' && pattern.test(entry.name))
    .map((entry) => Number(entry.name.slice(fileStem.length + 1)))
    .filter((value) => Number.isFinite(value))
    .sort((left, right) => left - right);

  if (fileNumbers.length === 0) {
    return null;
  }

  const animateNumbers = fileNumbers.filter((value) => value >= 2);
  const first = animateNumbers.length >= 2 ? animateNumbers[0] : fileNumbers[0];
  const last =
    animateNumbers.length >= 2 ? animateNumbers[animateNumbers.length - 1] : fileNumbers[fileNumbers.length - 1];
  if (first === undefined || last === undefined) {
    return null;
  }

  const entryStem = directory === '.' ? fileStem : `${directory}/${fileStem}`;
  return first === last ? `${entryStem}.${first}` : `${entryStem}.${first}:${last}`;
}

export function buildScenarioFromOdeBasePath(
  odeBasePath: string,
  simulationDataEntry: string,
  existingIds: string[]
): SceneScenario {
  const { idBase, label } = scenarioIdentityFromOdeBasePath(odeBasePath);
  const id = uniqueScenarioId(idBase, existingIds);

  return {
    id,
    label,
    simulationData: expandSimulationDataEntries([simulationDataEntry]),
  };
}

export function buildScenarioFromSimulationDataEntry(
  simulationDataEntry: string,
  existingIds: string[]
): SceneScenario {
  const odeBasePath = stripSimulationDataSuffix(simulationDataEntry);
  return buildScenarioFromOdeBasePath(odeBasePath, simulationDataEntry.trim(), existingIds);
}

export function sceneHasVisualizationData(scene: SceneConfig): boolean {
  if (hasScenarioMode(scene)) {
    return (scene.scenarios ?? []).some((scenario) => scenario.simulationData.length > 0);
  }

  return (scene.simulationData ?? []).length > 0;
}

export async function discoverSimulationDataEntries(
  sceneDirectoryPath: string,
  odeBasePaths: string[],
  listDirectory: (directoryPath: string) => Promise<FileBrowserListing>
): Promise<Array<{ odeBasePath: string; simulationDataEntry: string }>> {
  const results: Array<{ odeBasePath: string; simulationDataEntry: string }> = [];

  for (const odeBasePath of odeBasePaths) {
    const { directory } = splitOdeBasePath(odeBasePath);
    const browsePath =
      sceneDirectoryPath === '.'
        ? directory
        : directory === '.'
          ? sceneDirectoryPath
          : `${sceneDirectoryPath}/${directory}`;

    const listing = await listDirectory(browsePath);
    const simulationDataEntry = discoverSimulationDataEntryFromListing(odeBasePath, listing);
    if (simulationDataEntry) {
      results.push({ odeBasePath, simulationDataEntry });
    }
  }

  return results;
}
