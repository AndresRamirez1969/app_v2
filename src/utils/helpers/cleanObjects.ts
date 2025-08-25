export function cleanObject(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(cleanObject).filter((item) => item && (typeof item !== 'object' || Object.keys(item).length > 0));
  }

  if (obj && typeof obj === 'object') {
    const cleaned = {};

    for (const [key, value] of Object.entries(obj)) {
      const cleanedValue = cleanObject(value);

      const isEmpty =
        cleanedValue === null || cleanedValue === '' || (typeof cleanedValue === 'object' && Object.keys(cleanedValue).length === 0);

      if (!isEmpty) {
        (cleaned as Record<string, any>)[key] = cleanedValue;
      }
    }

    return cleaned as Record<string, any>;
  }

  return obj;
}
