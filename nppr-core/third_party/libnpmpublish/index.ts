import {
  generateProvenance as _generateProvenance,
  verifyProvenance as _verifyProvenance,
  // @ts-ignore
} from "libnpmpublish/lib/provenance";
// @ts-ignore
import { default as _publish } from "libnpmpublish/lib/publish";
export type { PublishOptions } from "libnpmpublish";
import type { publish as Publish } from "libnpmpublish";
export const publish: typeof Publish = _publish;
export const generateProvenance = _generateProvenance as any;
export const verifyProvenance = _verifyProvenance as any;
