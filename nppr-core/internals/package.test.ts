import { test } from "tests/vitest";
import { describe, expect } from "vitest";
import { mutateDependencies, mutateFields } from "./package";

test("mutate fields", () => {
  expect(
    mutateFields(
      { name: "a", version: "1.0.0", description: "foo" },
      { name: "b", version: undefined, description: null }
    )
  ).toEqual({
    name: "b",
    version: "1.0.0",
  });
});

describe("mutate dependencies", () => {
  const m = {
    name: "foo",
    version: "0.0.0",
    dependencies: { a: "1.0.0" },
    optionalDependencies: { b: "1.0.0" },
    peerDependencies: { c: "1" },
    devDependencies: { c: "1.1.1" },
  };
  test("mutate dependencies and optionalDependencies by default", () => {
    expect(
      mutateDependencies(m, {
        a: "2.0.0",
        b: "3.0.0",
        c: "4.0.0",
      })
    ).toEqual({
      ...m,
      dependencies: { a: "2.0.0" },
      optionalDependencies: { b: "3.0.0" },
    });
  });
  test("allow specific dependency list field names", () => {
    expect(
      mutateDependencies(
        m,
        {
          a: "2.0.0",
          b: "3.0.0",
          c: "4.0.0",
        },
        ["dependencies", "optionalDependencies", "peerDependencies", "devDependencies"]
      )
    ).toEqual({
      ...m,
      dependencies: { a: "2.0.0" },
      optionalDependencies: { b: "3.0.0" },
      peerDependencies: { c: "4.0.0" },
      devDependencies: { c: "4.0.0" },
    });
  });
});
