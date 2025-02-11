import {
  BasicTarballEntryCount,
  BasicTarballManifest,
  BasicTarballPath,
  BasicTarballSHA512,
} from "tests/__fixtures__/tarball";
import { test } from "tests/vitest";
import { describe, expect, vi } from "vitest";
import { inputSource } from "../utils";
import { PackageJsonPath, PackagePackOptions } from "./constants";
import { digestStream } from "./crypto";
import { findMapAsync } from "./lang";
import { getManifest } from "./package";
import { duplicate } from "./stream";
import { iterEntries, transformTarball } from "./tar";

describe("iterEntries", () => {
  test("iterator should return early on loop break", async () => {
    const fn = vi.fn();
    const iter = iterEntries(inputSource(BasicTarballPath), {
      onReadEntry: fn,
    });
    let iterCount = 0;

    for await (const [entry, s] of iter) {
      iterCount++;
      if (entry.path === PackageJsonPath) {
        break;
      }
    }
    expect(iterCount).toBeLessThan(BasicTarballEntryCount);
    expect(fn).toHaveBeenCalledTimes(iterCount + 1);
    expect(fn).toHaveBeenNthCalledWith(
      iterCount,
      expect.objectContaining({ path: PackageJsonPath })
    );
  });

  test("can read data on loop", async () => {
    const manifest = (async () => {
      for await (const [entry, reader] of iterEntries(inputSource(BasicTarballPath))) {
        if (entry.path === PackageJsonPath) {
          return reader.json();
        }
      }
    })();

    await expect(manifest).resolves.toMatchObject(BasicTarballManifest);
  });
});

describe("transformTarball", () => {
  test("tarball should keep as is if no transform is provided", async () => {
    const source1 = inputSource(BasicTarballPath);
    const output = source1.pipeThrough(transformTarball(undefined, PackagePackOptions));
    await expect(digestStream(output)).resolves.toStrictEqual(BasicTarballSHA512);
  });
  test("tarball should keep as is if all entry is not changed", async () => {
    const source1 = inputSource(BasicTarballPath);
    const output = source1.pipeThrough(
      transformTarball(
        {
          [PackageJsonPath]: async (reader) => {
            return new Blob([await reader.text()]);
          },
        },
        PackagePackOptions
      )
    );
    await expect(digestStream(output)).resolves.toStrictEqual(BasicTarballSHA512);
  });
  test("entry order should be kept", async () => {
    const getOrder = async (source: ReadableStream) => {
      const order: string[] = [];
      for await (const [entry] of iterEntries(source)) {
        order.push(entry.path);
      }
      return order;
    };
    const [source, output] = duplicate(inputSource(BasicTarballPath), (source) =>
      source.pipeThrough(
        transformTarball(
          {
            [PackageJsonPath]: async (reader) => {
              await new Promise((resolve) => setTimeout(resolve, 50));
              return new Blob([await reader.text()]);
            },
          },
          PackagePackOptions
        )
      )
    );

    await expect(getOrder(output)).resolves.toStrictEqual(await getOrder(source));
  });

  test("transforming should work", async () => {
    const source1 = inputSource(BasicTarballPath);
    const output = source1.pipeThrough(
      transformTarball(
        {
          [PackageJsonPath]: async (reader) => {
            return new Blob([JSON.stringify({ ...(await reader.json()), name: "test" })]);
          },
        },
        PackagePackOptions
      )
    );
    const [output1, digest] = duplicate(output, digestStream);
    // @ts-ignore
    await expect(digest).resolves.not.toStrictEqual(BasicTarballSHA512);
    const manifest = getManifest(output1);
    await expect(manifest).resolves.toMatchObject({ name: "test" });
  });

  test("allow adding new entry", async () => {
    const source = inputSource(BasicTarballPath);
    const output = source.pipeThrough(
      transformTarball(
        {
          "new-entry": async () => {
            return new Blob(["new-entry"]);
          },
        },
        PackagePackOptions
      )
    );
    const newEntry = findMapAsync(iterEntries(output), async ([entry, reader]) => {
      if (entry.path === "new-entry") {
        return reader.text();
      }
    });
    await expect(newEntry).resolves.toBe("new-entry");
  });
});
