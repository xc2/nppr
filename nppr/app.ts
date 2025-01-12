import { cac } from "cac";
import chalk from "chalk";
import { rootCommand } from "./root/command";
import { registerCommand } from "./utils/cac";

export function createCli() {
  const cli = cac("nppr");

  registerCommand(cli, "", rootCommand);

  cli.help((sections) => {
    sections.shift();
    for (let i = sections.length; i--; i > -1) {
      const { title, body } = sections[i];
      if (
        ["Commands", "For more info, run any command with the `--help` flag"].includes(title ?? "")
      ) {
        sections.splice(i, 1);
        continue;
      }
      if (title) {
        sections[i].title = chalk.bold(title.toUpperCase());
      }
    }
  });
  return cli;
}
