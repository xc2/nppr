export function dirtyTimestampToDate(ts: string, ratio = 1) {
  if (!ts) {
    return null;
  }
  const d = new Date(Number(ts) * ratio);
  if (d.getTime()) {
    return d;
  }
  return null;
}

export function toYMDHMS(date: Date) {
  return date
    .toISOString()
    .replace(/\..+$/, "")
    .replace(/[^0-9]/g, "");
}

export async function destructPromise<Data, Err extends Error = Error>(
  promise: PromiseLike<Data>
): Promise<[false, Err] | [true, Data]> {
  try {
    const data = await promise;
    return [true, data];
  } catch (e) {
    return [false, e as Err];
  }
}
