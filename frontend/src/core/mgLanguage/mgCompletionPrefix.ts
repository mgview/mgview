export interface CompletionPrefix {
  isMemberAccess: boolean;
  prefix: string;
  startColumn: number;
}

export function getCompletionPrefix(lineContent: string, column: number): CompletionPrefix {
  const textBeforeCursor = lineContent.slice(0, Math.max(0, column - 1));
  const tailMatch = textBeforeCursor.match(/(?:^|[^A-Za-z0-9_])([A-Za-z_][A-Za-z0-9_.]*)$/);

  if (!tailMatch) {
    return {
      prefix: '',
      isMemberAccess: false,
      startColumn: column,
    };
  }

  const tail = tailMatch[1];
  const dotIndex = tail.lastIndexOf('.');
  const prefix = dotIndex >= 0 ? tail.slice(dotIndex + 1) : tail;

  return {
    prefix,
    isMemberAccess: dotIndex >= 0,
    startColumn: column - prefix.length,
  };
}
