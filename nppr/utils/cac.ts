import { EOL } from "node:os";
import * as process from "node:process";
import type { CAC, Command } from "cac";
import stringWidth from "string-width";

export interface CliCommand {
  (get: CAC["command"]): Command;
}

export const registerCommand = (cli: CAC, name: string, cmd: CliCommand) => {
  const register: CAC["command"] = (rawName, ...args) => {
    return cli.command([name, rawName].filter(Boolean).join(" "), ...args);
  };
  return cmd(register);
};

export class ArgumentsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ArgumentsError";
  }
}

export function getOptionsForUsage(cli: CAC) {
  const cmd = cli.matchedCommand || cli.globalCommand;
  const { options: globalOptions } = cli.globalCommand;
  let options = cmd.isGlobalCommand ? globalOptions : [...cmd.options, ...(globalOptions || [])];

  if (!cmd.isGlobalCommand && !cmd.isDefaultCommand) {
    options = options.filter((option) => option.name !== "version");
  }

  const maxColumn = getMaxLength(options.map((option) => option.rawName));
  return {
    maxColumn,
    options,
  };
}

function getMaxLength(arr: string[]) {
  return arr.reduce((a, b) => Math.max(a, b.length), 0);
}

export function indent(str: string, count = 2) {
  const spaces = " ".repeat(count);
  return str.replace(/^(?=.+$)/gm, spaces);
}

export function trimLeft(str: string) {
  return str.replace(/^\s+/g, "");
}

export function simplyFold(str: string, ind = 0, columns?: number) {
  const renderColumns = (columns || process.stdout.columns || 80) - ind;
  const lines = str.split(/(\r\n|\r|\n)/g);
  const spaces = " ".repeat(ind);
  const fin: string[] = [];
  for (let i = 0; i < lines.length; i += 2) {
    const line = lines[i];
    const br = lines[i + 1] ?? "";
    const words = line.split(/(\s+)/g);
    let currentLine = "";
    let currentLength = -1;
    for (let j = 0; j < words.length; j += 2) {
      const word = words[j] + (words[j + 1] ?? "");
      const len = stringWidth(word);
      const nextLen = currentLength + len;
      if (nextLen > renderColumns) {
        fin.push(spaces + currentLine + EOL);
        currentLine = word;
        currentLength = len;
      } else {
        currentLine += word;
        currentLength = nextLen;
      }
    }
    if (currentLine) {
      fin.push(spaces + currentLine);
    }
    fin.push(br);
  }

  return fin.join("");
}
