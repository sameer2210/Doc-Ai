export function getChangedFields<T extends Record<string, unknown>>(
  original: T,
  updated: Partial<T>,
): Record<string, { old: unknown; new: unknown }> {
  const diff: Record<string, { old: unknown; new: unknown }> = {};

  for (const key of Object.keys(updated) as Array<keyof T>) {
    if (original[key] !== updated[key]) {
      diff[String(key)] = {
        old: original[key],
        new: updated[key],
      };
    }
  }

  return diff;
}
