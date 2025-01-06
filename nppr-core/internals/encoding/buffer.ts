/**
 * Convert data source to Uint8Array
 * @param data
 * @param byteOffset
 * @param byteLength
 */
export function toUint8Array(
  data: number | string | Array<number> | ArrayBufferLike | ArrayBufferView,
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

  if (Array.isArray(data)) {
    data = new Uint8Array(data);
  }
  if ("buffer" in data) {
    return new Uint8Array(
      data.buffer,
      byteOffset ?? data.byteOffset,
      byteLength ?? data.byteLength
    );
  }
  return new Uint8Array(data, byteOffset, byteLength);
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

export function sliceView<T extends ArrayBufferLike>(view: ArrayBufferView<T>) {
  return view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength);
}

export function toHex(buffer: ArrayBufferLike) {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
