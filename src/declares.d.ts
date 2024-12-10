declare module "libnpmpublish" {
  import type { PackageJSON } from "@npm/types";
  import fetch = require("npm-registry-fetch");
  interface PublishOptions extends fetch.Options {
    defaultTag?: string;
    access?: string;
    provenance?: boolean;
    provenanceFile?: string;
    npmVersion?: string;
    algorithms?: string[];
  }

  function publish(
    manifest: PackageJSON,
    tarballData: Buffer,
    options?: PublishOptions
  ): Promise<Response>;

  function unpublish(spec: string | object, options?: fetch.Options): Promise<boolean>;
}
