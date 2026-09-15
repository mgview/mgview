import type { MgHelpIndex } from '../src/core/mgLanguage/mgHelpTypes.ts';

export function buildMgHelpIndex(
  html: string,
  options?: { commandNames?: string[] },
): MgHelpIndex;
