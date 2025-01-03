import { type Manifest, createDepsTransformer, createFieldsTransformer } from "./internals/npm";
import { type PkgTransformer, createPackageTransform } from "./internals/pkg-stream";
import { createReadable, unstreamText } from "./internals/stream";

export interface RepackPackage extends RepackOptions {
  source: string | Buffer | Uint8Array | ArrayBufferLike | ReadableStream;
}

export interface RepackConfig extends Pick<RepackOptions, "remap" | "transform" | "manifest"> {
  packages: RepackPackage[];
}
export function repack(config: RepackConfig) {
  return config.packages.map((pkg) => {
    const options = { ...config, ...pkg, remap: { ...config.remap, ...pkg.remap } };
    const p = createRepack(options);
    createReadable(pkg.source).pipeThrough(p);
    const { writable, ...r } = p;

    return r;
  });
}
export interface RepackContext {
  manifest: Manifest;
}
export interface ManifestTransformer {
  (pkg: Manifest): Manifest | false;
}

export interface RepackOptions {
  name?: string;
  version?: string;
  remap?: Record<string, string>;
  manifest?: Manifest | ManifestTransformer;
  transform?: PkgTransformer;
}

export function createRepack(options: RepackOptions = {}) {
  const manifestTransformers: ((pkg: Manifest) => Manifest | false)[] = [];
  if (typeof options.manifest === "function") {
    manifestTransformers.push(options.manifest);
  } else if (options.manifest) {
    manifestTransformers.push(() => options.manifest as Manifest);
  }
  manifestTransformers.push(
    createFieldsTransformer({ name: options.name, version: options.version })
  );
  if (options.remap) manifestTransformers.push(createDepsTransformer(options.remap));

  return createPackageTransform<RepackContext>((entry, context) => {
    if (entry.path === "package/package.json") {
      return unstreamText((s) => {
        context.manifest = JSON.parse(s) as Manifest;
        let changed = false;
        for (const transformer of manifestTransformers) {
          const fin = transformer(context.manifest);
          if (fin) {
            context.manifest = fin;
            changed = true;
          }
        }
        return changed ? JSON.stringify(context.manifest) : s;
      });
    }
    return options?.transform?.(entry, context);
  });
}
