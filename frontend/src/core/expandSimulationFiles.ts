export function expandSimulationFiles(entries: string[], basePath = ''): string[] {
  const files: string[] = [];

  for (const entry of entries) {
    const lastDot = entry.lastIndexOf('.');
    if (lastDot === -1) {
      files.push(basePath + entry);
      continue;
    }

    const fileBase = entry.slice(0, lastDot);
    const suffix = entry.slice(lastDot + 1);
    const [firstText, lastText = firstText] = suffix.split(':');
    const firstValue = Number(firstText);
    const lastValue = Number(lastText);

    if (!Number.isFinite(firstValue) || !Number.isFinite(lastValue)) {
      files.push(basePath + entry);
      continue;
    }

    for (let fileNumber = firstValue; fileNumber <= lastValue; fileNumber += 1) {
      files.push(`${basePath}${fileBase}.${fileNumber}`);
    }
  }

  return files;
}
