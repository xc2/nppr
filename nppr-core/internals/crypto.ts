import { createHash } from "node:crypto";
import { Readable } from "node:stream";
import { readableToBuffer } from "./stream";

export async function digestStream(source: ReadableStream, algorithm: string = "sha512") {
  const hash = createHash(algorithm);
  Readable.fromWeb(source as any).pipe(hash);
  return Buffer.from(await readableToBuffer(Readable.toWeb(hash) as ReadableStream));
}
