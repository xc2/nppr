import { BasicTarballPath } from "tests/__fixtures__/tarball";
import { test } from "tests/vitest";
import { describe, expect } from "vitest";
import { createReadable } from "./stream";
import { iterEntries } from "./tar";

describe("iterEntries", () => {
  test("readEntries with filter should return early", async () => {
    let manifest: any = {};
    for await (const [entry, s] of iterEntries(createReadable(BasicTarballPath))) {
      if (entry.path === "package/package.json") {
        manifest = await s.json();
        break;
      }
    }
    expect(manifest).toMatchObject({ name: "barhop" });
  });
});
