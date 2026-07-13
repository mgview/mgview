export const ODE_BLOCK_AUTO_COLLAPSE_LINE_COUNT = 8;

export type MotionGenesisOutputLineTone =
  | 'default'
  | 'comment'
  | 'generated'
  | 'input'
  | 'ode-header'
  | 'ode-data';

export type MotionGenesisOdeBlockLine = {
  key: string;
  line: string;
  tone: MotionGenesisOutputLineTone;
};

export type MotionGenesisOutputSegment =
  | {
      type: 'line';
      key: string;
      line: string;
      tone: MotionGenesisOutputLineTone;
    }
  | {
      type: 'ode-block';
      key: string;
      commandLine: string;
      lines: MotionGenesisOdeBlockLine[];
      collapsedByDefault: boolean;
    };

function getOutputLineTone(line: string): MotionGenesisOutputLineTone {
  const trimmed = line.trimStart();
  if (/^\(\d+\)\s*%/.test(trimmed)) {
    return 'comment';
  }
  if (trimmed.startsWith('->')) {
    return 'generated';
  }
  if (/^\(\d+\)/.test(trimmed)) {
    return 'input';
  }
  return 'default';
}

function getOdeBlockLineTone(line: string): MotionGenesisOutputLineTone {
  const trimmed = line.trimStart();
  if (trimmed.startsWith('%')) {
    return 'comment';
  }
  if (/^[+\-]?\d\.\d+E[+\-]\d+/.test(trimmed)) {
    return 'ode-data';
  }
  if (trimmed.length > 0) {
    return 'ode-header';
  }
  return 'default';
}

export function parseMotionGenesisOutput(output: string): MotionGenesisOutputSegment[] {
  const lines = output.split('\n');
  const segments: MotionGenesisOutputSegment[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? '';
    const trimmed = line.trimStart();

    if (/^\(\d+\)\s+ODE\(\)/.test(trimmed)) {
      const blockLines: MotionGenesisOdeBlockLine[] = [];
      let cursor = index + 1;
      while (cursor < lines.length) {
        const nextLine = lines[cursor] ?? '';
        if (/^ODE completed\b/.test(nextLine.trimStart())) {
          break;
        }
        blockLines.push({
          key: `ode-${index}-${cursor}`,
          line: nextLine,
          tone: getOdeBlockLineTone(nextLine),
        });
        cursor += 1;
      }

      if (blockLines.length > 0) {
        segments.push({
          type: 'ode-block',
          key: `ode-${index}`,
          commandLine: line,
          lines: blockLines,
          collapsedByDefault: blockLines.length >= ODE_BLOCK_AUTO_COLLAPSE_LINE_COUNT,
        });
        index = cursor - 1;
        continue;
      }
    }

    segments.push({
      type: 'line',
      key: `line-${index}-${line}`,
      line,
      tone: getOutputLineTone(line),
    });
  }

  return segments;
}

export function getMotionGenesisOutputToneClassName(tone: MotionGenesisOutputLineTone): string {
  if (tone === 'comment') {
    return 'text-emerald-700 dark:text-emerald-300';
  }
  if (tone === 'generated') {
    return 'text-sky-700 dark:text-sky-300';
  }
  if (tone === 'input') {
    return 'text-amber-800 dark:text-amber-100';
  }
  if (tone === 'ode-header') {
    return 'text-violet-700 dark:text-violet-200';
  }
  if (tone === 'ode-data') {
    return 'text-cyan-700 dark:text-cyan-100';
  }
  return 'text-foreground';
}
