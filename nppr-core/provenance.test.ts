// biome-ignore lint/correctness/noUnusedImports: a
// @ts-ignore
import { generateProvenance } from "libnpmpublish/lib/provenance";
import { BasicTarballPath, BasicTarballSubject } from "tests/__fixtures__/tarball";
import { mockImplementation, test } from "tests/vitest";
import { afterAll, describe, expect, vi } from "vitest";
import { attest, generateSubject, generateSubjects } from "./provenance";
import { inputSource } from "./utils";

vi.mock("libnpmpublish/lib/provenance", { spy: true });

afterAll(() => {
  vi.doUnmock("libnpmpublish/lib/provenance");
});

describe("Provenance Subject", () => {
  test("generateSubject", async () => {
    await expect(generateSubject(inputSource(BasicTarballPath))).resolves.toStrictEqual(
      BasicTarballSubject
    );
  });
  test("generateSubject with preload manifest", async () => {
    await expect(
      generateSubject(inputSource(BasicTarballPath), { name: "foobar", version: "1.1.1" })
    ).resolves.toStrictEqual({
      ...BasicTarballSubject,
      name: "pkg:npm/foobar@1.1.1",
    });
  });
  test("generateSubjects", async () => {
    await expect(
      generateSubjects([
        inputSource(BasicTarballPath),
        {
          source: inputSource(BasicTarballPath),
          manifest: { name: "foobar", version: "1.1.1" },
        },
      ])
    ).resolves.toStrictEqual([
      BasicTarballSubject,
      { ...BasicTarballSubject, name: "pkg:npm/foobar@1.1.1" },
    ]);
  });
});

describe("Provenance Attest", () => {
  test("attest with default options", async ({ signal }) => {
    mockImplementation(generateProvenance, async (...args: any[]) => args, signal);

    await expect(attest([inputSource(BasicTarballPath)])).resolves.toStrictEqual([
      [BasicTarballSubject],
      { tlogUpload: false },
    ]);
  });
  test("attest with options", async ({ signal }) => {
    mockImplementation(generateProvenance, async (...args: any[]) => args, signal);
    await expect(
      attest([inputSource(BasicTarballPath)], { tlogUpload: true, identityToken: "a" })
    ).resolves.toStrictEqual([[BasicTarballSubject], { tlogUpload: true, identityToken: "a" }]);
  });
});
