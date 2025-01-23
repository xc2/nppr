import compare from "just-compare";
import type { MaybePromise } from "nppr-core/internals/lang";
import type { ReadEntry } from "tar";
import { PackageJsonPath, PackagePackOptions } from "./internals/constants";
import { type Manifest, getManifest, mutateDependencies, mutateFields } from "./internals/package";
import { type StreamReader, duplicate } from "./internals/stream";
import { type TarTransformer, transformTarball } from "./internals/tar";
import { type InputSource, getPackageTokens, inlineTemplate, inputSource, template } from "./utils";

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

export interface RepackTransformer {
  (
    manifest: Manifest,
    reader: StreamReader,
    entry?: ReadEntry
  ): MaybePromise<ReadableStream | Blob | undefined | false>;
}

export interface RepackOptions {
  name?: string;
  version?: string;
  remapDeps?: Record<string, string>;
  packageJson?: Manifest | PackageJsonTransformer;
  transform?: Record<
    string,
    MaybePromise<string> | RepackTransformer | ReturnType<RepackTransformer>
  >;
}

function toTarTransformer(
  t: MaybePromise<string> | RepackTransformer | ReturnType<RepackTransformer>,
  manifest: MaybePromise<Manifest>
): TarTransformer | ReturnType<TarTransformer> {
  if (typeof t === "function") {
    return async (reader, entry) => t(await manifest, reader, entry);
  }
  if (t === false || t === undefined || t === null) return t;
  return async () => {
    const r = await t;
    if (typeof r === "string") {
      return new Blob([template(r, { replaceUnknown: true })(await manifest)]);
    }
    return r;
  };
}

export function createRepack(options: RepackOptions = {}) {
  const es = new TransformStream();
  const [readable, manifest] = duplicate(es.readable, async (r) => {
    let manifest = await getManifest(r);
    if (options.packageJson) {
      if (typeof options.packageJson === "function") {
        const r = options.packageJson(manifest);
        if (r) manifest = r;
      } else {
        manifest = options.packageJson;
      }
    }
    const tplVars = getPackageTokens(manifest);
    mutateFields(manifest, {
      name: options.name && inlineTemplate(options.name)(tplVars),
      version: options.version && inlineTemplate(options.version)(tplVars),
    });
    mutateDependencies(manifest, options.remapDeps);
    return manifest;
  });
  const transform = Object.fromEntries(
    Object.entries({ ...options.transform }).map(([k, v]) => [
      `package/${k}`,
      toTarTransformer(v, manifest),
    ])
  );
  const pkgTrans = transformTarball(
    {
      ...transform,
      [PackageJsonPath]: async (reader) => {
        const text = await reader.text();
        const unchanged = compare(JSON.parse(text), await manifest);

        return new Blob([unchanged ? text : JSON.stringify(await manifest, null, 2)]);
      },
    },
    PackagePackOptions
  );
  return {
    writable: es.writable,
    readable: readable.pipeThrough(pkgTrans),
  };
}
