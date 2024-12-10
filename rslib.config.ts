import { type LibConfig, defineConfig } from "@rslib/core";

const common = {
  source: {
    entry: {
      main: ["src/**/*.ts"],
    },
  },
  output: {
    distPath: { root: "dist" },
    minify: {
      jsOptions: {
        minimizerOptions: {
          compress: false,
          mangle: false,
          format: {
            comments: "some",
            beautify: true,
          },
        },
      },
    },
  },
  bundle: false,
  dts: false,
} satisfies LibConfig;
export default defineConfig({
  lib: [
    {
      ...common,
      format: "esm",
      syntax: "es2020",
      output: {
        distPath: { root: "dist/esm" },
      },
      dts: {
        bundle: false,
        distPath: "dist/types",
      },
    },
    {
      ...common,
      format: "cjs",
      syntax: "es2020",
      output: {
        distPath: { root: "dist/cjs" },
      },
    },
    {
      ...common,
      format: "esm",
      syntax: "es5",
      output: { ...common.output, distPath: { root: "dist/legacy" } },
    },
  ],
});
