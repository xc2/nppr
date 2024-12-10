import type { PackageJSON } from "@npm/types";

export type Manifest = PackageJSON;
export const NPM_COM_REGISTRY = "https://registry.npmjs.org";
export const NPM_COM_WEB = "https://npmjs.com";

export function buildMetaUrl(opts: { name: string; version?: string; registry?: string }) {
  const { name, version, registry = NPM_COM_REGISTRY } = opts;
  const u = new URL(
    [name, version]
      .filter(Boolean as unknown as (v: unknown) => v is string)
      .map((c) => encodeURIComponent(c))
      .join("/"),
    registry
  );
  return u.href;
}

export function buildWebUrl(opts: { name: string; version?: string; hostname?: string }) {
  const { name, version, hostname = NPM_COM_WEB } = opts;
  const u = new URL(version ? `/package/${name}/v/${version}` : `/package/${name}`, hostname);
  return u.href;
}

export function cleanManifest(manifest: Manifest, extraReserves: string[] = []): Manifest {
  const reserves = new Set(getReserveFields().concat(extraReserves));
  return Object.keys(manifest)
    .filter((key) => reserves.has(key))
    .reduce((acc, key) => {
      acc[key] = manifest[key];
      return acc;
    }, {} as Manifest);
}

export function getReserveFields() {
  return [
    "name",
    "version",
    "bin",
    "description",
    "keywords",
    "homepage",
    "bugs",
    "license",
    "author",
    "contributors",
    "funding",
    "engines",
    "repository",
    "dependencies",
    "peerDependencies",
    "peerDependenciesMeta",
    "optionalDependencies",
    "os",
    "cpu",
    // yarnpkg-specific fields below
    "libc",
    "languageName",
    "dependenciesMeta",
    "preferUnplugged",
  ];
}
