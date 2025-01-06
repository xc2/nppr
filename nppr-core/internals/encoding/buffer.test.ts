import { test } from "tests/vitest";
import { describe, expect } from "vitest";
import { concatBuffer, sliceView, toHex, toUint8Array } from "./buffer";

describe("buffer utility functions", () => {
  describe("toUint8Array", () => {
    test("should convert number to Uint8Array", () => {
      expect(toUint8Array(5)).toEqual(new Uint8Array([5]));
    });

    test("should convert string to Uint8Array", () => {
      expect(toUint8Array("test")).toEqual(new TextEncoder().encode("test"));
    });

    test("should convert ArrayBuffer to Uint8Array", () => {
      const buffer = new ArrayBuffer(4);
      const view = new Uint8Array(buffer);
      expect(toUint8Array(buffer)).toEqual(view);
    });

    test("should convert array of numbers to Uint8Array", () => {
      expect(toUint8Array([1, 2, 3])).toEqual(new Uint8Array([1, 2, 3]));
    });
  });

  describe("concatBuffer", () => {
    test("should concatenate multiple Uint8Array into a single ArrayBuffer", () => {
      const buffer1 = new Uint8Array([1, 2]);
      const buffer2 = new Uint8Array([3, 4]);
      const result = concatBuffer([buffer1, buffer2]);
      expect(new Uint8Array(result)).toEqual(new Uint8Array([1, 2, 3, 4]));
    });

    test("should concatenate multiple ArrayBuffer into a single ArrayBuffer", () => {
      const buffer1 = new Uint8Array([1, 2]).buffer;
      const buffer2 = new Uint8Array([3, 4]).buffer;
      const result = concatBuffer([buffer1, buffer2]);
      expect(new Uint8Array(result)).toEqual(new Uint8Array([1, 2, 3, 4]));
    });
  });

  describe("sliceView", () => {
    test("should slice ArrayBufferView correctly", () => {
      const buffer = new Uint8Array([1, 2, 3, 4]);
      const view = new DataView(buffer.buffer, 1, 2);
      const result = sliceView(view);
      expect(new Uint8Array(result)).toEqual(new Uint8Array([2, 3]));
    });
  });

  describe("toHex", () => {
    test("should convert ArrayBuffer to hex string", () => {
      const buffer = new Uint8Array([0, 255, 16, 32]).buffer;
      expect(toHex(buffer)).toBe("00ff1020");
    });
  });
});
