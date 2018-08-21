import { assert } from "chai";
import * as fs from "fs";
import { IHookCallbackContext } from "mocha";
import * as path from "path";

import { Syntax } from "../src/BlockParser";
import {
  Options,
  ResolvedConfiguration,
  resolveConfiguration,
} from "../src/configuration";
import {
  Importer,
  NodeJsImporter,
  defaultImporter,
} from "../src/importing";

const FIXTURES = path.resolve(__dirname, "..", "..", "test", "fixtures");
const FSI_FIXTURES = path.join(FIXTURES, "filesystemImporter");
const ALIAS_FIXTURES = path.join(FIXTURES, "pathAliasImporter");
const NODE_MODULE_FIXTURES = path.join(FIXTURES, "nodeModuleImporter");

function getConfiguration(rootDir: string, options?: Options): ResolvedConfiguration {
  return resolveConfiguration(options, { rootDir });
}

function testFSImporter(name: string, importer: Importer) {
  describe(name, () => {
    it("handles an absolute path without a from identifier", () => {
      let config = getConfiguration(FSI_FIXTURES);
      let filename = path.resolve(FSI_FIXTURES, "a.block.css");
      let ident = importer.identifier(null, filename, config);
      let resolvedFilename = importer.filesystemPath(ident, config);
      assert.equal(resolvedFilename, filename);
    });
    it("handles an absolute path with a from identifier", () => {
      let config = getConfiguration(FSI_FIXTURES);
      let relativeFilename = path.resolve(FSI_FIXTURES, "a.block.css");
      let filename = path.resolve(FSI_FIXTURES, "b.block.css");
      let relativeIdent = importer.identifier(null, relativeFilename, config);
      let ident = importer.identifier(relativeIdent, filename, config);
      let resolvedFilename = importer.filesystemPath(ident, config);
      assert.equal(resolvedFilename, filename);
    });
    it("handles a relative path with a from identifier", () => {
      let options = getConfiguration(FSI_FIXTURES);
      let filename = path.resolve(FSI_FIXTURES, "a.block.css");
      let ident = importer.identifier(null, filename, options);
      let relativeIdent = importer.identifier(ident, "b.block.css", options);
      let resolvedFilename = importer.filesystemPath(relativeIdent, options);
      assert.equal(resolvedFilename, path.resolve(FSI_FIXTURES, "b.block.css"));
    });
    it("resolves a relative path without a from identifier against the root directory", () => {
      let options = getConfiguration(FSI_FIXTURES);
      assert.equal(options.rootDir, FSI_FIXTURES);
      let ident = importer.identifier(null, "a.block.css", options);
      let resolvedFilename = importer.filesystemPath(ident, options);
      assert.equal(resolvedFilename, path.resolve(FSI_FIXTURES, "a.block.css"));
    });
    it("inspects relative to the root directory", () => {
      let options = getConfiguration(FSI_FIXTURES);
      let filename = path.resolve(FSI_FIXTURES, "a.block.css");
      let ident = importer.identifier(null, filename, options);
      let inspected = importer.debugIdentifier(ident, options);
      assert.equal(inspected, "a.block.css");
    });
    it("decides syntax based on extension", () => {
      let options = getConfiguration(FSI_FIXTURES);
      let cssIdent = importer.identifier(null, "a.block.css", options);
      assert.equal(importer.syntax(cssIdent, options), Syntax.css);
      let scssIdent = importer.identifier(null, "scss.block.scss", options);
      assert.equal(importer.syntax(scssIdent, options), Syntax.scss);
      let sassIdent = importer.identifier(null, "sass.block.sass", options);
      assert.equal(importer.syntax(sassIdent, options), Syntax.sass);
      let lessIdent = importer.identifier(null, "less.block.less", options);
      assert.equal(importer.syntax(lessIdent, options), Syntax.less);
      let stylusIdent = importer.identifier(null, "stylus.block.styl", options);
      assert.equal(importer.syntax(stylusIdent, options), Syntax.stylus);
      let otherIdent = importer.identifier(null, "other.block.asdf", options);
      assert.equal(importer.syntax(otherIdent, options), Syntax.other);
    });
    it("imports a file", async () => {
      let options = getConfiguration(FSI_FIXTURES);
      let ident = importer.identifier(null, "a.block.css", options);
      let importedFile = await importer.import(ident, options);
      assert.deepEqual(importedFile.contents, fs.readFileSync(path.join(FSI_FIXTURES, "a.block.css"), "utf-8"));
      assert.equal(importedFile.defaultName, "a");
      assert.equal(importedFile.identifier, ident);
      assert.equal(importedFile.syntax, Syntax.css);
    });
  });
}

