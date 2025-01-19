import { mkdir, readFile } from "node:fs/promises";
import * as NodePath from "node:path";
import { glob } from "glob";
import { NPPR_USER_AGENT, tryToNumber } from "nppr-core";
import { attest } from "nppr-core/provenance";
import { type PublishOptions, publish } from "nppr-core/publish";
import { repack } from "nppr-core/repack";
import { ArgumentsError, type CliCommand } from "../utils/cac";
import { Package } from "../utils/package";
import { ProvenanceBundle } from "../utils/provenance-bundle";
import { secretFrom } from "../utils/secret-from";
import { isOptionDefined, normalizeOutPath } from "./options";

async function ensureDir(dir: string) {
  const p = NodePath.resolve(process.cwd(), dir);
  await mkdir(p, { recursive: true });
  return p;
}

export const rootCommand: CliCommand = (cmd) => {
  const command = cmd("[...inputs]");
  return command
    .usage(`[...**INPUTS**] [**OPTIONS**]`)
    .option("--outbase [path]", "Base path of all **OUTPATH** options.", {
      default: "nppr-out",
    })
    .option(
      "--tarball [OUTPATH]",
      "Repack/Copy packages to the specified path. Enabled by default if `--publish` is not set."
    )
    .option("--name <name>", "**[Repack]** with `package.json/name` overridden")
    .option("--version <version>", "**[Repack]** with `package.json/version` overridden")
    .option(
      "--readme <frompath>",
      "**[Repack]** with `README.md` overridden. Should be a file path"
    )
    .option("--remap <REMAP>", "**[Repack]** with dependencies/optionalDependencies overridden")
    .option(
      "--provenance [OUTPATH]",
      "**[Provenance]** Generate and attest the provenance of the package. Write to disk by default if `--publish` is not set."
    )
    .option("--publish", "**Publish** the input or repacked packages")
    .option("--registry <url>", "**[Publish]** to specific registry", {
      default: "https://registry.npmjs.org",
    })
    .option(
      "--token <tokenfrom>",
      "**[Publish]** with specific token. nppr will not load token from npmrc",
      {
        default: "env:NPM_TOKEN",
      }
    )
    .option(
      "--keep-fields [fields]",
      "**[Publish]** without cleaning meaningless fields from manifest"
    )
    .option("--add-fields [fields]", "**[Publish]** with additional fields to manifest")
    .option("--tag <fields>", "**[Publish]** with specific dist tag")
    .option("--provenance-from <frompath>", "**[Publish]** with existing provenance file")

    .action(async (inputs: string[], options) => {
      const shouldRepack = [options.name, options.version, options.remap, options.readme].some(
        isOptionDefined
      );
      if (shouldRepack && options.provenanceFrom) {
        throw new ArgumentsError("Cannot repack and load existing provenance at the same time");
      }
      if (options.provenance && options.provenanceFrom) {
        throw new ArgumentsError(
          "Cannot generate provenance and load existing provenance at the same time"
        );
      }

      const _inputs = inputs.map(tryToNumber);
      const _paths = _inputs.filter((v) => typeof v === "string");
      const _fds = _inputs.filter((v) => typeof v === "number");
      const pkgs = ([] as (string | number)[])
        .concat(await glob(_paths, {}))
        .concat(_fds)
        .map((input) => new Package(input));

      if (pkgs.length === 0) {
        throw new ArgumentsError("No packages given");
      }

      const writings: PromiseLike<any>[] = [];
      const DefaultOutpathToken = options.publish ? "none" : "auto";
      const output = normalizeOutPath(
        typeof options.tarball === "string" ? options.tarball : DefaultOutpathToken,
        "[name]-[version][extname]"
      );
      const provenanceOutput = normalizeOutPath(
        typeof options.provenance === "string" ? options.provenance : DefaultOutpathToken,
        "provenance.sigstore"
      );

      // #region Repack
      if ([options.name, options.version, options.remap, options.readme].some(isOptionDefined)) {
        repack(
          pkgs.map((v) => ({ source: v.source })),
          {
            name: options.name,
            version: options.version,
            remapDeps: options.remap,
            transform: {
              "README.md": options.readme && readFile(options.readme, "utf8"),
            },
          }
        ).forEach((output, i) => {
          pkgs[i].source = output;
        });
      }
      // #endregion
      // #region Output
      if (output) {
        for (const pkg of pkgs) {
          writings.push(pkg.output(NodePath.resolve(await ensureDir(options.outbase), output)));
        }
      }
      // #endregion

      let provenanceBundle = new ProvenanceBundle();

      // #region Provenance
      if (options.provenance) {
        for (const pkg of pkgs) {
          // NPM Registry only supports one package per provenance
          const provenance = await attest([{ source: pkg.tee(), manifest: pkg.manifest }], {});
          provenanceBundle.add(provenance);
        }
        if (provenanceOutput) {
          writings.push(
            provenanceBundle.outputBundle(
              NodePath.resolve(await ensureDir(options.outbase), provenanceOutput)
            )
          );
        }
      } else if (options.provenanceFrom) {
        provenanceBundle = await ProvenanceBundle.fromFile(options.provenanceFrom);
      }
      // #endregion

      // #region Publish
      if (options.publish) {
        const publishOptions: PublishOptions = {
          registry: options.registry,
          provenance: provenanceBundle.get.bind(provenanceBundle),
          token: await secretFrom(options.token),
          tag: options.tag,
          npmVersion: `nppr/v1 ${NPPR_USER_AGENT}`,
          manifest: {
            keepFields: options.keepFields,
            additionalFields: options.addFields,
          },
        };
        for (const pkg of pkgs) {
          await publish(pkg.source, publishOptions);
        }
      }
      // #endregion

      await Promise.all(writings);
    })
    .example(
      (bin) =>
        `
# INPUTS
  // TODO
# OUTPATH
  // TODO
# REMAP
  // TODO
# Repack
  Rename a package

    $ ${bin} bar-0.0.0.tgz --name foo
  
  Re-version a package

    $ ${bin} bar-0.0.0.tgz --version 0.1.1

`
    );
};
