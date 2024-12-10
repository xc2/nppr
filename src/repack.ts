import type { ReadableWritablePair } from "node:stream/web";
import { TransformStream } from "node:stream/web";
import type { Manifest } from "./npm";
import { createReadable, readableToBuffer, unstreamText } from "./stream";
import { type GetTransformer, TarTransformStream } from "./tar";

export interface RepackResult {
  manifest: Manifest;
}

export interface ModifyTarballOptions {
  manifest?: Manifest | ((pkg: Manifest) => false | Manifest);
  transform?: GetTransformer;
}

export function createRepack(
  options?: ModifyTarballOptions
): ReadableWritablePair & { result: Promise<RepackResult> } {
  let manifest: Manifest | null = null;
  const trans = TarTransformStream(
    (entry) => {
      if (entry.path === "package/package.json") {
        const r = unstreamText((s) => {
          manifest = JSON.parse(s) as Manifest;
          if (typeof options?.manifest === "function") {
            const fin = options.manifest(manifest);
            if (fin) {
              manifest = fin;
              return JSON.stringify(fin, null, 2);
            }
          } else if (options?.manifest) {
            manifest = options.manifest;
            return JSON.stringify(options.manifest, null, 2);
          }
          return s;
        });

        return {
          readable: r.readable,
          writable: r.writable,
          size: options?.manifest ? undefined : entry.size,
        };
      }
      return options?.transform?.(entry);
    },
    { pack: { gzip: { level: 9 }, portable: true }, keepOrder: true }
  );
  const es = new TransformStream();
  const result = trans.readable.pipeTo(es.writable).then(() => {
    return { manifest: manifest as Manifest };
  });
  return {
    writable: trans.writable,
    readable: es.readable,
    result,
  };
}

export async function repack(
  tarball: string | Buffer,
  opts: ModifyTarballOptions = {}
): Promise<{ tarball: Buffer } & RepackResult> {
  const p = createRepack(opts);
  createReadable(tarball).pipeThrough(p);
  const data = readableToBuffer(p.readable);
  const result = p.result;
  return { tarball: await data, ...(await result) };
}
