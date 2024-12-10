import type { ChildProcess } from "node:child_process";
import { readableToBuffer, toReadableStream } from "./stream";

export class NonZeroExitError extends Error {
  constructor(
    public code: number,
    message?: string
  ) {
    super(message ?? `Process exited with code ${code}`);
  }
}
export function awaitChildProcess<
  T extends ChildProcess,
  E extends NodeJS.BufferEncoding | null = "utf8",
>(
  cp: T,
  encoding?: E
): Promise<
  T extends { stdout: NodeJS.ReadableStream } ? (E extends null ? Buffer : string) : null
> {
  const _encoding = encoding === undefined ? "utf8" : encoding;
  return new Promise((resolve, reject) => {
    const p = cp.stdout
      ? readableToBuffer(toReadableStream(cp.stdout)).then((b) =>
          _encoding ? b.toString(_encoding) : b
        )
      : cp.stdout;
    cp.once("error", reject);
    cp.once("exit", (code) => {
      if (!code) {
        resolve(p as any);
      } else {
        reject(new NonZeroExitError(code));
      }
    });
  });
}