testFSImporter("FilesystemImporter", defaultImporter);
testFSImporter("Default PathAliasImporter", new NodeJsImporter({}));
testFSImporter("Configured PathAliasImporter", new NodeJsImporter({alias: ALIAS_FIXTURES}));

describe("Node Module Importer", () => {
  before(function(this: IHookCallbackContext) {
    this.importer = new NodeJsImporter();
    this.config = getConfiguration(NODE_MODULE_FIXTURES);
  });
  it("handles un-scoped packages' fully qualified paths", function() {
    let filename = "package/blocks/styles.block.css";
    let ident = this.importer.identifier(null, filename, this.config);
    let resolvedFilename = this.importer.filesystemPath(ident, this.config);
    assert.equal(ident, path.join(NODE_MODULE_FIXTURES, "node_modules", filename));
    assert.equal(resolvedFilename, path.join(NODE_MODULE_FIXTURES, "node_modules", filename));
  });
  it("handles scoped packages' fully qualified paths", function() {
    let filename = "@scoped/package/blocks/styles.block.css";
    let ident = this.importer.identifier(null, filename, this.config);
    let resolvedFilename = this.importer.filesystemPath(ident, this.config);
    assert.equal(ident, path.join(NODE_MODULE_FIXTURES, "node_modules", filename));
    assert.equal(resolvedFilename, path.join(NODE_MODULE_FIXTURES, "node_modules", filename));
  });
  it("gracefully degrades back to relative lookup for undiscoverable fully qualified paths", function() {
    let filename = "@scoped/package/blocks/not-here.block.css";
    let ident = this.importer.identifier(null, filename, this.config);
    let resolvedFilename = this.importer.filesystemPath(ident, this.config);
    assert.equal(ident, path.join(NODE_MODULE_FIXTURES, filename));
    assert.equal(resolvedFilename, null);
  });
});

describe("PathAliasImporter", () => {
  before(function(this: IHookCallbackContext) {
    let aliases = {
      "pai": ALIAS_FIXTURES,
      "sub": path.resolve(ALIAS_FIXTURES, "alias_subdirectory"),
    };
    this.importer = new NodeJsImporter(aliases);
  });
  it("identifies relative to an alias", function() {
      let options = getConfiguration(FSI_FIXTURES);
      let importer: Importer = this.importer;
      let ident = importer.identifier(null, "pai/alias1.block.css", options);
      let actualFilename = importer.filesystemPath(ident, options);
      let expectedFilename = path.resolve(ALIAS_FIXTURES, "alias1.block.css");
      assert.equal(expectedFilename, actualFilename);
      let inspected = importer.debugIdentifier(ident, options);
      assert.equal("pai/alias1.block.css", inspected);
  });
  it("produces the same identifier via different aliases", function() {
      let options = getConfiguration(FSI_FIXTURES);
      let importer: Importer = this.importer;
      let actualFilename = path.resolve(ALIAS_FIXTURES, "alias_subdirectory", "sub.block.css");
      let ident1 = importer.identifier(null, "pai/alias_subdirectory/sub.block.css", options);
      let ident2 = importer.identifier(null, "sub/sub.block.css", options);
      assert.deepEqual(ident1, ident2);
      let filename1 = importer.filesystemPath(ident1, options);
      assert.equal(actualFilename, filename1);
      let filename2 = importer.filesystemPath(ident2, options);
      assert.equal(actualFilename, filename2);
      let inspected1 = importer.debugIdentifier(ident1, options);
      assert.equal(inspected1, "sub/sub.block.css");
      let inspected2 = importer.debugIdentifier(ident2, options);
      assert.equal(inspected2, "sub/sub.block.css");
  });
  it("imports an aliased file", async function() {
    let options = getConfiguration(FSI_FIXTURES);
    let importer: Importer = this.importer;
    let ident = importer.identifier(null, "sub/sub.block.css", options);
    let importedFile = await importer.import(ident, options);
    let expectedContents = fs.readFileSync(path.join(ALIAS_FIXTURES, "alias_subdirectory", "sub.block.css"), "utf-8");
    assert.deepEqual(importedFile.contents, expectedContents);
    assert.equal(importedFile.defaultName, "sub");
    assert.equal(importedFile.identifier, ident);
    assert.equal(importedFile.syntax, Syntax.css);
  });
});
