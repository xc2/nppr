import type { CliCommand } from "../types";

export const rootCommand: CliCommand = (cmd) => {
  return cmd("<...inputs>")
    .option("--repack", "[Repack] Repack the tarball")
    .option("--name <name>", "[Repack] Overrides `package.json/name`")
    .option("--version <version>", "[Repack] Overrides `package.json/version`")
    .option("--remap <remap>", "[Repack] Remap dependencies/optionalDependencies")
    .action((inputs, options) => {
      console.log(inputs, options);
    });
};
