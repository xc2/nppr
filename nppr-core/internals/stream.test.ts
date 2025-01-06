import { PassThrough, Readable } from "node:stream";
import { test } from "tests/vitest";
import { describe, expect } from "vitest";
import {
  bufferToReadable,
  readableToBuffer,
  toReadableStream,
  toStreamReader,
  toWriteableStream,
} from "./stream";

describe("stream utility functions", () => {
  describe("bufferToReadable", () => {
    test("should convert buffer to ReadableStream", async () => {
      const buffer = new Uint8Array([1, 2, 3, 4]).buffer;
      const readable = bufferToReadable(buffer);
      const result = await readableToBuffer(readable);
      expect(new Uint8Array(result)).toEqual(new Uint8Array([1, 2, 3, 4]));
    });
  });

  describe("readableToBuffer", () => {
    test("should convert ReadableStream to buffer", async () => {
      const buffer = new Uint8Array([1, 2, 3, 4]).buffer;
      const readable = bufferToReadable(buffer);
      const result = await readableToBuffer(readable);
      expect(new Uint8Array(result)).toEqual(new Uint8Array([1, 2, 3, 4]));
    });
  });

  describe("toReadableStream", () => {
    test("should convert Readable to ReadableStream", () => {
      const readable = new Readable();
      const readableStream = toReadableStream(readable);
      expect(readableStream).toBeInstanceOf(ReadableStream);
    });

    test("should convert PassThrough to ReadableStream", () => {
      const passThrough = new PassThrough();
      const readableStream = toReadableStream(passThrough);
      expect(readableStream).toBeInstanceOf(ReadableStream);
    });
  });

  describe("toWriteableStream", () => {
    test("should convert Writable to WritableStream", () => {
      const writable = new PassThrough();
      const writableStream = toWriteableStream(writable);
      expect(writableStream).toBeInstanceOf(WritableStream);
    });

    test("should convert PassThrough to WritableStream", () => {
      const passThrough = new PassThrough();
      const writableStream = toWriteableStream(passThrough);
      expect(writableStream).toBeInstanceOf(WritableStream);
    });
  });

  describe("toStreamReader", () => {
    test("should create StreamReader from ReadableStream", async () => {
      const buffer = new Uint8Array([1, 2, 3, 4]).buffer;
      const readable = bufferToReadable(buffer);
      const streamReader = toStreamReader(readable);
      const result = await streamReader.arrayBuffer();
      expect(new Uint8Array(result)).toEqual(new Uint8Array([1, 2, 3, 4]));
    });
  });
});
