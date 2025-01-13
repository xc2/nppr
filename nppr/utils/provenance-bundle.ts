import { readFile, writeFile } from "node:fs/promises";
import { type Manifest, toPurl } from "nppr-core";

export class ProvenanceBundle {
  protected readonly map: Map<string, any> = new Map();

  add(provenance: any) {
    const { subject } = JSON.parse(
      Buffer.from(provenance.dsseEnvelope.payload, "base64").toString("utf-8")
    );
    // TODO validate subject for NPM
    this.map.set(subject[0].name, provenance);
  }

  get(name: string | Pick<Manifest, "name" | "version">) {
    return this.map.get(typeof name === "string" ? name : toPurl(name));
  }

  async outputBundle(path: string) {
    const content = Array.from(this.map.values(), (v) => JSON.stringify(v)).join("\n");
    await writeFile(path, content);
  }
  async outputSingle(name: string | Pick<Manifest, "name" | "version">, path: string) {
    const provenance = this.get(name);
    if (!provenance) {
      const purl = typeof name === "string" ? name : toPurl(name);
      throw new Error(`Provenance not found for ${purl}`);
    }
    await writeFile(path, JSON.stringify(provenance));
  }
  static async fromFile(path: string) {
    const bundle = new ProvenanceBundle();
    const content = await readFile(path, "utf-8");
    try {
      const maybeSingle = JSON.parse(content);
      if (maybeSingle && typeof maybeSingle === "object") {
        bundle.add(maybeSingle);
      }
      return bundle;
    } catch {}
    const lines = content.split(/(\r\n|\n|\r)/g);
    for (const line of lines) {
      try {
        const provenance = JSON.parse(line);
        bundle.add(provenance);
      } catch {}
    }
    return bundle;
  }
}
