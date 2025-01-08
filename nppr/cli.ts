#!/usr/bin/env node
import * as process from "node:process";
import { type CAC, cac } from "cac";
import { rootCommand } from "./commands/root";
import type { CliCommand } from "./types";

const cli = cac("nppr");

const registerCommand = (name: string, cmd: CliCommand) => {
  const register: CAC["command"] = (rawName, ...args) => {
    return cli.command([name, rawName].filter(Boolean).join(" "), ...args);
  };
  return cmd(register);
};

registerCommand("", rootCommand);

cli.help((sections) => {
  sections.shift();
  for (let i = sections.length; i--; i > -1) {
    if (
      ["Commands", "For more info, run any command with the `--help` flag"].includes(
        sections[i].title ?? ""
      )
    ) {
      sections.splice(i, 1);
    }
  }
});

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
