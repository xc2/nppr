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
});
