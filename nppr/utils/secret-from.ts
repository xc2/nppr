import { readFile, stat } from "node:fs/promises";

export class UnknownSecretType extends Error {
  constructor(type: string) {
    super(`Unknown secret type: ${type}`);
  }
}

export async function secretFrom(id: string) {
  const [type, ...rest] = id.split(":");
  if (type === "env") {
    return envSecret(rest.join(":"));
  } else if (type === "file") {
    return fileSecret(rest.join(":"));
  }
  throw new UnknownSecretType(type);
}

function envSecret(key: string) {
  return process.env[key];
}

async function fileSecret(path: string) {
  const { mode } = await stat(path);
  if ((mode & 0o0077) !== 0) {
    process.emitWarning(
      `Secret file \`${path}\` is too open, please consider changing the permissions`
    );
  }
  return (await readFile(path, "utf-8")).trim();
}
