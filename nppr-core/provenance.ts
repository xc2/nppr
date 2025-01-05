// @ts-ignore
import { generateProvenance } from "libnpmpublish/lib/provenance";
import npa from "npm-package-arg";
import { digestStream } from "./internals/crypto";
import type { Manifest } from "./internals/npm";
import { duplicatePackageStream } from "./internals/pkg-stream";

interface IdentityProvider {
  getToken: () => Promise<string>;
}

export interface SignOptions {
  fulcioURL?: string;
  identityProvider?: IdentityProvider;
  identityToken?: string;
  rekorURL?: string;
  tlogUpload?: boolean;
  tsaServerURL?: string;
  legacyCompatibility?: boolean;
}

export type PayloadSource = ReadableStream;
export type PayloadManifest = Pick<Manifest, "name" | "version">;
export interface SubjectPayload {
  source: PayloadSource;
  manifest?: PayloadManifest;
}

export async function attest(sources: (PayloadSource | SubjectPayload)[], opts?: SignOptions) {
  return generateProvenance(await generateSubjects(sources), {
    tlogUpload: false,
    ...opts,
  });
}

export function generateSubjects(sources: (PayloadSource | SubjectPayload)[]) {
  return Promise.all(
    sources.map(async (p) => {
      if ("source" in p) return generateSubject(p.source, p.manifest);
      return generateSubject(p);
    })
  );
}

export async function generateSubject(source: PayloadSource, manifest?: PayloadManifest) {
  const { readable, manifest: pManifest } = manifest
    ? { manifest: Promise.resolve(manifest), readable: source }
    : duplicatePackageStream(source);
  const hash = await digestStream(readable, "sha512");
  const { name, version } = await pManifest;
  const spec = npa.resolve(name, version);
  return {
    // @ts-ignore
    name: npa.toPurl(spec) as string,
    digest: { sha512: hash.toString("hex") },
  };
}
