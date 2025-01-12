#!/usr/bin/env node

import { EOL } from "node:os";
import { createCli } from "./app";

const cli = createCli();

cli.parse(process.argv, { run: false });

try {
  await cli.runMatchedCommand();
} catch (e) {
  if (["CACError", "ArgumentsError"].includes((e as any)?.name)) {
    const [message, ...rest] = ((e as any).stack ?? "").split(/(\r\n|\n|\r)/);
    process.stderr.write(message + EOL + EOL);
    cli.outputHelp();
    process.exit(255);
  }
  console.error(e);
  process.exit(process.exitCode || 1);
}
