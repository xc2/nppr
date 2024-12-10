import { spawn } from "node:child_process";
import { awaitChildProcess } from "./shell";
import { dirtyTimestampToDate } from "./utils";

export async function getCommitTime(commit = "HEAD") {
  const s = await awaitChildProcess(
    spawn("git", ["show", "-s", "--format=%ct", commit], { shell: true })
  );
  return dirtyTimestampToDate(s);
}
