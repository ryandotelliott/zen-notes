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
export function sortObjectArrayByKeys<T extends Record<string, any>>(
  array: T[],
  keys: Array<keyof T>,
  direction: 'asc' | 'desc' = 'asc',
): T[] {
  return array.sort((a, b) => {
    for (const key of keys) {
      if (a[key] === b[key]) continue;
      return (a[key] < b[key] ? -1 : 1) * (direction === 'desc' ? -1 : 1);
    }
    return 0;
  });
}
