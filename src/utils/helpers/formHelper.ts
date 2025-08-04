export const convertoToString = (value: unknown): string => {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  if (typeof value === 'number') {
    return value.toString();
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return value.join(',');
  }
  if (value instanceof File) {
    return value.name;
  }
  return String(value);
};
