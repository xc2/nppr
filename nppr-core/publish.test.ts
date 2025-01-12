import { publish as _publish } from "libnpmpublish";
import { mockImplementation, test } from "tests/vitest";
import { afterAll, describe, expect, vi } from "vitest";
import { BasicTarballPath } from "../tests/__fixtures__/tarball";
import type { Manifest } from "./internals/package";
import { getPublishConfig, getPublishManifest, publish } from "./publish";
import { NPPR_USER_AGENT } from "./utils";

vi.mock("libnpmpublish", { spy: true });

afterAll(() => {
  vi.doUnmock("libnpmpublish");
});
describe("publish", () => {
  test("should publish a package", async ({ signal }) => {
    mockImplementation(_publish as any, (...args: any[]) => args, signal);

    const r = await publish(BasicTarballPath, {
      token: "foo",
      tag: "bar",
    });
    expect(r).toHaveLength(3);
    // @ts-ignore
    const [manifest, tarball, config] = r;
    expect(manifest).toMatchSnapshot();
    expect(tarball).toBeInstanceOf(Buffer);
    expect(tarball).toHaveLength(15792);
    expect(config).toMatchObject({ forceAuth: { token: "foo" }, defaultTag: "bar" });
  });
});

describe("getPublishManifest", () => {
  const defaultAllows = { name: "foo", version: "1.0.0" } as Manifest;
  const manifest = { ...defaultAllows, foo: "bar", hello: "world" } as Manifest;
  test("should keep all fields when `keepFields` is true", () => {
    expect(getPublishManifest(manifest, { keepFields: true })).toEqual(manifest);
  });
  test("should remove unwanted fields", () => {
    expect(getPublishManifest(manifest)).toEqual(defaultAllows);
  });
  test("should allow keep specific fields", () => {
    expect(getPublishManifest(manifest, { keepFields: ["foo"] })).toEqual({
      ...defaultAllows,
      foo: "bar",
    });
  });
  test("should allow additional fields as object", () => {
    const add = { a: 1 };
    expect(getPublishManifest(manifest, { additionalFields: add })).toEqual({
      ...defaultAllows,
      ...add,
    });
  });
  test("should allow additional fields as function", () => {
    expect(
      getPublishManifest(manifest, {
        additionalFields: (raw) => {
          return { a: raw.name };
        },
      })
    ).toEqual({
      ...defaultAllows,
      a: defaultAllows.name,
    });
  });
});

describe("getPublishConfig", () => {
  const manifest = { name: "foo", version: "1.0.0" } as Manifest;
  test("should have npmVersion set", () => {
    expect(getPublishConfig(manifest)).toMatchObject({
      npmVersion: NPPR_USER_AGENT,
    });
  });
});
