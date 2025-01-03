import { BasicTarballPath } from "__fixtures__/tarball";
import { describe, expect, test } from "vitest";
import { createReadable } from "./internals/stream";
import { generateProvenance } from "./provenance";

describe("Provenance", () => {
  test("todo", async () => {
    await expect(generateProvenance(createReadable(BasicTarballPath))).resolves.toBe({});
  });
});
