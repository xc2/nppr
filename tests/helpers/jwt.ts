import { createHmac } from "node:crypto";

export function part(p: Buffer | string) {
  p = Buffer.from(p);
  return p.toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

export function simpleJWT(payload: Record<string, any>, header?: Record<string, any>, key = "") {
  const h = { ...header, alg: "HS256", typ: "JWT" };
  const p = { ...payload, iat: Math.floor(Date.now() / 1000) };
  const toEncode = [h, p].map((p) => part(JSON.stringify(p))).join(".");
  const s = part(createHmac("sha256", key).update(toEncode).digest());
  return `${toEncode}.${s}`;
}
