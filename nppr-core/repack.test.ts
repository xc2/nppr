import { test } from "tests/vitest";
import { describe, expect } from "vitest";
import {
  BasicTarballManifest,
  BasicTarballPath,
  BasicTarballSHA512,
} from "../tests/__fixtures__/tarball";
import { digestStream } from "./internals/crypto";
import { getManifest } from "./internals/package";
import { repack } from "./repack";

describe("options", () => {
  test("allow single input", async () => {
    const output = repack({ source: BasicTarballPath });
    await expect(digestStream(output)).resolves.toStrictEqual(BasicTarballSHA512);
  });
  test("allow multiple input", async () => {
    const output = repack([{ source: BasicTarballPath }, { source: BasicTarballPath }]);
    await expect(digestStream(output[0])).resolves.toStrictEqual(BasicTarballSHA512);
    await expect(digestStream(output[1])).resolves.toStrictEqual(BasicTarballSHA512);
  });
  test("tarball should keep as is if manifest is not changed", async () => {
    const output = repack({
      source: BasicTarballPath,
      name: BasicTarballManifest.name,
      version: BasicTarballManifest.version,
    });
    await expect(digestStream(output)).resolves.toStrictEqual(BasicTarballSHA512);
  });
  test("package-scope options should override global options", async () => {
    const output = repack(
      {
        source: BasicTarballPath,
        manifest: (fin) => fin,
      },
      {
        manifest: { name: "foo", version: "1.0.0" },
      }
    );
    await expect(digestStream(output)).resolves.toStrictEqual(BasicTarballSHA512);
  });
});
describe("transform", () => {
  test("should transform manifest", async () => {
    const output = repack({
      source: BasicTarballPath,
      name: "foo",
      version: "1.0.0",
    });
    const [output1, output2] = output.tee();
    // @ts-ignore
    await expect(digestStream(output1)).resolves.not.toStrictEqual(BasicTarballSHA512);
    await expect(getManifest(output2)).resolves.toMatchObject({ name: "foo", version: "1.0.0" });
  });
});
