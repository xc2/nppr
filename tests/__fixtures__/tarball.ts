import { sliceView } from "../../nppr-core/internals/encoding";

export const BasicTarballPath = new URL("./barhop-0.0.0-PLACEHOLDER.tgz", import.meta.url).pathname;
// tar ztvf - | wc -l
export const BasicTarballEntryCount = 33;
const sha512 =
  "3bcd3f03254f08b35927ee30271a0146bbc2977753012beebb183f27a322200bee83609721c4c628782621556acff523b47e200fea6e46f09016308ce28fc1af";
export const BasicTarballSHA512 = sliceView(Buffer.from(sha512, "hex"));
export const BasicTarballManifest = {
  name: "barhop",
  version: "0.0.0-PLACEHOLDER",
};
export const BasicTarballSubject = {
  digest: { sha512 },
  name: `pkg:npm/${BasicTarballManifest.name}@${BasicTarballManifest.version}`,
};
