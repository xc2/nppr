import { type RepackerOptions, createRepacker } from "./internals/repacker";
import { createReadable } from "./internals/stream";

export interface RepackPackage extends RepackerOptions {
  source: string | Buffer | Uint8Array | ArrayBufferLike | ReadableStream;
}

export interface RepackConfig extends Pick<RepackerOptions, "remap" | "transform" | "manifest"> {
  packages: RepackPackage[];
}
export function repack(config: RepackConfig) {
  return config.packages.map((pkg) => {
    const options = { ...config, ...pkg, remap: { ...config.remap, ...pkg.remap } };
    const p = createRepacker(options);
    createReadable(pkg.source).pipeThrough(p);

    return { readable: p.readable, result: p.result };
  });
}
