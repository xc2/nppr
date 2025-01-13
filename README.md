> [!WARNING]
> WIP

## What's this?

This project aims to make these flows work:

### 1. Build once, distribute everywhere:

Build once: First you will build your library, and run `npm pack` to create a tarball once.

Distribute everywhere: `nppr --repack` will help you transform the tarball into a new one with a modified `package.json`.

This is useful if you want to distribute the same package:

- to different platforms (e.g. npm, github packages, github releases, etc.)
- with different names (e.g. first @canary-x scoped packages, then promote to unscoped packages)
- with different version

### 2. Generate the provenance and attest it - without publishing the package

You can generate the provenance of the tarball and attest it with `nppr --provenance`.

This usually happens in the CI/CD pipeline.

This also supports multiple packages in single provenance file. (Not tested yet)

### 3. Publishing the package with provenance anywhere

So you could publish the package anywhere you want **without losing the provenance attached**.

Such as: outside CI/CD, private platform inside an organization, private CI/CD pipelines

### 4. Publishing to npm with condensed manifest without modifying `package.json`

This helps make package spec (`https://<registry>/<package>`) as small as possible without the need to modify `package.json` in build phase.

### 5. Repack/Attest/Publishing multiple packages at once

Multiple tarballs are supported as inputs.


## Project Status

### nppr-core - Core APIs

- [x] feat: repack
- [x] feat: provenance
- [x] feat: publish
- [x] tests
- [ ] release
- [ ] docs

### nppr - Node.js CLI

- [x] feat: repack
- [x] feat: provenance
- [x] feat: publish
- [x] tests
- [ ] release
- [ ] docs
