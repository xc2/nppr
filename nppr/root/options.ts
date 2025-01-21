import * as NodePath from "node:path";
export function normalizeOutPath(
  p: string | "none" | "auto",
  defaultValue: string | undefined,
  outbaseAbs: string
): string | undefined {
  if (p === "none") {
    return undefined;
  }
  if (p === "auto") {
    return defaultValue;
  }
  return NodePath.isAbsolute(p) ? NodePath.relative(outbaseAbs, p as string) : p;
}

export function isOptionDefined(v: any) {
  if (v === false || v === 0) return true;
  if (!v) return false;
  if (v.length) {
    return true;
  }
  if (typeof v === "object") {
    for (const _ in v) {
      return true;
    }
    return false;
  }
  return true;
}

export function relativePathAny(to: string, from: string) {
  const r = NodePath.relative(NodePath.dirname(from), to);
  return r.startsWith(".") ? r : `./${r}`;
}

export interface DeferredPublishTask {
  baseDir?: string;
  inputs?: string[];
  provenanceFrom?: string;
  publish?: boolean;
  [key: string]: unknown;
}

export function getDeferredPublishTaskConfig() {
  const [_, scriptPath] = process.argv;

  let config: DeferredPublishTask = {};
  try {
    config = require(/* webpackIgnore: true */ scriptPath + ".json");
  } catch {
    return config;
  }
  const baseDir = NodePath.resolve(NodePath.dirname(scriptPath), config.baseDir ?? ".");
  const resolvePath = (v: string) => NodePath.relative(process.cwd(), NodePath.resolve(baseDir, v));
  const inputs = (config.inputs ?? []).map((v: string) => resolvePath(v));
  const provenanceFrom = config.provenanceFrom ? resolvePath(config.provenanceFrom) : undefined;
  return { ...config, publish: true, inputs, provenanceFrom, baseDir: undefined };
}
