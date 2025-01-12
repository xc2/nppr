const resolve = {
  alias: {
    "nppr-core/": new URL("./nppr-core/", import.meta.url).pathname,
    "tests/": new URL("./tests/", import.meta.url).pathname,
  },
};
export default [
  {
    test: {
      name: "source",
      root: "./nppr-core",
      environment: "node",
    },
    resolve,
  },

  {
    test: {
      name: "cli-github",
      root: "./nppr",
      environment: "node",
      env: {
        SIMULATE_GITHUB: "true",
        CI: "1",
        GITHUB_ACTIONS: "true",
        GITHUB_WORKFLOW_REF: "xc2/barhop/.github/workflows/npm-stable.yaml@refs/tags/v0.0.1",
        GITHUB_REPOSITORY: "xc2/barhop",
        GITHUB_SERVER_URL: "https://github.com",
        GITHUB_EVENT_NAME: "release",
        GITHUB_REPOSITORY_ID: "905795361",
        GITHUB_REPOSITORY_OWNER_ID: "18117084",
        GITHUB_REF: "refs/tags/v0.0.1",
        GITHUB_SHA: "3662536f93fb61b95e9a6c7106ba4bcfa2694115",
        RUNNER_ENVIRONMENT: "github-hosted",
        GITHUB_RUN_ID: "12561818790",
        GITHUB_RUN_ATTEMPT: "1",
        SIGSTORE_ID_TOKEN:
          "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c",
      },
    },
    resolve,
  },
];