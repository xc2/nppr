import type { ReadEntry } from "tar";
import { PackagePackOptions } from "./constants";
import { TarTransformStream } from "./tar";

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
