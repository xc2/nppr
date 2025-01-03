import type { Manifest } from "./internals/npm";
import { createPackagePassThrough } from "./internals/repacker";
import { readableToBuffer, unstreamText } from "./internals/stream";

export async function generateProvenance(source: ReadableStream) {
  let manifest: Manifest | null = null;
  const p = createPackagePassThrough((entry) => {
    if (entry.path === "package/package.json") {
      return unstreamText((s) => {
        manifest = JSON.parse(s) as Manifest;
        console.log(manifest);
        return s;
      });
    }
  });
  await readableToBuffer(source.pipeThrough(p));
  console.log(123);
  return manifest;
}
