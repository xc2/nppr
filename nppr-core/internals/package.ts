import type { PackageJSON } from "@npm/types";
import { PackageJsonPath } from "./constants";
import { findMapAsync } from "./lang";
import { iterEntries } from "./tar";

export type Manifest = PackageJSON;

export async function getManifest(source: ReadableStream) {
  return (await findMapAsync(iterEntries(source), async ([entry, reader]) => {
    if (entry.path === PackageJsonPath) {
      return reader.json<Manifest>();
    }
  }))!;
}

export const mutateFields = mutateObject<Manifest>;

export function mutateDependencies(
  manifest: Manifest,
  remap?: Record<string, string>,
  list: ("dependencies" | "optionalDependencies" | "peerDependencies" | "devDependencies")[] = [
    "dependencies",
    "optionalDependencies",
  ]
) {
  for (const field of list) {
    if (manifest[field]) mutateObject(manifest[field], remap, true);
  }
  return manifest;
}

// # region internals
function mutateObject<T extends {}>(
  o: T,
  fields?: { [K in keyof T]?: T[K] | undefined | null },
  onlyExisting = false
) {
  for (const [k, v] of Object.entries(fields ?? {})) {
    if (v === undefined) continue;
    if (v === null) {
      delete o[k as keyof T];
      continue;
    }
    if (onlyExisting) {
      if (k in o) {
        // @ts-ignore
        o[k] = v;
      }
      continue;
    }
    // @ts-ignore
    o[k] = v;
  }
  return o;
}
