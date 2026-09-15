export function createUniqueVisualName(existingNames: Iterable<string>) {
  const names = new Set(existingNames);
  let index = 1;
  while (names.has(`visual_${index}`)) {
    index += 1;
  }
  return `visual_${index}`;
}
