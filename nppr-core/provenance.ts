// @ts-ignore
import { generateProvenance } from "libnpmpublish/lib/provenance";
import { digestStream } from "./internals/crypto";
import { toHex } from "./internals/encoding";
import { type Manifest, getManifest } from "./internals/package";
import { type InputSource, inputSource, toPurl } from "./utils";

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

export type PayloadSource = InputSource;
export type PayloadManifest = Pick<Manifest, "name" | "version">;
export interface SubjectPayload {
  source: PayloadSource;
  manifest?: PayloadManifest | PromiseLike<PayloadManifest>;
}

export async function attest(sources: (PayloadSource | SubjectPayload)[], opts?: SignOptions) {
  return generateProvenance(await generateSubjects(sources), {
    ...opts,
  });
}

export function generateSubjects(sources: (PayloadSource | SubjectPayload)[]) {
  return Promise.all(
    sources.map(async (p) => {
      if (typeof p === "object" && "source" in p)
        return generateSubject(p.source, await p.manifest);
      return generateSubject(p);
    })
  );
}

export async function generateSubject(
  source: PayloadSource,
  manifest?: PayloadManifest | PromiseLike<PayloadManifest>
) {
  source = inputSource(source);
  if (!manifest) {
    const [source1, source2] = source.tee();
    source = source1;
    manifest = getManifest(source2);
  }
  const hash = await digestStream(source, "sha512");
  const { name, version } = await manifest;
  return {
    name: toPurl({ name, version }),
    digest: { sha512: toHex(hash) },
  };
}
