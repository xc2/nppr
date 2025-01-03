export default [
  {
    test: "source",
    root: "./nppr-core",
    environment: "node",
    resolve: {
      alias: {
        "nppr-core/": new URL("./nppr-core/", import.meta.url).pathname,
        "__fixtures__/": new URL("./__fixtures__/", import.meta.url).pathname,
      },
    },
  },
];
