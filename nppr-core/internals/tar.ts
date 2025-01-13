import { Header, Pack, Parser, ReadEntry } from "tar";
import type { MaybePromise } from "./lang";
import {
  type StreamReader,
  bufferToReadable,
  toReadableStream,
  toStreamReader,
  toWriteableStream,
} from "./stream";

export type TarOptions = NonNullable<ConstructorParameters<typeof Pack>[0]>;

export interface TarTransformer {
  (
    reader: StreamReader,
    entry?: ReadEntry
  ): MaybePromise<ReadableStream | Blob | undefined | false>;
}

export function transformTarball(
  transform?: Record<string, TarTransformer | ReturnType<TarTransformer>>,
  options?: TarOptions
) {
  const pack = new Pack(options);
  const { readable, writable } = new TransformStream();

  void (async () => {
    const getTransform = (path: string) => {
      if (transform) {
        const t = transform[path];
        if (typeof t === "function") {
          return t;
        }
        return () => t;
      }
      return;
    };
    const walked = new Set<string>();
    for await (const [entry, reader] of iterEntries(readable)) {
      walked.add(entry.path);
      const t = getTransform(entry.path);
      const res = (await t?.(reader, entry)) || reader.readable;

      const [stream, size] = "size" in res ? [res.stream(), res.size] : [res, entry.header.size];
      const newEntry = new ReadEntry(new Header({ ...entry.header, type: entry.type, size }));
      const p = stream.pipeTo(toWriteableStream(newEntry as unknown as NodeJS.WritableStream));
      pack.add(newEntry);
      await p;
    }
    for (const path of Object.keys(transform ?? {})) {
      if (walked.has(path)) continue;
      const t = getTransform(path);
      const reader = toStreamReader(bufferToReadable(new Uint8Array()));
      const res = await t?.(reader);
      if (!res) continue;
      if (!("size" in res)) continue;

      const entry = new ReadEntry(new Header({ path, size: res.size, type: "File" }));
      const p = res.stream().pipeTo(toWriteableStream(entry as unknown as NodeJS.WritableStream));
      pack.add(entry);
      await p;
    }
    pack.end();
  })();
  return {
    readable: toReadableStream(pack),
    writable,
  };
}

export type TarParserOptions = Pick<
  TarOptions,
  "maxMetaEntrySize" | "onReadEntry" | "brotli" | "gzip" | "ondone" | "onwarn"
>;

export async function* iterEntries(source: ReadableStream, parseOptions?: TarParserOptions) {
  const extract = new Parser(parseOptions);
  const readEntry = () => {
    return new Promise<ReadEntry>((resolve, reject) => {
      extract.once("entry", resolve);
    });
  };
  const pEnd = new Promise<void>((resolve, reject) => {
    extract.once("finish", () => resolve());
    extract.once("abort", () => resolve());
    extract.once("error", reject);
  });
  try {
    let pEntry = readEntry();
    source.pipeTo(toWriteableStream(extract));
    while (true) {
      const current = await Promise.race([pEnd, pEntry]);
      if (!current) {
        break;
      }
      pEntry = readEntry();
      yield [current, toStreamReader(toReadableStream(current))] as const;
      if (!current.emittedEnd) {
        const ondata = () => {
          current.resume();
        };
        current.on("data", ondata);
        current.once("end", () => {
          current.off("data", ondata);
        });
      }
    }
  } finally {
    try {
      extract.abort({ name: "ITER_RETURN", message: "Aborted by iterEntries" });
    } catch {}
    await pEnd;
    extract.removeAllListeners();
  }
}
