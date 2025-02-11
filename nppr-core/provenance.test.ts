import { BasicTarballPath, BasicTarballSubject } from "tests/__fixtures__/tarball";
import { mockImplementation, test } from "tests/vitest";
import { afterAll, describe, expect, vi } from "vitest";
import { attest, generateSubject, generateSubjects } from "./provenance";
import { generateProvenance } from "./third_party/libnpmpublish";
import { inputSource } from "./utils";

vi.mock("./third_party/libnpmpublish", { spy: true });

afterAll(() => {
  vi.doUnmock("./third_party/libnpmpublish");
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
      {},
    ]);
  });
  test("attest with options", async ({ signal }) => {
    mockImplementation(generateProvenance, async (...args: any[]) => args, signal);
    await expect(
      attest([inputSource(BasicTarballPath)], { tlogUpload: true, identityToken: "a" })
    ).resolves.toStrictEqual([[BasicTarballSubject], { tlogUpload: true, identityToken: "a" }]);
  });
});
