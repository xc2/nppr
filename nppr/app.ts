import { cac } from "cac";
import { rootCommand } from "./commands/root";
import { registerCommand } from "./utils/cac";

export function createCli() {
  const cli = cac("nppr");

  registerCommand(cli, "", rootCommand);

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
  return cli;
}
