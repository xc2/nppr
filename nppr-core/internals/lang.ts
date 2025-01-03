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
