export function get<T extends Record<string, any>>(obj: T, key: string) {
  // try getting key directly first to allow `{"a.b": 1}` to be accessed as `a.b`
  if (key in obj) return obj[key];
  const [k, ...rest] = key.split(".");
  if (k in obj) return get(obj[k], rest.join("."));
  return undefined;
}
