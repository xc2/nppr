type IterYield<T extends AsyncIterableIterator<any>> = T extends AsyncIterableIterator<infer R>
  ? R
  : never;
export async function findMapAsync<T extends AsyncIterableIterator<any>, Return>(
  iter: T,
  fn: (value: IterYield<T>) => Return | PromiseLike<Return | undefined> | undefined
): Promise<Return | undefined> {
  for await (const value of iter) {
    const b = await fn(value);
    if (b !== undefined) {
      return b;
    }
  }
  return undefined;
}
