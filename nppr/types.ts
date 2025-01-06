import type { CAC, Command } from "cac";

export interface CliCommand {
  (get: CAC["command"]): Command;
}
