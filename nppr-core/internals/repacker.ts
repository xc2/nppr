import type { ReadEntry } from "tar";
import { PackagePackOptions } from "./constants";
import type { Manifest } from "./npm";
import { unstreamText } from "./stream";
import { type GetTransformer, TarTransformStream } from "./tar";

export interface RepackResult {
  manifest: Manifest;
}
export interface ManifestTransformer {
  (pkg: Manifest): Manifest | false;
}

export interface RepackerOptions {
  name?: string;
  version?: string;
  remap?: Record<string, string>;
  manifest?: Manifest | ManifestTransformer;
  transform?: GetTransformer;
}

export function createPackagePassThrough(
  onEntry: (entry: ReadEntry) => ReadableWritablePair | undefined | null
) {
  return TarTransformStream(
    (entry) => {
      const res = onEntry(entry);
      if (!res) return;

      return {
        readable: res.readable,
        writable: res.writable,
        size: entry.size,
      };
    },
    {
      pack: PackagePackOptions,
      keepOrder: true,
    }
  );
}

export function createRepacker(
  options: RepackerOptions = {}
): ReadableWritablePair & { result: Promise<RepackResult> } {
  const manifestTransformers: ((pkg: Manifest) => Manifest | false)[] = [];
  if (typeof options.manifest === "function") {
    manifestTransformers.push(options.manifest);
  } else if (options.manifest) {
    manifestTransformers.push(() => options.manifest as Manifest);
  }
  if (options.name) manifestTransformers.push(createFieldTransformer("name", options.name));
  if (options.version)
    manifestTransformers.push(createFieldTransformer("version", options.version));
  if (options.remap) manifestTransformers.push(createDepsTransformer(options.remap));

  let manifest: Manifest | null = null;

  const trans = TarTransformStream(
    (entry) => {
      if (entry.path === "package/package.json") {
        const r = unstreamText((s) => {
          manifest = JSON.parse(s) as Manifest;
          let changed = false;
          for (const transformer of manifestTransformers) {
            const fin = transformer(manifest);
            if (fin) {
              manifest = fin;
              changed = true;
            }
          }
          return changed ? JSON.stringify(manifest) : s;
        });

        return {
          readable: r.readable,
          writable: r.writable,
          size: options?.manifest ? undefined : entry.size,
        };
      }
      return options?.transform?.(entry);
    },
    { pack: PackagePackOptions, keepOrder: true }
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

function createFieldTransformer<F extends keyof Manifest>(field: F, value: Manifest[F]) {
  return (pkg: Manifest) => {
    if (pkg[field] === value) return false;
    pkg[field] = value;
    return pkg;
  };
}

function createDepsTransformer(deps: Record<string, string>) {
  return (pkg: Manifest) => {
    let changed = false;
    for (const field of ["dependencies", "optionalDependencies"] as const) {
      if (!pkg[field]) continue;
      for (const [name, version] of Object.entries(pkg[field])) {
        const remap = deps[name];
        if (remap && remap !== version) {
          pkg[field][name] = remap;
          changed = true;
        }
      }
    }
    return changed ? pkg : false;
  };
}
