import type { MockInstance } from "vitest";

export function mockImplementation<T extends (...args: any[]) => any>(
  instance: MockInstance<T>,
  impl: T,
  signal?: AbortSignal
) {
  instance.mockImplementation(impl);
  signal?.addEventListener("abort", () => {
    instance.mockRestore();
  });
}
export function stubEnvs(envs: Record<string, string | undefined>, signal?: AbortSignal) {
  return stubRefs(
    process.env,
    Object.fromEntries(Object.entries(envs).map(([k, v]) => [k, v === undefined ? v : `${v}`])),
    signal
  );
}
export function stubRefs<T extends {} = {}>(ref: T, stubs: Partial<T>, signal?: AbortSignal) {
  const restores: (() => void)[] = [];
  for (const [key, value] of Object.entries(stubs)) {
    restores.push(_stubRef(ref, key, value));
  }
  const restore = () => {
    while (restores.length > 0) {
      restores.pop()?.();
    }
  };
  signal?.addEventListener("abort", restore);
  return restore;
}

function _stubRef(ref: Record<PropertyKey, any>, key: string, value: any) {
  const prevExists = key in ref;
  const prevValue = ref[key];
  if (!prevExists && value === undefined) {
  } else {
    ref[key] = value;
  }
  return () => {
    if (ref[key] !== value) return;
    if (prevExists) {
      ref[key] = prevValue;
    } else {
      delete ref[key];
    }
  };
}
