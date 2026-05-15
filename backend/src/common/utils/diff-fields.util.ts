export function getChangedFields<T extends Record<string, any>>(
  original: T,
  updated: Partial<T>,
): Record<string, { old: any; new: any }> {
  const diff: Record<string, { old: any; new: any }> = {};

  for (const key of Object.keys(updated)) {
    if (original[key] !== updated[key]) {
      diff[key] = {
        old: original[key],
        new: updated[key],
      };
    }
  }

  return diff;
}
