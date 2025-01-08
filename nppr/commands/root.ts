import { glob } from "glob";
import { repack } from "nppr-core/repack";
import { inputSource } from "nppr-core/utils";
import type { CliCommand } from "../types";
import { tryToNumber } from "../utils/lang";

export const rootCommand: CliCommand = (cmd) => {
  return cmd("[...inputs]")
    .option("--repack", "[Repack] Repack the tarball")
    .option("--name <name>", "[Repack] Overrides `package.json/name`")
    .option("--version <version>", "[Repack] Overrides `package.json/version`")
    .option("--remap <remap>", "[Repack] Remap dependencies/optionalDependencies")
    .option("--output <filepath>", "[Repack] Save the repacked tarball to a file")
    .option(
      "--provenance [filepath]",
      "[Provenance] Generate and attest the provenance of the package"
    )
    .example("--remap.express=npm:@canary/express@5.0.0")
    .action(async (inputs: string[], options) => {
      const _inputs = inputs.map(tryToNumber);
      const _paths = _inputs.filter((v) => typeof v === "string");
      const _fds = _inputs.filter((v) => typeof v === "number");
      const sources = ([] as (string | number)[])
        .concat(await glob(_paths, {}))
        .concat(_fds)
        .map((source) => ({
          input: source,
          source: inputSource(source),
        }));

      // #region Repack
      if (options.repack) {
        repack(sources, {
          name: options.name,
          version: options.version,
          remapDeps: options.remap,
        }).forEach((output, i) => {
          sources[i].source = output;
        });
      }
      // #endregion

      // #region Provenance
      if (options.provenance) {
        // const attestation = await attest(sources.map(v => ({source: v})));
        // console.log(attestation);
      }
      // #endregion
    });
};
