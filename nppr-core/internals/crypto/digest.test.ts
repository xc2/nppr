import { test } from "tests/vitest";
import { describe, expect } from "vitest";
import { sliceView } from "../encoding";
import { digestStream } from "./digest";

const basic = {
  text: new Blob(["hello"]),
  sha512: sliceView(
    Buffer.from(
      "9b71d224bd62f3785d96d46ad3ea3d73319bfbc2890caadae2dff72519673ca72323c3d99ba5c11d7c7acc6e14b8c5da0c4663475c2e5c3adef46f73bcdec043",
      "hex"
    )
  ),
  sha1: sliceView(Buffer.from("aaf4c61ddcc5e8a2dabede0f3b482cd9aea9434d", "hex")),
};

describe("digestStream", () => {
  test("default algorithm: sha512", async () => {
    await expect(digestStream(basic.text.stream())).resolves.toEqual(basic.sha512);
  });
  test("default algorithm: sha1", async () => {
    await expect(digestStream(basic.text.stream(), "sha1")).resolves.toEqual(basic.sha1);
  });
});
