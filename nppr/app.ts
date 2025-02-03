import { EOL } from "node:os";
import { cac } from "cac";
import chalk from "chalk";
import { rootCommand } from "./root/command";
import { getOptionsForUsage, registerCommand, simplyFold } from "./utils/cac";

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
      let { title, body } = sections[i];

      if (title === "Options") {
        const { options, maxColumn } = getOptionsForUsage(cli);

        const details = options
          .map((option) => {
            let nameRow = chalk.bold(
              option.rawName.replace(/([\[<])([^\]>]+)([\]>])/g, (_, p1, p2, p3) => {
                const content = `${p1}${p2}${option.config.default ? `=${option.config.default}` : ""}${p3}`;

                return chalk.bold.reset(p1 === "[" ? chalk.dim(content) : content);
              })
            );
            const bodyRows: string[] = [];
            bodyRows.push(option.description.trim());

            return [simplyFold(nameRow, 2), simplyFold(bodyRows.filter(Boolean).join(EOL), 6)]
              .filter(Boolean)
              .join(EOL);
          })
          .join(`${EOL}${EOL}`);

        body = details;
      }

      if (body) {
        body = body
          .replace(/^\n+/, "")
          .replace(/\n+$/, "")
          //          111     22222  3333
          .replace(/^(\s*)\$ ([^#]+)(# .+)?/gm, (_, p1, p2, p3) => {
            return `${p1}${chalk.dim("$")} ${p2}${p3 ? chalk.dim(p3) : ""}`;
          })
          .replace(/\*\*([^*]+)\*\*/g, (_, p1) => {
            return chalk.bold(p1);
          })
          .replace(/`([^`]+)`/g, (_, p1) => {
            return chalk.dim(p1);
          });
      }
      if (title) {
        sections[i].title = chalk.bold(title.toUpperCase());
      }
      sections[i].body = body;
    }
  });

  return cli;
}
