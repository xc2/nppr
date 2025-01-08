import { createWriteStream } from "node:fs";
import * as NodePath from "node:path";
import { Writable } from "node:stream";
import { type Manifest, getManifest, inputSource, renderTpl, tryToNumber } from "nppr-core";

function pathInfo(path: string, cwd: string) {
  const abs = NodePath.resolve(cwd, path);
  const rel = NodePath.relative(cwd, abs);
  let ext = NodePath.extname(abs);
  let base = NodePath.basename(abs, ext);
  if (NodePath.extname(base) === ".tar") {
    ext = ".tar" + ext;
    base = NodePath.basename(base, ext);
  }
  return { fullpath: abs, dirname: rel, extname: ext, basename: base };
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

  async getOutputPath(p: string = "[dirname]/[name]-[version][extname]") {
    const manifest = await this.manifest;
    const variables = {
      ...manifest,
      dirname: this.pathInfo?.dirname ?? "",
      extname: this.pathInfo?.extname ?? ".tgz",
      basename: this.pathInfo?.basename ?? `${manifest.name}-${manifest.version}`,
    };
    return NodePath.resolve(this.cwd, renderTpl(p, variables));
  }
}
