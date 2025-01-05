/**
 * Convert data source to Uint8Array
 * @param data
 * @param byteOffset
 * @param byteLength
 */
export function toUint8Array(
  data: ArrayBuffer | Uint8Array | number | string | Array<number> | ArrayBufferLike,
  byteOffset?: number,
  byteLength?: number
) {
  if (typeof data === "number") {
    data = new Uint8Array([data]);
  } else if (typeof data === "string") {
    try {
      data = new TextEncoder().encode(data);
    } catch {
      data = Uint8Array.from(data as string, (c) => c.charCodeAt(0));
    }
  }
  if (data instanceof ArrayBuffer) {
    return new Uint8Array(data, byteOffset, byteLength);
  }
  if (Array.isArray(data)) {
    data = new Uint8Array(data);
  }
  const view = data as Uint8Array;
  return new Uint8Array(view.buffer, byteOffset ?? view.byteOffset, byteLength ?? view.byteLength);
}

/**
 * Concatenate multiple Uint8Array or ArrayBuffer into a single ArrayBuffer
 * @param arrays
 */
export function concatBuffer(arrays: (Uint8Array | ArrayBuffer)[]) {
  const views = arrays.map((a) => toUint8Array(a));

  const totalLength = views.reduce((sum, view) => sum + view.byteLength, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const view of views) {
    result.set(view, offset);
    offset += view.byteLength;
  }
  return result.buffer;
}
