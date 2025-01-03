import { createHash } from "node:crypto";
import { Readable } from "node:stream";
// @ts-ignore
import npmProvenance from "libnpmpublish/lib/provenance";
import npa from "npm-package-arg";
import type { Manifest } from "./internals/npm";
import { readableToBuffer } from "./internals/stream";

export async function digest(source: ReadableStream) {
  const hash = createHash("sha512");
  Readable.fromWeb(source as any).pipe(hash);
  const foo = await readableToBuffer(Readable.toWeb(hash) as ReadableStream);
  return foo.toString("hex");
}

export async function attest(manifest: Pick<Manifest, "name" | "version">, source: ReadableStream) {
  const spec = npa.resolve(manifest.name, manifest.version);
  const subject = {
    name: npa.toPurl(spec),
    digest: { sha512: await digest(source) },
  };
  return npmProvenance.generateProvenance([subject], {});
}

// export async function _generateProvenance(source: ReadableStream) {
//   const p = createPackageTransform<{ manifest: Manifest }>((entry, context) => {
//     if (entry.path === "package/package.json") {
//       return unstreamText((s) => {
//         context.manifest = JSON.parse(s) as Manifest;
//         return s;
//       });
//     }
//   });
//
//   await source.pipeThrough(p).pipeTo(nullWritable());
//   return await p.context;
// }
