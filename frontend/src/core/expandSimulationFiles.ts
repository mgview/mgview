export function expandSimulationDataEntry(entry: string): string[] {
  const lastDot = entry.lastIndexOf('.');
  if (lastDot === -1) {
    return [entry];
  }

  const fileBase = entry.slice(0, lastDot);
  const suffix = entry.slice(lastDot + 1);
  const [firstText, lastText = firstText] = suffix.split(':');
  const firstValue = Number(firstText);
  const lastValue = Number(lastText);

  if (!Number.isFinite(firstValue) || !Number.isFinite(lastValue)) {
    return [entry];
  }

  const files: string[] = [];
  for (let fileNumber = firstValue; fileNumber <= lastValue; fileNumber += 1) {
    files.push(`${fileBase}.${fileNumber}`);
  }

  return files;
}

export function expandSimulationDataEntries(entries: string[]): string[] {
  const expanded: string[] = [];
  const seen = new Set<string>();

  for (const entry of entries) {
    for (const expandedEntry of expandSimulationDataEntry(entry)) {
      if (!seen.has(expandedEntry)) {
        seen.add(expandedEntry);
        expanded.push(expandedEntry);
      }
    }
  }

  return expanded;
}

export function expandSimulationFiles(entries: string[], basePath = ''): string[] {
  return expandSimulationDataEntries(entries).map((entry) => basePath + entry);
}

export function findSimulationEntryForExpandedFile(
  expandedPath: string,
  entries: string[],
  basePath = ''
): string | null {
  for (const entry of entries) {
    if (expandSimulationFiles([entry], basePath).includes(expandedPath)) {
      return entry;
    }
  }

  return null;
}
