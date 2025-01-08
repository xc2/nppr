import { PassThrough, Readable, Writable } from "node:stream";
import { concatBuffer, toUint8Array } from "./encoding";

export function toReadableStream<T extends Pick<NodeJS.ReadableStream, "pipe">>(pass: T) {
  if (pass instanceof Readable) {
    return Readable.toWeb(pass) as ReadableStream;
  } else if (pass instanceof PassThrough) {
    return Readable.toWeb(pass) as ReadableStream;
  } else {
    const passThrough = new PassThrough();
    pass.pipe(passThrough);
    return Readable.toWeb(passThrough) as ReadableStream;
  }
}

export function toWriteableStream<T extends NodeJS.WritableStream>(pass: T) {
  if (pass instanceof Writable) {
    return Writable.toWeb(pass) as WritableStream;
  } else if (pass instanceof PassThrough) {
    return Writable.toWeb(pass) as WritableStream;
  } else {
    const passThrough = new PassThrough();
    passThrough.pipe(pass);
    return Writable.toWeb(passThrough) as WritableStream;
  }
}

export function bufferToReadable(buffer: ArrayBufferView | ArrayBufferLike) {
  return new ReadableStream({
    type: "bytes",
    pull(controller) {
      controller.enqueue(toUint8Array(buffer));
      controller.close();
    },
  });
}

export async function readableToBuffer(readable: ReadableStream) {
  const reader = readable.getReader();
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    chunks.push(value);
  }
  return concatBuffer(chunks);
}

type ReadableStreamHandler<T> = (r: ReadableStream) => T;
type F<T extends ReadableStreamHandler<unknown>[]> = T extends [
  ReadableStreamHandler<infer A>,
  ...infer B,
]
  ? [A, ...(B extends ReadableStreamHandler<unknown>[] ? F<B> : [])]
  : [];

export function duplicate<T extends ReadableStreamHandler<unknown>[]>(
  readable: ReadableStream,
  ...handlers: T
) {
  let source = readable;
  const results = [] as any;
  for (const handler of handlers) {
    const [a, b] = source.tee();
    source = a;
    results.push(handler(b));
  }
  return [source, ...results] as [ReadableStream, ...F<T>];
}

export interface StreamReader {
  readable: ReadableStream;
  arrayBuffer: () => Promise<ArrayBuffer>;
  text: () => Promise<string>;
  json: <T = any>() => Promise<T>;
  tee: () => [StreamReader, StreamReader];
}

export function toStreamReader(readable: ReadableStream): StreamReader {
  const arrayBuffer: Response["arrayBuffer"] = () => readableToBuffer(readable);
  const text: Response["text"] = async () => new TextDecoder().decode(await arrayBuffer());
  const json: Response["json"] = async () => JSON.parse(await text());
  const tee = () => readable.tee().map(toStreamReader) as [StreamReader, StreamReader];
  return {
    readable,
    arrayBuffer,
    text,
    json,
    tee,
  };
}
