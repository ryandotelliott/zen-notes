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
