import { cac } from "cac";
import chalk from "chalk";
import { rootCommand } from "./root/command";
import { registerCommand } from "./utils/cac";

export function createCli() {
  const cli = cac("nppr");

  registerCommand(cli, "", rootCommand);

  cli.help((sections) => {
    sections.shift();
    for (let i = 0; i < sections.length; i++) {
      const { title, body } = sections[i];
      if (
        ["Commands", "For more info, run any command with the `--help` flag"].includes(title ?? "")
      ) {
        sections.splice(i, 1);
        i = i - 1;
        continue;
      }
      if (body) {
        const [first, ...rest] = body.split(/^# /gm);
        if (rest.length > 0) {
          const add = rest.map((v) => {
            const [title, ...body] = v.split("\n");
            return {
              title,
              body: body.join("\n"),
            };
          });
          if (first.trim()) {
            sections[i].body = first;
            sections.splice(i + 1, 0, ...add);
          } else {
            sections.splice(i, 1, ...add);
          }
        }
      }
    }
    for (let i = 0; i < sections.length; i++) {
      const { title, body } = sections[i];
      if (title) {
        sections[i].title = chalk.bold(title.toUpperCase());
      }
      if (body) {
        let b = body
          .replace(/^\n+/, "")
          .replace(/\n+$/, "")
          .replace(/^(\s*)\$ /gm, (_, p1) => {
            return `${p1}${chalk.dim("$")} `;
          })
          .replace(/\*\*([^*]+)\*\*/g, (_, p1) => {
            return chalk.bold(p1);
          });
        if (title === "Options") {
          b = b.replace(/(\S)(\s+)\(default: (.+?)\)/gm, (_, p1, p2, p3) => {
            const d = ["."].includes(p1) ? p1 : `${p1}.`;
            return `${d}${p2}${chalk.dim(`DEF: `)}${chalk.reset(p3)}`;
          });
        }
        sections[i].body = b;
      }
    }
  });

  return cli;
}
