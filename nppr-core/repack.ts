import compare from "just-compare";
import { PackagePackOptions } from "./internals/constants";
import { type Manifest, mutateDependencies, mutateFields } from "./internals/package";
import { createReadable } from "./internals/stream";
import { type TarTransformer, transformTarball } from "./internals/tar";

export interface RepackPackage extends RepackOptions {
  source: string | Buffer | Uint8Array | ArrayBufferLike | ReadableStream;
}

export function repack(packages: RepackPackage, config?: RepackOptions): ReadableStream;
export function repack(packages: RepackPackage[], config?: RepackOptions): ReadableStream[];
export function repack(
  packages: RepackPackage | RepackPackage[],
  config: RepackOptions = {}
): ReadableStream | ReadableStream[] {
  const ps = Array.isArray(packages) ? packages : [packages];
  const rs = ps.map((pkg) => {
    const options = { ...config, ...pkg, remap: { ...config.remapDeps, ...pkg.remapDeps } };
    const p = createRepack(options);
    createReadable(pkg.source).pipeThrough(p);

    return p.readable;
  });
  return Array.isArray(packages) ? rs : rs[0];
}
export interface ManifestTransformer {
  (pkg: Manifest): Manifest | undefined;
}

export interface RepackOptions {
  name?: string;
  version?: string;
  remapDeps?: Record<string, string>;
  manifest?: Manifest | ManifestTransformer;
  transform?: TarTransformer;
}

export function createRepack(options: RepackOptions = {}) {
  return transformTarball(async (entry, reader) => {
    if (entry.path === "package/package.json") {
      const text = await reader.text();
      let manifest = JSON.parse(text) as Manifest;
      if (options.manifest) {
        if (typeof options.manifest === "function") {
          const r = options.manifest(manifest);
          if (r) manifest = r;
        } else {
          manifest = options.manifest;
        }
      }
      mutateFields(manifest, {
        name: options.name,
        version: options.version,
      });
      mutateDependencies(manifest, options.remapDeps);
      const unchanged = compare(JSON.parse(text), manifest);
      return new Blob([unchanged ? text : JSON.stringify(manifest, null, 2)], {
        type: "application/json",
      });
    }
    return options.transform?.(entry, reader);
  }, PackagePackOptions);
}
