import type { TarOptions } from "./tar";

export const PackagePackOptions = {
  gzip: { level: 9 },
  portable: true,
} satisfies TarOptions;
