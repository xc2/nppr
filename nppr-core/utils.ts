import { createReadStream } from "node:fs";
import npa from "npm-package-arg";
import coerceVersion from "semver/functions/coerce";
import { tryToNumber } from "./internals/lang";
import { template as _template } from "./internals/lang/template";
import type { Manifest } from "./internals/package";
import { bufferToReadable, toReadableStream } from "./internals/stream";

export type InputSource =
  | string
  | number
  | Blob
  | File
  | ReadableStream
  | NodeJS.ReadableStream
  | ArrayBufferLike
  | ArrayBufferView;

export function inputSource(source: InputSource): ReadableStream {
  if (typeof source === "string") {
    source = tryToNumber(source);
    if (typeof source === "string") {
      // file path
      return toReadableStream(createReadStream(source));
    }
  }
  if (typeof source === "number") {
    const builtins: Record<string, NodeJS.ReadableStream> = {
      [process.stdin.fd]: process.stdin,
    };
    // file descriptor
    return toReadableStream(builtins[source] ?? createReadStream("", { fd: source }));
  }
  if ("pipe" in source) {
    // nodejs stream
    return toReadableStream(source);
  }
  if ("arrayBuffer" in source) {
    if (typeof source.stream === "undefined") {
      throw new Error("source might be a Blob or File, but it does not have a stream method");
    }
    return source.stream();
  }
  if ("getReader" in source) {
    // ReadableStream
    return source;
  }

  // ArrayBufferView | ArrayBufferLike
  return bufferToReadable(source);
}

export const inlineTemplate = _template.bind(null, /\[([^\]]+)]/g);
export const template = _template.bind(null, /\{\{([^}]+)}}/g);

export function toPurl(manifest: Pick<Manifest, "name" | "version">) {
  const spec = npa.resolve(manifest.name, manifest.version);
  // @ts-ignore
  return npa.toPurl(spec) as string;
}

export function getPackageTokens(manifest: Manifest) {
  const { name, version } = manifest;
  return {
    ...manifest,
    names: extractName(name),
    versions: extractVersion(version),
  };
}

export function extractName(name: string) {
  if (name.startsWith("@")) {
    const [scope, unscoped] = name.slice(1).split("/");
    return {
      scope,
      unscoped,
      forPath: `${scope}-${unscoped}`,
      forUnscoped: `${scope}__${unscoped}`,
    };
  }
  return { scope: "", unscoped: name, "for-path": name, "for-unscoped": name };
}
export function extractVersion(version: string) {
  const v = coerceVersion(version, { includePrerelease: true, loose: true });
  if (!v) {
    return {};
  }
  return {
    major: v.major,
    minor: v.minor,
    patch: v.patch,
    version: `${v.major}.${v.minor}.${v.patch}`,
    prerelease: v.prerelease.join("."),
    prereleases: v.prerelease,
    build: v.build.join("."),
    builds: v.build,
  };
}

export function getPublishManifestFields() {
  return [
    "name",
    "version",
    "bin",
    "description",
    "keywords",
    "homepage",
    "bugs",
    "license",
    "author",
    "contributors",
    "funding",
    "engines",
    "repository",
    "dependencies",
    "peerDependencies",
    "peerDependenciesMeta",
    "optionalDependencies",
    "os",
    "cpu",
    // yarnpkg-specific fields below
    "libc",
    "languageName",
    "dependenciesMeta",
    "preferUnplugged",
  ];
}

export const NPPR_USER_AGENT = "nppr-core/v1 (+https://github.com/xc2/nppr)";
