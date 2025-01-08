#!/usr/bin/env node

import { createCli } from "./app";

const cli = createCli();

cli.parse(process.argv, { run: false });

try {
  await cli.runMatchedCommand();
} catch (e) {
  if ((e as any)?.name === "CACError") {
    process.stderr.write((e as any).message + "\n");
    cli.outputHelp();
    process.exit(255);
  }
  process.exit(process.exitCode || 1);
}
