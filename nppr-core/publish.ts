import { readFile } from "node:fs/promises";
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
  { manifest: manifestOptions, provenanceBundle, ...publishOptions } = {} as PublishOptions
) {
  const [source1, source2] = inputSource(tarball).tee();
  const packageJson = await getManifest(source1);
  const manifest = getPublishManifest(packageJson, manifestOptions);
  if (provenanceBundle) {
    const repo = await getRepoFromProvenance(provenanceBundle);
    if (repo) {
      addRepoInfoToManifest(manifest, repo);
    }
  }
  const config = getPublishConfig({ ...packageJson, ...manifest }, publishOptions);
  // @ts-ignore
  config.provenanceFile = provenanceBundle;

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
  { tag, ...options } = {} as Omit<PublishOptions, "manifest" | "provenanceBundle">
): _PublishOptions {
  return {
    ...manifest.publishConfig,
    npmVersion: NPPR_USER_AGENT,
    ...options,
    defaultTag: tag || "latest",
    provenance: false,
    forceAuth: {
      token: options._authToken || options.token,
    },
  };
}

export async function getRepoFromProvenance(provenance: string | object) {
  if (typeof provenance === "string") {
    provenance = JSON.parse(await readFile(provenance, "utf8"));
  }
  const p = provenance as any;
  const payloadSource = JSON.parse(Buffer.from(p.dsseEnvelope.payload, "base64").toString("utf-8"));
  if (payloadSource?.predicate?.buildDefinition?.resolvedDependencies?.[0]) {
    const dep = payloadSource.predicate.buildDefinition.resolvedDependencies[0];
    return getRepositoryInfo(dep.uri, dep.digest.gitCommit);
  } else if (payloadSource?.predicate?.materials?.[0]) {
    const dep = payloadSource.predicate.materials[0];
    return getRepositoryInfo(dep.uri, dep.digest.sha1);
  }
  return null;
}

interface Repo {
  repository: string;
  commit: string;
  homepage?: string;
  issues?: string;
}

function getRepositoryInfo(repo: string, commit: string): Repo | null {
  if (!repo || !commit) return null;
  const u = new URL(repo);
  if (u.pathname.includes("@refs")) {
    const [name, ref] = u.pathname.split("@refs/");
    u.pathname = name;
  }
  const fin = {
    repository: u.toString(),
    commit: commit,
  } as Repo;
  if (u.host === "github.com") {
    const webUrl = `https://github.com${u.pathname}`;
    fin.repository = `git+https://github.com${u.pathname}.git`;
    fin.homepage = webUrl;
    fin.issues = `${webUrl}/issues`;
  }
  return fin;
}
function addRepoInfoToManifest(manifest: Manifest, repo: Repo) {
  if (!manifest.repository) {
    manifest.repository = { type: "git", url: repo.repository };
  } else if (typeof manifest.repository !== "string") {
    if (!manifest.repository.url) {
      manifest.repository.url = repo.repository;
      manifest.repository.type = "git";
    }
  }
  if (!manifest.homepage) {
    manifest.homepage = repo.homepage;
  }
  if (!manifest.bugs) {
    manifest.bugs = repo.issues;
  } else if (typeof manifest.bugs !== "string") {
    if (!manifest.bugs.url) {
      manifest.bugs.url = repo.issues;
    }
  }
  if (!manifest.gitHead) {
    manifest.gitHead = repo.commit;
  }
}
