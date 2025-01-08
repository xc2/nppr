export function tryToNumber(f: string | number): number | string {
  if (typeof f === "number") return f;
  if (`${f}` === `${Number(f)}`) return Number(f);
  return f;
}
