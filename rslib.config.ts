import { defineConfig } from "@rslib/core";
import libnpmpublishManifest from "libnpmpublish/package.json";
import projectManifest from "./package.json";
const npprCoreDeps = ["tar", "npm-package-arg", "just-compare"];
const libnpmpublishExternals = ["sigstore", "semver", "npm-registry-fetch", "ci-info"];
const libnpmpublishDeps = Object.fromEntries(
  libnpmpublishExternals.map((v) => [
    v,
    // @ts-ignore
    libnpmpublishManifest.dependencies[v],
  ])
);
const packageJson = {
  version: "0.0.0-PLACEHOLDER",
  license: projectManifest.license,
  homepage: projectManifest.homepage,
};
export default defineConfig({
  lib: [
    {
      id: "nppr-core:libnpmpublish",
      bundle: true,
      format: "esm",
      syntax: "es2020",
      autoExternal: false,

      source: {
        tsconfigPath: "nppr-core/third_party/libnpmpublish/tsconfig.json",
        entry: {
          index: "./nppr-core/third_party/libnpmpublish/index.ts",
        },
      },
      dts: { bundle: true },
      output: {
        target: "node",
        distPath: { root: "packages/nppr-core/third_party/libnpmpublish" },
        externals: npprCoreDeps.concat([getNodeJsExternals()]).concat(libnpmpublishExternals),
      },
    },

    {
      bundle: false,
      syntax: "es2020",
      id: "esm",
      format: "esm",
      source: {
        entry: {
          main: [
            "nppr-core/**/*.ts",
            "!nppr-core/**/__*__/**",
            "!nppr-core/**/*.test.*",
            "!nppr-core/third_party/**",
          ],
        },
        tsconfigPath: "nppr-core/tsconfig.json",
      },
      output: {
        target: "node",
        distPath: { root: "packages/nppr-core" },
        copy: [
          {
            from: "nppr-core/package.json",
            async transform(buf) {
              const pkg = JSON.parse(buf.toString());
              Object.assign(pkg, packageJson);
              pkg.dependencies = {
                ...libnpmpublishDeps,
                ...getDependencies(npprCoreDeps.concat(libnpmpublishExternals)),
                ...pkg.dependencies,
              };
              return Buffer.from(JSON.stringify(pkg, null, 2));
            },
          },
        ],
      },
      dts: { bundle: false },
    },

    {
      id: "nppr",
      bundle: true,
      format: "esm",
      syntax: "es2022",
      autoExternal: false,
      source: {
        entry: {
          nppr: "nppr/bin.ts",
        },
      },
      output: {
        target: "node",
        distPath: { root: "packages/nppr" },
        externals: [].concat(getNodeJsExternals()),
        copy: [
          {
            from: "nppr/package.json",
            async transform(buf) {
              const pkg = JSON.parse(buf.toString());
              Object.assign(pkg, packageJson);
              pkg.bin = "nppr.js";

              return Buffer.from(JSON.stringify(pkg, null, 2));
            },
          },
        ],
      },
    },
  ],
});

function getTypesPackageName(name: string) {
  if (name.startsWith("@")) {
    const [scope, ...rest] = name.split("/");
    return `@types/${scope}__${rest.join("/")}`;
  }
  return `@types/${name}`;
}

function getDependencies(list: string[]) {
  return list.reduce((deps, name) => {
    for (const pkg of [name, getTypesPackageName(name)]) {
      // @ts-ignore
      if (projectManifest.devDependencies[pkg]) {
        // @ts-ignore
        deps[pkg] = projectManifest.devDependencies[pkg];
      }
    }
    return deps;
  }, {} as any);
}

function getNodeJsExternals() {
  const entries = [
    "assert",
    "buffer",
    "crypto",
    "dns",
    "events",
    "fs",
    "http",
    "http2",
    "https",
    "module",
    "net",
    "os",
    "path",
    "querystring",
    "stream",
    "string_decoder",
    "tls",
    "tty",
    "url",
    "util",
    "zlib",
  ].map((v) => [v, `node:${v}`]);
  return Object.fromEntries(entries);
}
