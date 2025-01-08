import { unlinkSync } from "node:fs";
import { test as base } from "vitest";

export * from "./utility";

interface Use<T> {
  (value: T): Promise<void>;
}

export const test = base.extend({
  signal: async ({}, use: Use<AbortSignal>) => {
    const ab = new AbortController();
    try {
      await use(ab.signal);
    } finally {
      ab.abort();
    }
  },
  file: async ({}, use: Use<(p: string) => string>) => {
    const files: string[] = [];
    const fn = (path: string) => {
      files.push(path);
      try {
        unlinkSync(path);
      } catch {}
      return path;
    };
    try {
      await use(fn);
    } finally {
      while (files.length > 0) {
        try {
          unlinkSync(files.pop()!);
        } catch {}
      }
    }
  },
});
