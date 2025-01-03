import type { PackageJSON } from "@npm/types";

export type Manifest = PackageJSON;

export function createFieldsTransformer(fields: Partial<Manifest>) {
  return (pkg: Manifest) => {
    let changed = false;
    for (const [key, value] of Object.entries(fields)) {
      if (value === undefined) continue;
      if (value === null) {
        if (key in pkg) {
          changed = true;
          delete pkg[key];
          continue;
        }
        continue;
      }
      if (pkg[key] === value) continue;
      changed = true;
      pkg[key] = value;
    }
    return changed && pkg;
  };
}

export function createDepsTransformer(deps: Record<string, string>) {
  return (pkg: Manifest) => {
    let changed = false;
    for (const field of ["dependencies", "optionalDependencies"] as const) {
      if (!pkg[field]) continue;
      for (const [name, version] of Object.entries(pkg[field])) {
        const remap = deps[name];
        if (remap && remap !== version) {
          pkg[field][name] = remap;
          changed = true;
        }
      }
    }
    return changed && pkg;
  };
}
