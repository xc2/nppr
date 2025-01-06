import compare from "just-compare";
import { PackagePackOptions } from "./internals/constants";
import { type Manifest, mutateDependencies, mutateFields } from "./internals/package";
import { type TarTransformer, transformTarball } from "./internals/tar";
import { type InputSource, inputSource } from "./utils";

export interface RepackPackage extends RepackOptions {
  source: InputSource;
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
    inputSource(pkg.source).pipeThrough(p);

    return p.readable;
  });
  return Array.isArray(packages) ? rs : rs[0];
}
export interface PackageJsonTransformer {
  (pkg: Manifest): Manifest | undefined;
}

export interface RepackOptions {
  name?: string;
  version?: string;
  remapDeps?: Record<string, string>;
  packageJson?: Manifest | PackageJsonTransformer;
  transform?: TarTransformer;
}

export function createRepack(options: RepackOptions = {}) {
  return transformTarball(async (entry, reader) => {
    if (entry.path === "package/package.json") {
      const text = await reader.text();
      let manifest = JSON.parse(text) as Manifest;
      if (options.packageJson) {
        if (typeof options.packageJson === "function") {
          const r = options.packageJson(manifest);
          if (r) manifest = r;
        } else {
          manifest = options.packageJson;
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
