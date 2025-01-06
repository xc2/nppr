export default [
  {
    test: {
      name: "source",
      root: "./nppr-core",
      environment: "node",
    },
    resolve: {
      alias: {
        "nppr-core/": new URL("./nppr-core/", import.meta.url).pathname,
        "tests/": new URL("./tests/", import.meta.url).pathname,
      },
    },
  },
];