export function normalizeOutPath(
  p: string | "none" | "auto",
  defaultValue: string | undefined
): string | undefined {
  if (p === "none") {
    return undefined;
  }
  if (p === "auto") {
    return defaultValue;
  }
  return p as string;
}

export function isOptionDefined(v: any) {
  if (v === false || v === 0) return true;
  if (!v) return false;
  if (v.length) {
    return true;
  }
  if (typeof v === "object") {
    for (const _ in v) {
      return true;
    }
    return false;
  }
  return true;
}
