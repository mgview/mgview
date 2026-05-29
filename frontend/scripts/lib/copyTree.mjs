import { cp, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';

export async function copyTree(source, target, options = {}) {
  const { exclude = () => false } = options;
  await mkdir(target, { recursive: true });
  await cp(source, target, {
    recursive: true,
    filter: (src) => !exclude(src),
  });
}

export async function replaceDir(source, target, options = {}) {
  await rm(target, { recursive: true, force: true });
  await copyTree(source, target, options);
}

export function excludeDotfiles(src) {
  return path.basename(src).startsWith('.');
}
