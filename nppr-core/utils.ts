import { createReadStream } from "node:fs";
import npa from "npm-package-arg";
import { tryToNumber } from "./internals/lang";
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

export function renderTpl(
  tpl: string,
  variables: Record<string, any>,
  options?: { replaceUnknown?: boolean; escape?: (value: any, key: string) => string }
) {
  const { replaceUnknown = false, escape: _escape } = options ?? {};
  return tpl.replace(/\[([^\]]+)]/g, (match, key: string) => {
    if (!(key in variables)) {
      return replaceUnknown ? "" : match;
    }
    const v = variables[key] ?? "";
    return _escape ? _escape(v, key) : v;
  });
}

export function toPurl(manifest: Pick<Manifest, "name" | "version">) {
  const spec = npa.resolve(manifest.name, manifest.version);
  // @ts-ignore
  return npa.toPurl(spec) as string;
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

export const NPPR_USER_AGENT = "nppr/v1 (+https://github.com/xc2/nppr)";
