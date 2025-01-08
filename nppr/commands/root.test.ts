import { readFile } from "node:fs/promises";
import { mockFulcio, mockRekor, mockTSA } from "@sigstore/mock";
import { cac } from "cac";
import nock from "nock";
import { generateSubject } from "nppr-core/provenance";
import { test } from "tests/vitest";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect } from "vitest";
import { BasicTarballPath } from "../../tests/__fixtures__/tarball";
import { registerCommand } from "../utils/cac";
import { rootCommand } from "./root";

const isCI = process.env.CI === "true" || process.env.CI === "1";

const cwd = process.cwd();
beforeAll(() => {
  process.chdir(new URL("../testing", import.meta.url).pathname);
});
afterAll(() => {
  process.chdir(cwd);
});

async function runCli(args: string[]) {
  const cli = cac("nppr");

  registerCommand(cli, "", rootCommand);

  cli.parse([process.argv[0], "nppr", ...args], { run: false });
  return cli.runMatchedCommand();
}

describe.runIf(isCI)("cli-provenance", () => {
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
  test("provenance", async ({ file }) => {
    const sigstore = file("sigstore.json");
    const subject = await generateSubject(BasicTarballPath);
    await runCli(["--provenance", sigstore, BasicTarballPath]);
    const bundle = JSON.parse(await readFile(sigstore, "utf8"));
    const payload = JSON.parse(
      Buffer.from(bundle.dsseEnvelope.payload, "base64").toString("utf-8")
    );

    expect(payload).toMatchObject({
      subject: expect.arrayContaining([subject]),
    });
  });
});
