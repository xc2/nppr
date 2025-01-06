import {
  BasicTarballEntryCount,
  BasicTarballManifest,
  BasicTarballPath,
  BasicTarballSHA512,
} from "tests/__fixtures__/tarball";
import { test } from "tests/vitest";
import { describe, expect, vi } from "vitest";
import { PackagePackOptions } from "./constants";
import { digestStream } from "./crypto";
import { findMapAsync } from "./lang";
import type { Manifest } from "./package";
import { createReadable } from "./stream";
import { iterEntries, transformTarball } from "./tar";

describe("iterEntries", () => {
  test("iterator should return early on loop break", async () => {
    const fn = vi.fn();
    const iter = iterEntries(createReadable(BasicTarballPath), {
      onReadEntry: fn,
    });
    let iterCount = 0;

    for await (const [entry, s] of iter) {
      iterCount++;
      if (entry.path === "package/package.json") {
        break;
      }
    }
    expect(iterCount).toBeLessThan(BasicTarballEntryCount);
    expect(fn).toHaveBeenCalledTimes(iterCount + 1);
    expect(fn).toHaveBeenNthCalledWith(
      iterCount,
      expect.objectContaining({ path: "package/package.json" })
    );
  });

  test("can read data on loop", async () => {
    const manifest = (async () => {
      for await (const [entry, reader] of iterEntries(createReadable(BasicTarballPath))) {
        if (entry.path === "package/package.json") {
          return reader.json();
        }
      }
    })();

    await expect(manifest).resolves.toMatchObject(BasicTarballManifest);
  });
});

describe("transformTarball", () => {
  test("tarball should keep as is if no transform is provided", async () => {
    const source1 = createReadable(BasicTarballPath);
    const output = source1.pipeThrough(transformTarball(undefined, PackagePackOptions));
    await expect(digestStream(output)).resolves.toStrictEqual(BasicTarballSHA512);
  });
  test("tarball should keep as is if all entry is not changed", async () => {
    const source1 = createReadable(BasicTarballPath);
    const output = source1.pipeThrough(
      transformTarball(async (entry, reader) => {
        if (entry.path === "package/package.json") {
          return new Blob([await reader.text()]);
        }
      }, PackagePackOptions)
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
    const [source1, source2] = createReadable(BasicTarballPath).tee();
    const output = source1.pipeThrough(
      transformTarball(async (entry, reader) => {
        if (entry.path === "package/package.json") {
          await new Promise((resolve) => setTimeout(resolve, 50));
          return new Blob([await reader.text()]);
        }
      }, PackagePackOptions)
    );

    await expect(getOrder(output)).resolves.toStrictEqual(await getOrder(source2));
  });

  test("transforming should work", async () => {
    const source1 = createReadable(BasicTarballPath);
    const output = source1.pipeThrough(
      transformTarball(async (entry, reader) => {
        if (entry.path === "package/package.json") {
          return new Blob([JSON.stringify({ ...(await reader.json()), name: "test" })]);
        }
      }, PackagePackOptions)
    );
    const [output1, output2] = output.tee();
    // @ts-ignore
    await expect(digestStream(output1)).resolves.not.toStrictEqual(BasicTarballSHA512);
    const manifest = findMapAsync(iterEntries(output2), async ([entry, reader]) => {
      if (entry.path === "package/package.json") {
        return reader.json<Manifest>();
      }
    });
    await expect(manifest).resolves.toMatchObject({ name: "test" });
  });
});
