import { createRequire } from "node:module";

const aliases = {};
const coverageProvider = resolve("@vitest/coverage-v8");
if (coverageProvider) {
  aliases["@vitest/coverage-v8"] = coverageProvider;
}

export default {
  test: {
    coverage: {
      include: ["nppr-core"],
    },
  },

  resolve: {
    alias: {
      ...aliases,
    },
  },
};

function resolve(m) {
  let r = createRequire(import.meta.url);
  try {
    return r.resolve(m);
  } catch {}
  try {
    r = createRequire(r.resolve("vitest"));
    return r.resolve(m);
  } catch {}
}