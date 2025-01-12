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
  manifest = JSON.parse(JSON.stringify(manifest));
  const r = {} as Manifest;
  if (options.keepFields === true) {
    Object.assign(r, manifest);
  } else {
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
  { tag, provenanceBundle, ...options } = {} as Omit<PublishOptions, "manifest">
): _PublishOptions {
  return {
    ...manifest.publishConfig,
    npmVersion: NPPR_USER_AGENT,
    ...options,
    provenanceFile: provenanceBundle,
    defaultTag: tag || "latest",
    provenance: false,
    forceAuth: {
      token: options._authToken || options.token,
    },
  };
}

// replaced by patching `libnpmpublish`
// function normalizeProvenanceBundle(provenanceBundle: undefined | string | object) {
//   if (provenanceBundle === undefined) {
//     return {
//       dispose: () => {},
//       path: undefined,
//     };
//   }
//   if (typeof provenanceBundle === "string") {
//     return {
//       dispose: () => {},
//       path: provenanceBundle,
//     };
//   }
//   const path = `${tmpdir()}/nppr-provenance-${Date.now()}.json`;
//   writeFileSync(path, JSON.stringify(provenanceBundle));
//
//   return {
//     dispose: () => {
//       try {
//         unlinkSync(path);
//       } catch {}
//     },
//     path,
//   };
// }
