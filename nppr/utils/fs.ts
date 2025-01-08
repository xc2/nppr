import { createReadStream, createWriteStream } from "node:fs";
import { tryToNumber } from "./lang";

export function outputStream(filepath: string | number) {
  filepath = tryToNumber(filepath);

  if (typeof filepath === "string") {
    // file path
    return createWriteStream(filepath);
  }
  if (typeof filepath === "number") {
    const builtins: Record<string, NodeJS.WritableStream> = {
      [process.stdout.fd]: process.stdout,
      [process.stderr.fd]: process.stderr,
    };
    // file descriptor
    return builtins[filepath] ?? createReadStream("", { fd: filepath });
  }
  throw new Error(`Invalid output filepath: ${filepath}`);
}
