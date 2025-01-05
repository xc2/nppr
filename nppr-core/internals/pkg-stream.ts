import type { ReadEntry } from "tar";
import type { PayloadSource } from "../provenance";
import { PackagePackOptions } from "./constants";
import type { Manifest } from "./npm";
import { unstreamText } from "./stream";
import { TarTransformStream, readEntries } from "./tar";

export interface PkgTransformer<Context = unknown> {
  (entry: ReadEntry, context: Partial<Context>): ReadableWritablePair | undefined | null;
}

export function createPackageTransform<Context = unknown>(
  transform?: PkgTransformer<Context>
): ReadableWritablePair & { context: Promise<Context> } {
  const context = {} as Partial<Context>;
  const trans = TarTransformStream(
    (entry) => {
      const res = transform?.(entry, context);
      if (!res) return;

      return {
        readable: res.readable,
        writable: res.writable,
        size: undefined,
      };
    },
    {
      pack: PackagePackOptions,
      keepOrder: true,
    }
  );
  const es = new TransformStream();
  const result = trans.readable.pipeTo(es.writable).then(() => {
    return context as Context;
  });
  return {
    writable: trans.writable,
    readable: es.readable,
    context: result,
  };
}
export function duplicatePackageStream(source: PayloadSource) {
  const p = createPackageTransform<{ manifest: Manifest }>((entry, context) => {
    if (entry.path === "package/package.json") {
      return unstreamText((s) => {
        context.manifest = JSON.parse(s) as Manifest;
        return s;
      });
    }
  });
  return {
    readable: source.pipeThrough(p),
    manifest: p.context.then((r) => r.manifest),
  };
}

export async function readPackageManifest(source: PayloadSource) {
  const entries = await readEntries(source, { filter: ["package/package.json"] });
}
