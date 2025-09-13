// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function sortObjectKeys(obj: Record<string, any>): Record<string, any> {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(sortObjectKeys);
  }

  // It's an object, sort its keys
  const sortedKeys = Object.keys(obj).sort();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const newObj: Record<string, any> = {};
  for (const key of sortedKeys) {
    newObj[key] = sortObjectKeys(obj[key]);
  }
  return newObj;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function sortObjectArrayByKey<T extends Record<string, any>>(
  array: T[],
  key: keyof T,
  secondaryKey?: keyof T,
  direction?: 'asc' | 'desc',
): T[] {
  const dir = direction ?? 'asc';

  const sorted = array.sort((a, b) => {
    const aValue = a[key];
    const bValue = b[key];
    if (aValue < bValue) return dir === 'desc' ? 1 : -1;
    if (aValue > bValue) return dir === 'desc' ? -1 : 1;

    // If values are equal, sort by secondary key
    if (secondaryKey) {
      const aSecondaryValue = a[secondaryKey];
      const bSecondaryValue = b[secondaryKey];
      if (aSecondaryValue < bSecondaryValue) return dir === 'desc' ? 1 : -1;
      if (aSecondaryValue > bSecondaryValue) return dir === 'desc' ? -1 : 1;
    }

    return 0;
  });

  return sorted;
}
