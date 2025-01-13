import { createWriteStream } from "node:fs";
import * as NodePath from "node:path";
import { Writable } from "node:stream";
import { type Manifest, getManifest, inlineTemplate, inputSource, tryToNumber } from "nppr-core";

export function pathInfo(path: string, cwd: string) {
  const abs = NodePath.resolve(cwd, path);
  const rel = NodePath.relative(cwd, abs);
  let ext = NodePath.extname(abs);
  let base = NodePath.basename(abs, ext);
  if (NodePath.extname(base) === ".tar") {
    ext = ".tar" + ext;
    base = NodePath.basename(base, ext);
  }
  return { fullpath: abs, path: NodePath.dirname(rel), extname: ext, basename: base };
}

export function packageName(name: string) {
  if (name.startsWith("@")) {
    const [scope, unscoped] = name.slice(1).split("/");
    return { scope, unscoped, pathPart: `${scope}-${unscoped}` };
  }
  return { scope: "", unscoped: name, pathPart: name };
}

export class Package {
  public readonly input: string | number;
  public readonly pathInfo?: ReturnType<typeof pathInfo>;
  protected _source?: ReadableStream;
  protected _manifest?: Promise<Manifest>;

  constructor(
    input: string | number,
    public readonly cwd = process.cwd()
  ) {
    const p = tryToNumber(input);
    if (typeof p === "string") {
      this.pathInfo = pathInfo(p, this.cwd);
      this.input = this.pathInfo.fullpath;
    } else {
      this.input = p;
    }
  }

  tee() {
    const [a, b] = this.source.tee();
    this._source = a;
    return b;
  }

  get source() {
    this._source = this._source ?? inputSource(this.input);
    return this._source;
  }

  set source(source: ReadableStream) {
    if (this._source !== source) {
      this._source = source;
      this._manifest = undefined;
    }
  }

  get manifest() {
    try {
      this._manifest = this._manifest || getManifest(this.tee());
      return this._manifest;
    } catch (e) {
      return Promise.reject(e);
    }
  }

  async output(p?: string) {
    const outputPath = await this.getOutputPath(p);
    return this.tee().pipeTo(Writable.toWeb(createWriteStream(outputPath)));
  }

  // TODO: move along and add tests
  async getOutputPath(p: string = "[path]/[name]-[version][extname]") {
    const manifest = await this.manifest;
    const name = packageName(manifest.name);
    const variables = {
      ...manifest,
      scope: name.scope,
      unscoped: name.unscoped,
      fullpath: this.pathInfo?.fullpath ?? "",
      path: this.pathInfo?.path ?? "",
      extname: this.pathInfo?.extname ?? ".tgz",
      basename: this.pathInfo?.basename ?? `${name.pathPart}-${manifest.version}`,
    };
    const _escape = (value: any, key: string) => {
      if (key === "name") {
        return packageName(value).pathPart;
      }
      return `${value}`.replace(/[^0-9a-zA-Z-._]/g, "_");
    };
    return NodePath.resolve(this.cwd, inlineTemplate(p, { escape: _escape })(variables));
  }
}
