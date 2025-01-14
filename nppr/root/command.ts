import { readFile } from "node:fs/promises";
import { glob } from "glob";
import { tryToNumber } from "nppr-core";
import { attest } from "nppr-core/provenance";
import { type PublishOptions, publish } from "nppr-core/publish";
import { repack } from "nppr-core/repack";
import { ArgumentsError, type CliCommand } from "../utils/cac";
import { Package } from "../utils/package";
import { ProvenanceBundle } from "../utils/provenance-bundle";
import { secretFrom } from "../utils/secret-from";

export const rootCommand: CliCommand = (cmd) => {
  return cmd("[...inputs]")
    .option("--repack", "[Repack] Repack the tarball")
    .option(
      "--output [filepath]",
      "[Repack] Save the repacked tarball to a file, by default nothing will be written"
    )
    .option("--name <name>", "[Repack] Overrides `package.json/name` on repacking")
    .option("--version <version>", "[Repack] Overrides `package.json/version` on repacking")
    .option("--readme [filepath]", "[Repack] Readme file to include in the repacked tarball")
    .option("--remap <remap>", "[Repack] Remap dependencies/optionalDependencies on repacking")
    .option(
      "--provenance [filepath]",
      "[Provenance] Generate and attest the provenance of the package"
    )
    .option("--registry <url>", "Package Registry URL", { default: "https://registry.npmjs.org" })
    .option("--publish", "[Publish] Publish the package to the registry")
    .option("--token", "[Publish] Publish Token, e.g., `env:NPM_TOKEN` or `file:./npm-token`", {
      default: "env:NPM_TOKEN",
    })
    .option(
      "--keep-fields [fields]",
      "[Publish] Don't remove meaningless fields from manifest on publish"
    )
    .option("--add-fields [fields]", "[Publish] Additional fields to add to the manifest")
    .option("--tag <fields>", "[Publish] Dist-tag to publish the package with")
    .option("--provenance-from <filepath>", "[Publish] Provenance bundle from file")
    .example(
      (bin) =>
        `  Rename a package

    $ ${bin} --repack bar-0.0.0.tgz --name foo --output
  
  Re-version a package

    $ ${bin} --repack bar-0.0.0.tgz --version 0.1.1 --output
`
    )
    .action(async (inputs: string[], options) => {
      if (options.repack && options.provenanceFrom) {
        throw new ArgumentsError("Cannot use --repack and --provenance-from together");
      }
      if (options.provenance && options.provenanceFrom) {
        throw new ArgumentsError("Cannot use --provenance and --provenance-from together");
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

      // #region Repack
      if (options.repack) {
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
      if (options.output) {
        for (const pkg of pkgs) {
          writings.push(
            pkg.output(
              typeof options.output === "string"
                ? options.output
                : "[path]/[name]-[version]_repacked[extname]"
            )
          );
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
        if (typeof options.provenance === "string") {
          writings.push(provenanceBundle.outputBundle(options.provenance));
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
    });
};
