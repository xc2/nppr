import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import * as NodePath from "node:path";
import chalk from "chalk";
import { glob } from "glob";
import { NPPR_USER_AGENT, tryToNumber } from "nppr-core";
import { attest } from "nppr-core/provenance";
import { type PublishOptions, publish } from "nppr-core/publish";
import { repack } from "nppr-core/repack";
import { ArgumentsError, type CliCommand } from "../utils/cac";
import { Package } from "../utils/package";
import { ProvenanceBundle } from "../utils/provenance-bundle";
import { secretFrom } from "../utils/secret-from";
import {
  type DeferredPublishTask,
  getDeferredPublishTaskConfig,
  isOptionDefined,
  normalizeOutPath,
  relativePathAny,
} from "./options";

async function forWrite(...fps: string[]) {
  const fp = NodePath.resolve(...fps);

  await mkdir(NodePath.dirname(fp), { recursive: true });
  return fp;
}

export const rootCommand: CliCommand = (cmd) => {
  const command = cmd("[...inputs]");
  const pub = getDeferredPublishTaskConfig();
  const pubOnly = !!pub.publish;
  command.usage(`[...**INPUTS**] [**OPTIONS**]
${pub.inputs?.length ? `             ^ ${chalk.dim("Default INPUTS:")} ${pub.inputs.join(" ")}` : ""}

`);
  if (!pubOnly) {
    command
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
      );
  }
  if (!pubOnly) {
    command.option("--publish", "**Publish** the input or repacked packages", {
      default: pub.publish,
    });
    command.option("--generate-publish [OUTPATH]", "Generate a script to publish the packages");
  }
  command
    .option("--registry <url>", "**[Publish]** to specific registry", {
      default: "https://registry.npmjs.org",
    })
    .option(
      "--token <TOKENFROM>",
      "**[Publish]** with specific token. nppr will not load token from npmrc",
      {
        default: pub.token ?? "env:NPM_TOKEN",
      }
    )
    .option(
      "--keep-fields [true,fields]",
      "**[Publish]** with specific meaningless fields preserved",
      { default: pub.keepFields }
    )
    .option(
      "--add-fields [fields]",
      "**[Publish]** with additional fields. e.g., --add-fields.x=y",
      {
        default: pub.addFields,
      }
    )
    .option("--tag <fields>", "**[Publish]** with specific dist tag", { default: pub.tag })
    .option("--provenance-from <frompath>", "**[Publish]** with existing provenance file", {
      default: pub.provenanceFrom,
    })

    .action(async (inputs: string[], options) => {
      options.publish = options.publish ?? pubOnly;
      options.outbase = options.outbase ?? "nppr-out";
      inputs = inputs.length === 0 ? (pub.inputs ?? []) : inputs;
      const shouldRepack = [options.name, options.version, options.remap, options.readme].some(
        isOptionDefined
      );
      const outbaseAbs = NodePath.resolve(process.cwd(), options.outbase);
      const publishScript = normalizeOutPath(
        typeof options.generatePublish === "string"
          ? options.generatePublish
          : options.generatePublish
            ? "auto"
            : "none",
        "publish.cjs",
        outbaseAbs
      );
      const DefaultOutpathToken = options.publish ? "none" : "auto";
      const output = normalizeOutPath(
        typeof options.tarball === "string" ? options.tarball : DefaultOutpathToken,
        "[name]-[version][extname]",
        outbaseAbs
      );
      const provenanceOutput = normalizeOutPath(
        typeof options.provenance === "string" ? options.provenance : DefaultOutpathToken,
        "provenance.sigstore",
        outbaseAbs
      );
      if (shouldRepack && options.provenanceFrom) {
        throw new ArgumentsError("Cannot repack and load existing provenance at the same time");
      }
      if (options.provenance && options.provenanceFrom) {
        throw new ArgumentsError(
          "Cannot generate provenance and load existing provenance at the same time"
        );
      }
      if (publishScript && options.publish) {
        throw new ArgumentsError("Cannot generate publish script and publish at the same time");
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
      const deferredPublishTask: DeferredPublishTask = {
        inputs: [],
        provenanceFrom: undefined,
        registry: options.registry,
        tag: options.tag,
        keepFields: options.keepFields,
        addFields: options.addFields,
        token: options.token,
      };

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
          const p = await pkg.renderOutputPath(output);
          deferredPublishTask.inputs = deferredPublishTask.inputs ?? [];
          deferredPublishTask.inputs.push(p);
          await pkg.writeTo(await forWrite(outbaseAbs, p));
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
          deferredPublishTask.provenanceFrom = provenanceOutput;
          await provenanceBundle.outputBundle(await forWrite(outbaseAbs, provenanceOutput));
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

      // #region Generate Publish
      if (publishScript) {
        const npprSource = new URL(import.meta.url).pathname;
        const npprTarget = "nppr-bin.cjs";
        const extname = NodePath.extname(publishScript);
        const scriptPath = relativePathAny(npprTarget, publishScript);
        const content = [
          "#!/usr/bin/env node",
          extname !== ".mjs"
            ? `require(${JSON.stringify(scriptPath)})`
            : `import(${JSON.stringify(scriptPath)})`,
        ].join("\r\n");
        await cp(npprSource, await forWrite(outbaseAbs, npprTarget));
        await writeFile(await forWrite(outbaseAbs, publishScript), content, {
          mode: 0o755,
        });
        await writeFile(
          await forWrite(outbaseAbs, publishScript + ".json"),
          JSON.stringify({
            baseDir: relativePathAny(".", publishScript),
            publish: true,
            ...deferredPublishTask,
          })
        );
      }
      // #endregion
    })
    .example((bin) =>
      [
        `# INPUTS
  // TODO
`,
        !pubOnly &&
          `# OUTPATH
  // TODO
`,
        !pubOnly &&
          `# REMAP
  // TODO
`,
        `# TOKENFROM
  // TODO
`,
        !pubOnly &&
          `# Repack
  // TODO
`,
      ]
        .filter(Boolean)
        .join("\n")
    );
  return command;
};
