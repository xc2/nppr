import { expect, test } from "vitest";
import { get } from "./get";

test("get nested", () => {
  expect(get({ a: { b: { c: 1 } } }, "a.b.c")).toBe(1);
});

test('get nested with "."', () => {
  expect(get({ a: { "b.c": 1, b: { c: 2 } } }, "a.b.c")).toBe(1);
});
