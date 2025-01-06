import { Header, Pack, Parser, ReadEntry } from "tar";
import { type StreamReader, toReadableStream, toStreamReader, toWriteableStream } from "./stream";

export type TarOptions = NonNullable<ConstructorParameters<typeof Pack>[0]>;

export interface TarTransformer {
  (
    entry: ReadEntry,
    reader: StreamReader
  ): PromiseLike<ReadableStream | Blob | undefined | false> | undefined | false;
}

export function transformTarball(transform?: TarTransformer, options?: TarOptions) {
  const pack = new Pack(options);
  const { readable, writable } = new TransformStream();
  void (async () => {
    for await (const [entry, reader] of iterEntries(readable)) {
      const res = (await transform?.(entry, reader)) || reader.readable;

      const [stream, size] = "size" in res ? [res.stream(), res.size] : [res, entry.header.size];
      const header = new Header({ ...entry.header, type: entry.type, size });
      const newEntry = new ReadEntry(header);
      const p = stream.pipeTo(toWriteableStream(newEntry as unknown as NodeJS.WritableStream));
      pack.add(newEntry);
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
      const next = await Promise.race([pEnd, pEntry]);
      if (!next) {
        break;
      }
      pEntry = readEntry();
      yield [next, toStreamReader(toReadableStream(next))] as const;
      if (!next.emittedEnd) {
        next.on("data", () => {});
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
