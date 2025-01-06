import { type PublishOptions as _PublishOptions, publish as npmpublish } from "libnpmpublish";
import { type Manifest, getManifest } from "./internals/package";
import { readableToBuffer } from "./internals/stream";
import { type InputSource, NPPR_USER_AGENT, getPublishManifestFields, inputSource } from "./utils";

export interface ManifestPublishOptions {
  keepFields?: true | string[];
  additionalFields?: Partial<Manifest> | ((manifest: Manifest) => Partial<Manifest>);
}

export interface PublishOptions
  extends Omit<_PublishOptions, "provenanceFile" | "provenance" | "defaultTag"> {
  manifest?: ManifestPublishOptions;
  provenanceBundle?: string | object;
  tag?: string;
  token?: string;
}

export async function publish(
  tarball: InputSource,
  { manifest: manifestOptions, ...publishOptions } = {} as PublishOptions
) {
  const [source1, source2] = inputSource(tarball).tee();
  const packageJson = await getManifest(source1);
  const manifest = getPublishManifest(packageJson, manifestOptions);
  const config = getPublishConfig({ ...packageJson, ...manifest }, publishOptions);
  return npmpublish(
    manifest as any,
    // TODO: libnpmpublish only accepts Buffer
    Buffer.from(await readableToBuffer(source2)),
    config
  );
}

export function getPublishManifest(manifest: Manifest, options = {} as ManifestPublishOptions) {
  const r = {} as Manifest;
  if (options.keepFields !== true) {
    const extraFields = Array.isArray(options.keepFields) ? options.keepFields : [];
    for (const field of new Set([...(extraFields || []), ...getPublishManifestFields()])) {
      if (field in manifest) {
        r[field] = manifest[field];
      }
    }
  }
  const additionalFields =
    typeof options.additionalFields === "function"
      ? options.additionalFields({ ...manifest })
      : options.additionalFields;
  return { ...r, ...additionalFields };
}

export function getPublishConfig(
  manifest: Manifest,
  { provenanceBundle, tag, ...options } = {} as Omit<PublishOptions, "manifest">
): _PublishOptions {
  const provenanceFile = provenanceBundle ? normalizeProvenance(provenanceBundle) : undefined;
  return {
    ...manifest.publishConfig,
    npmVersion: NPPR_USER_AGENT,
    ...options,
    defaultTag: tag || "latest",
    // @ts-expect-error used by fs.readFile
    provenanceFile,
    provenance: false,
    _authToken: options._authToken || options.token,
  };
}

function normalizeProvenance(provenance: string | object): string | Buffer {
  if (typeof provenance === "string") {
    return provenance;
  }
  return Buffer.from(JSON.stringify(provenance), "utf-8");
}
