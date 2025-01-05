import { createRequire } from "node:module";
export function resolveModule(context: string, ...requests: string[]) {
  let req = context;
  for (const request of requests) {
    const r = createRequire(req);
    req = r.resolve(request);
  }
  return req;
}
