import { debug } from "debug";
export function d(name: string) {
  return debug(`nppr:${name}`);
}
