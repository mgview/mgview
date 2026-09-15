export function loadCachedAsset<T>(
  cache: Map<string, Promise<T>>,
  key: string,
  load: () => Promise<T>
): Promise<T> {
  const existing = cache.get(key);
  if (existing) {
    return existing;
  }

  const pending = load().catch((error: unknown) => {
    if (cache.get(key) === pending) {
      cache.delete(key);
    }
    throw error;
  });
  cache.set(key, pending);
  return pending;
}
