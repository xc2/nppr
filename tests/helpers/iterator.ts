import { type InputSource, inputSource } from "nppr-core";
import { iterEntries } from "nppr-core/internals/tar";

export async function entryText(source: InputSource, path: string): Promise<string | undefined> {
  for await (const [entry, reader] of iterEntries(inputSource(source))) {
    if (entry.path === `package/${path}`) {
      return await reader.text();
    }
  }
  return undefined;
}
