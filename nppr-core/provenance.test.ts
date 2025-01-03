import { expect, test } from "vitest";
import { BasicTarballPath } from "../__fixtures__/tarball";
import { createReadable } from "./internals/stream";
import { attest } from "./provenance";

test("provenance", async () => {
  await expect(
    attest({ name: "foo", version: "1.0.0" }, createReadable(BasicTarballPath))
  ).resolves.toBe(1);
});
