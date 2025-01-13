import { link, readFile } from "node:fs/promises";
import { mockFulcio, mockRekor, mockTSA } from "@sigstore/mock";
import { cac } from "cac";
import nock from "nock";
import { getManifest, inputSource } from "nppr-core";
import { generateSubject } from "nppr-core/provenance";
import { stubEnvs, test } from "tests/vitest";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect } from "vitest";
import { BasicTarballPath, ReadmeTemplate } from "../../tests/__fixtures__/tarball";
import { entryText } from "../../tests/helpers/iterator";
import { simpleJWT } from "../../tests/helpers/jwt";
import { registerCommand } from "../utils/cac";
import { rootCommand } from "./command";

const cwd = process.cwd();
beforeAll(() => {
  process.chdir(new URL("../testing", import.meta.url).pathname);
});
afterAll(() => {
  process.chdir(cwd);
});

beforeAll(() => {
  nock.disableNetConnect();
  // nock.enableNetConnect("tuf-repo-cdn.sigstore.dev");
});
afterAll(() => {
  nock.enableNetConnect();
});
beforeEach(() => {
  mockFulcio();
  mockRekor();
  mockTSA();
});
afterEach(() => {
  nock.cleanAll();
});

async function runCli(args: string[]) {
  const cli = cac("nppr");

  registerCommand(cli, "", rootCommand);

  cli.parse([process.argv[0], "nppr", ...args], { run: false });
  return cli.runMatchedCommand();
}

test("provenance", async ({ file, signal }) => {
  stubEnvs({ SIGSTORE_ID_TOKEN: simpleJWT({ sub: "foo", name: "bar" }) }, signal);
  const sigstore = file("sigstore.json");
  const subject = await generateSubject(BasicTarballPath);
  await runCli(["--provenance", sigstore, BasicTarballPath]);
  const bundle = JSON.parse(await readFile(sigstore, "utf8"));
  const payload = JSON.parse(Buffer.from(bundle.dsseEnvelope.payload, "base64").toString("utf-8"));

  expect(payload).toMatchObject({
    subject: expect.arrayContaining([subject]),
  });
});

describe("repack", () => {
  test("output to file", async ({ file }) => {
    const tarball = file("repacked.tgz");
    await runCli(["--repack", "--output", tarball, BasicTarballPath]);
    const manifest = await getManifest(inputSource(tarball));
    expect(manifest).toMatchObject({
      name: "barhop",
      version: "0.0.0-PLACEHOLDER",
    });
  });
  test("readme file", async ({ file }) => {
    const tarball = file("repacked.tgz");
    await runCli([
      "--repack",
      "--name",
      "foo",
      "--version",
      "1.0.0",
      "--readme",
      ReadmeTemplate,
      "--output",
      tarball,
      BasicTarballPath,
    ]);
    await expect(entryText(tarball, "README.md")).resolves.toMatchSnapshot();
  });
  test("rename, reversion, output to file with default name", async ({ file }) => {
    const source = file("source.tgz");
    await link(BasicTarballPath, source);
    const scope = "foo";
    const unscoped = Math.random().toString(36).slice(2);
    const name = `@${scope}/${unscoped}`;
    const version = [0, 0, 0].map((_) => Math.round(Math.random() * 10)).join(".");
    const tarball = file(`${scope}-${unscoped}-${version}_repacked.tgz`);
    await runCli(["--repack", "--name", name, "--version", version, source, "--output"]);
    const manifest = await getManifest(inputSource(tarball));
    expect(manifest).toMatchObject({
      name,
      version,
    });
  });
});

describe("publish", () => {
  const registry = "http://foo.internal:8080";
  const nockScope = nock(registry);
  const packageName = `pkg-not-exists-${Math.random().toString(36).slice(2, 6)}`;

  test("basic", async () => {
    nockScope.put(`/barhop`).reply(async (uri, body) => {
      expect(body).toMatchObject({
        name: "barhop",
        versions: {
          "0.0.0-PLACEHOLDER": expect.not.objectContaining({
            packageManager: expect.any(String),
          }),
        },
      });
      return [201];
    });
    expect(nockScope.isDone()).toBeFalsy();

    await runCli(["--publish", "--registry", registry, BasicTarballPath]);
    expect(nockScope.isDone()).toBeTruthy();
  });
  test("repack and publish", async () => {
    nockScope.put(`/${packageName}`).reply(async (uri, body) => {
      expect(body).toMatchObject({ name: packageName });
      return [201];
    });
    expect(nockScope.isDone()).toBeFalsy();

    await runCli([
      "--repack",
      "--name",
      packageName,
      "--publish",
      "--registry",
      registry,
      BasicTarballPath,
    ]);
    expect(nockScope.isDone()).toBeTruthy();
  });
  test("repack, provenance, and publish", async ({ signal }) => {
    stubEnvs({ SIGSTORE_ID_TOKEN: simpleJWT({ sub: "foo", name: "bar" }) }, signal);

    nockScope.put(`/${packageName}`).reply(async (uri, body) => {
      expect(body).toMatchObject({
        name: packageName,
        versions: {
          "0.0.0-PLACEHOLDER": {
            homepage: "https://github.com/xc2/barhop",
            gitHead: "3662536f93fb61b95e9a6c7106ba4bcfa2694115",
          },
        },
        _attachments: {
          [`${packageName}-0.0.0-PLACEHOLDER.sigstore`]: {
            data: expect.any(String),
          },
        },
      });
      return [201];
    });
    expect(nockScope.isDone()).toBeFalsy();

    await runCli([
      "--repack",
      "--name",
      packageName,
      "--provenance",
      "--publish",
      "--registry",
      registry,
      BasicTarballPath,
    ]);
    expect(nockScope.isDone()).toBeTruthy();
  });
  test("keep fields", async () => {
    nockScope.put(`/barhop`).reply(async (uri, body) => {
      expect(body).toMatchObject({
        name: "barhop",
        versions: {
          "0.0.0-PLACEHOLDER": {
            packageManager: expect.any(String),
          },
        },
      });
      return [201];
    });
    expect(nockScope.isDone()).toBeFalsy();

    await runCli([BasicTarballPath, "--publish", "--registry", registry, "--keep-fields"]);
    expect(nockScope.isDone()).toBeTruthy();
  });
  test("add fields", async () => {
    nockScope.put(`/barhop`).reply(async (uri, body) => {
      expect(body).toMatchObject({
        name: "barhop",
        versions: {
          "0.0.0-PLACEHOLDER": {
            readmeFilename: "PACKAGE.md",
          },
        },
      });
      return [201];
    });
    expect(nockScope.isDone()).toBeFalsy();

    await runCli([
      BasicTarballPath,
      "--publish",
      "--registry",
      registry,
      "--add-fields.readmeFilename",
      "PACKAGE.md",
    ]);
    expect(nockScope.isDone()).toBeTruthy();
  });
});
