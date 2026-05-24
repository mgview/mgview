import type { SimulationTable, SimulationTableRow } from './types.ts';

function tokenize(line: string): string[] {
  return line.trim().split(/\s+/).filter(Boolean);
}

export function parseSimulationText(text: string, fileLabel?: string): SimulationTable {
  const lines = text.split(/\r?\n/);
  const headerLine = lines.find((line) => {
    if (!line.startsWith('%')) {
      return false;
    }

    const tokens = tokenize(line.replace(/^%\s*/, ''));
    return tokens[0] === 't';
  });

  if (!headerLine) {
    throw new Error(`Could not locate a simulation header${fileLabel ? ` in ${fileLabel}` : ''}.`);
  }

  const headerTokens = tokenize(headerLine.replace(/^%\s*/, ''));
  if (headerTokens[0] !== 't') {
    throw new Error(`Expected the first simulation column to be "t"${fileLabel ? ` in ${fileLabel}` : ''}.`);
  }

  const channelNames = headerTokens.slice(1);
  const rows: SimulationTableRow[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('%')) {
      continue;
    }

    const tokens = tokenize(trimmed);
    if (tokens.length < 1) {
      continue;
    }

    const time = Number(tokens[0]);
    if (!Number.isFinite(time)) {
      continue;
    }

    const values: Record<string, number> = {};
    for (let index = 0; index < channelNames.length; index += 1) {
      const rawValue = tokens[index + 1];
      if (rawValue === undefined) {
        continue;
      }

      const numericValue = Number(rawValue);
      if (Number.isFinite(numericValue)) {
        values[channelNames[index]] = numericValue;
      }
    }

    rows.push({ time, values });
  }

  return { fileLabel, channelNames, rows };
}
