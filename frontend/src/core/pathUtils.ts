export function normalizePathSeparators(path: string): string {
  return path.replace(/\\/g, '/');
}

export function getBasePath(path: string): string {
  const normalized = normalizePathSeparators(path);
  const slashIndex = normalized.lastIndexOf('/');
  return slashIndex === -1 ? '' : normalized.slice(0, slashIndex + 1);
}

export function getFileExtension(path: string): string {
  const fileName = normalizePathSeparators(path).split('/').pop() ?? path;
  const pieces = fileName.split('.');
  return pieces.length > 1 ? pieces[pieces.length - 1].toLowerCase() : '';
}
