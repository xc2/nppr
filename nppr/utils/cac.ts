import type { CAC, Command } from "cac";

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
