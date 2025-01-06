import { createHash } from "node:crypto";
import { Readable } from "node:stream";
import { finished } from "node:stream/promises";
import { sliceView } from "../encoding";

export async function digestStream(source: ReadableStream, algorithm: string = "sha512") {
  const hash = createHash(algorithm);
  const rs = Readable.fromWeb(source as any).pipe(hash);
  const p = finished(rs);
  rs.resume();
  await p;
  return sliceView(hash.digest());
}
