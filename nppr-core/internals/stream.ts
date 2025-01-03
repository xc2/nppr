import { createReadStream } from "node:fs";
import { PassThrough, Readable, Writable } from "node:stream";
import { toUint8Array } from "./lang";

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

export function unstream<T extends Uint8Array | ArrayBuffer | string = Uint8Array>(
  transform: (data: Blob) => T | PromiseLike<T>
) {
  let all: T[] = [];
  return new TransformStream<T>({
    transform(chunk) {
      all.push(chunk);
    },
    async flush(controller) {
      const blob = new Blob(all);
      all = [];
      const fin = await transform(blob);
      controller.enqueue(toUint8Array(fin));
    },
  });
}

export function unstreamText(transform: (data: string) => string | PromiseLike<string>) {
  return unstream(async (blob) => {
    const text = new TextDecoder().decode(await blob.arrayBuffer());

    return new TextEncoder().encode(await transform(text));
  });
}

export function bufferToReadable(buffer: ArrayBufferLike) {
  return new ReadableStream({
    pull(controller) {
      controller.enqueue(toUint8Array(buffer));
      controller.close();
    },
  });
}
export function nullWritable() {
  return new WritableStream({
    write() {
      console.log("write");
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
  return Buffer.concat(chunks);
}

export function createReadable(
  filePathOrBuffer: string | Buffer | Uint8Array | ArrayBufferLike | ReadableStream
): ReadableStream {
  if (typeof filePathOrBuffer === "string") {
    return Readable.toWeb(createReadStream(filePathOrBuffer)) as ReadableStream;
  }
  if ("getReader" in filePathOrBuffer) {
    return filePathOrBuffer;
  }

  return bufferToReadable(filePathOrBuffer);
}
