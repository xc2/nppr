import { Header, type HeaderData, Pack, Parser, ReadEntry } from "tar";
import { DataStream, readableToBuffer, toReadableStream, toWriteableStream } from "./stream";

export interface TransformOptions extends ReadableWritablePair {
  size?: number;
}

export type GetTransformer = (entry: ReadEntry) => TransformOptions | undefined | null;

export type TarOptions = NonNullable<ConstructorParameters<typeof Pack>[0]>;

function PackJob(pack: Pack, keepOrder = false) {
  let queue: PromiseLike<any> = Promise.resolve();
  return function schedule(entry: ReadEntry | PromiseLike<ReadEntry>) {
    if (!pack.writable) {
      throw new Error("Pack is not on a state that can accept entries");
    }
    const fn =
      "then" in entry
        ? () =>
            entry.then(
              (e) => pack.add(e),
              (e) => {
                pack.emit("error", e);
              }
            )
        : () => pack.add(entry);
    if (keepOrder) {
      queue = queue.then(fn);
      return queue;
    } else {
      return fn();
    }
  };
}

function getEntry(_header: HeaderData, readable: ReadableStream) {
  const header = new Header(_header);
  if (header.size) {
    const entry = new ReadEntry(header);
    readable
      .pipeTo(toWriteableStream(entry as unknown as NodeJS.WritableStream))
      .then(null, (e) => {
        entry.emit("error", e);
      });
    return entry;
  } else {
    return (async () => {
      const buf = await readableToBuffer(readable);
      const header = new Header({ ..._header, size: buf.byteLength });
      const entry = new ReadEntry(header);
      entry.end(Buffer.from(buf));
      return entry;
    })();
  }
}

export function TarTransformStream(
  getTransformer?: GetTransformer,
  options?: { pack?: TarOptions; unpack?: TarOptions; keepOrder?: boolean }
): ReadableWritablePair {
  const pack = new Pack(options?.pack);
  const addEntry = PackJob(pack, options?.keepOrder);
  const extract = new Parser({
    ...options?.unpack,
    async onReadEntry(entry) {
      if (options?.unpack?.onReadEntry) {
        options.unpack.onReadEntry(entry);
      }

      try {
        const transformer = getTransformer?.(entry);
        if (transformer) {
          const readable = toReadableStream(entry).pipeThrough(transformer);
          const _header: HeaderData = {
            ...entry.header,
            type: entry.header.type,
            size: transformer.size,
          };
          await addEntry(getEntry(_header, readable));
        } else {
          addEntry(entry);
        }
      } catch (e) {
        pack.emit("error", e);
        throw e;
      }
    },
  });
  extract.once("finish", () => {
    pack.end();
  });

  return {
    readable: toReadableStream(pack),
    writable: toWriteableStream(extract),
  };
}

export async function* iterEntries(source: ReadableStream) {
  const extract = new Parser();
  const readEntry = () => {
    return new Promise<ReadEntry>((resolve, reject) => {
      extract.once("entry", resolve);
    });
  };
  try {
    const pEnd = new Promise<void>((resolve, reject) => {
      extract.once("finish", () => resolve());
      extract.once("abort", () => resolve());
      extract.once("error", reject);
    });
    let pEntry = readEntry();
    source.pipeTo(toWriteableStream(extract));
    while (true) {
      const next = await Promise.race([pEnd, pEntry]);
      if (!next) {
        break;
      }
      pEntry = readEntry();
      yield [next, DataStream(next)] as const;
      if (!next.emittedEnd) {
        next.on("data", () => {});
      }
    }
  } finally {
    extract.removeAllListeners();
    try {
      extract.abort({ name: "ITER_RETURN", message: "Aborted by iterEntries" });
    } catch {}
  }
}
