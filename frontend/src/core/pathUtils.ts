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

export function getRelativePath(fromDirectory: string, toPath: string): string {
  const fromSegments = normalizePathSeparators(fromDirectory)
    .replace(/\/$/, '')
    .split('/')
    .filter((segment) => segment.length > 0);
  const toSegments = normalizePathSeparators(toPath)
    .split('/')
    .filter((segment) => segment.length > 0);

  let sharedLength = 0;
  while (
    sharedLength < fromSegments.length &&
    sharedLength < toSegments.length &&
    fromSegments[sharedLength] === toSegments[sharedLength]
  ) {
    sharedLength += 1;
  }

  const upwardSegments = new Array(fromSegments.length - sharedLength).fill('..');
  const relativeSegments = upwardSegments.concat(toSegments.slice(sharedLength));
  return relativeSegments.join('/') || '.';
}
