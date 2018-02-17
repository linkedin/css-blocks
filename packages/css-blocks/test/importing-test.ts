import { assert } from "chai";
import * as fs from "fs";
import { IHookCallbackContext } from "mocha";
import * as path from "path";

import {
  OptionsReader,
} from "../src/OptionsReader";
import {
  filesystemImporter,
  Importer,
  PathAliasImporter,
} from "../src/importing";
import {
  CssBlockOptions,
  CssBlockOptionsReadonly,
} from "../src/options";
import {
  Syntax,
} from "../src/preprocessing";

const FIXTURES = path.resolve(__dirname, "..", "..", "test", "fixtures");
const FSI_FIXTURES = path.resolve(FIXTURES, "filesystemImporter");
const ALIAS_FIXTURES = path.resolve(FIXTURES, "pathAliasImporter");

function getOptions(options?: Partial<CssBlockOptions>): CssBlockOptionsReadonly {
  options = options || {};
  options.rootDir = path.join(FSI_FIXTURES);
  return new OptionsReader(options || {});
}

function testFSImporter(name: string, importer: Importer) {
  describe(name, () => {
    it("handles an absolute path without a from identifier", () => {
      let options = getOptions();
      let filename = path.resolve(FSI_FIXTURES, "a.block.css");
      let ident = importer.identifier(null, filename, options);
      let resolvedFilename = importer.filesystemPath(ident, options);
      assert.equal(resolvedFilename, filename);
    });
    it("handles an absolute path with a from identifier", () => {
      let options = getOptions();
      let relativeFilename = path.resolve(FSI_FIXTURES, "a.block.css");
      let filename = path.resolve(FSI_FIXTURES, "b.block.css");
      let relativeIdent = importer.identifier(null, relativeFilename, options);
      let ident = importer.identifier(relativeIdent, filename, options);
      let resolvedFilename = importer.filesystemPath(ident, options);
      assert.equal(resolvedFilename, filename);
    });
    it("handles a relative path with a from identifier", () => {
      let options = getOptions();
      let filename = path.resolve(FSI_FIXTURES, "a.block.css");
      let ident = importer.identifier(null, filename, options);
      let relativeIdent = importer.identifier(ident, "b.block.css", options);
      let resolvedFilename = importer.filesystemPath(relativeIdent, options);
      assert.equal(resolvedFilename, path.resolve(FSI_FIXTURES, "b.block.css"));
    });
    it("resolves a relative path without a from identifier against the root directory", () => {
      let options = getOptions();
      assert.equal(options.rootDir, FSI_FIXTURES);
      let ident = importer.identifier(null, "a.block.css", options);
      let resolvedFilename = importer.filesystemPath(ident, options);
      assert.equal(resolvedFilename, path.resolve(FSI_FIXTURES, "a.block.css"));
    });
    it("inspects relative to the root directory", () => {
      let options = getOptions();
      let filename = path.resolve(FSI_FIXTURES, "a.block.css");
      let ident = importer.identifier(null, filename, options);
      let inspected = importer.debugIdentifier(ident, options);
      assert.equal(inspected, "a.block.css");
    });
    it("decides syntax based on extension", () => {
      let options = getOptions();
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
      let options = getOptions();
      let ident = importer.identifier(null, "a.block.css", options);
      let importedFile = await importer.import(ident, options);
      assert.deepEqual(importedFile.contents, fs.readFileSync(path.join(FSI_FIXTURES, "a.block.css"), "utf-8"));
      assert.equal(importedFile.defaultName, "a");
      assert.equal(importedFile.identifier, ident);
      assert.equal(importedFile.syntax, Syntax.css);
    });
  });
}

testFSImporter("FilesystemImporter", filesystemImporter);
testFSImporter("Default PathAliasImporter", new PathAliasImporter({}));
testFSImporter("Configured PathAliasImporter", new PathAliasImporter({alias: ALIAS_FIXTURES}));

describe("PathAliasImporter", () => {
  before(function(this: IHookCallbackContext) {
    let aliases = {
      "pai": ALIAS_FIXTURES,
      "sub": path.resolve(ALIAS_FIXTURES, "alias_subdirectory"),
    };
    this.importer = new PathAliasImporter(aliases);
  });
  it("identifies relative to an alias", function() {
      let options = getOptions();
      let importer: Importer = this.importer;
      let ident = importer.identifier(null, "pai/alias1.block.css", options);
      let actualFilename = importer.filesystemPath(ident, options);
      let expectedFilename = path.resolve(ALIAS_FIXTURES, "alias1.block.css");
      assert.equal(expectedFilename, actualFilename);
      let inspected = importer.debugIdentifier(ident, options);
      assert.equal("pai/alias1.block.css", inspected);
  });
  it("produces the same identifier via different aliases", function() {
      let options = getOptions();
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
    let options = getOptions();
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
