import { sliceView } from "../../nppr-core/internals/encoding";

export const BasicTarballPath = new URL("./barhop-0.0.0-PLACEHOLDER.tgz", import.meta.url).pathname;
export const ReadmeTemplate = new URL("./readme.md.tpl", import.meta.url).pathname;
// tar ztvf - | wc -l
export const BasicTarballEntryCount = 34;
const sha512 =
  "fa4c275e49e8494de8a7d9445103df5b6f22c4cd2349b514a3b8f9356f7eeba7579123abbd94290aff5b14c8124cad58d72abb6aba2a70e42fcf13a90401f0d1";
export const BasicTarballSHA512 = sliceView(Buffer.from(sha512, "hex"));
export const BasicTarballManifest = {
  name: "barhop",
  version: "0.0.0-PLACEHOLDER",
};
export const BasicTarballSubject = {
  digest: { sha512 },
  name: `pkg:npm/${BasicTarballManifest.name}@${BasicTarballManifest.version}`,
};
