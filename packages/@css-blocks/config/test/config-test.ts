import { OutputMode } from "@css-blocks/core";
import assert = require("assert");
import path = require("path");
import { chdir, cwd } from "process";

import { load, search } from "../src";

function fixture(...relativePathSegments: Array<string>): string {
  return path.resolve(__dirname, "..", "..", "test", "fixtures", ...relativePathSegments);
}

const WORKING_DIR = cwd();

describe("validate", () => {
  afterEach(() => {
    chdir(WORKING_DIR);
  });
  it("can load configuration from the package.json in the current working directory", async () => {
    chdir(fixture("from-pkg-json"));
    let options = await search();
    if (options === null) {
      assert.fail("configuration wasn't found.");
    } else {
      assert.equal(options.outputMode, OutputMode.BEM);
    }
  });
  it("can load configuration from the package.json in a specified directory", async () => {
    let options = await search(fixture("from-pkg-json"));
    if (options === null) {
      assert.fail("configuration wasn't found.");
    } else {
      assert.equal(options.outputMode, OutputMode.BEM);
    }
  });
  it("will load configuration from the first package.json in ancestor directory", async () => {
    let options = await search(fixture("from-pkg-json", "subdir", "another-subdir"));
    if (options === null) {
      assert.fail("configuration wasn't found.");
    } else {
      assert.equal(options.outputMode, OutputMode.BEM);
    }
  });
  it("loads preprocessors if a file is specified.", async () => {
    let options = await search(fixture("from-pkg-json"));
    if (options === null) {
      assert.fail("configuration wasn't found.");
    } else {
      assert.equal(options.preprocessors && typeof options.preprocessors.scss, "function");
    }
  });
  it("can load configuration from css-blocks.config.json in the current working directory", async () => {
    chdir(fixture("from-json-file"));
    let options = await search();
    if (options === null) {
      assert.fail("configuration wasn't found.");
    } else {
      assert.equal(options.outputMode, OutputMode.BEM_UNIQUE);
    }
  });
  it("can load configuration from css-blocks.config.json in a specified directory", async () => {
    let options = await search(fixture("from-json-file"));
    if (options === null) {
      assert.fail("configuration wasn't found.");
    } else {
      assert.equal(options.outputMode, OutputMode.BEM_UNIQUE);
    }
  });
  it("will load configuration from css-blocks.config.json in an ancestor directory", async () => {
    let options = await search(fixture("from-json-file", "subdir", "another-subdir"));
    if (options === null) {
      assert.fail("configuration wasn't found.");
    } else {
      assert.equal(options.outputMode, OutputMode.BEM_UNIQUE);
      assert.equal(options.rootDir, fixture("from-json-file"));
    }
  });
  it("can extend configuration from another location", async () => {
    let options = await search(fixture("from-json-file"));
    if (options === null) {
      assert.fail("configuration wasn't found.");
    } else {
      assert.equal(options.preprocessors && typeof options.preprocessors.scss, "function");
      assert.equal(options.preprocessors && typeof options.preprocessors.less, "function");
    }
  });
  it("can specify a file containing an importer", async () => {
    let options = await search(fixture("from-json-file"));
    if (options === null) {
      assert.fail("configuration wasn't found.");
    } else {
      assert.equal(options.importer && typeof options.importer, "object");
      assert.equal(options.importerData && Array.isArray(options.importerData), true);
    }
  });
  it("can load configuration from css-blocks.config.js in the current working directory", async () => {
    chdir(fixture("from-js-file"));
    let options = await search();
    if (options === null) {
      assert.fail("configuration wasn't found.");
    } else {
      assert.equal(options.outputMode, OutputMode.BEM);
      assert.equal(options.maxConcurrentCompiles, 8);
      assert.equal(options.rootDir, fixture("from-js-file", "blocks"));
      assert.equal(options.preprocessors && typeof options.preprocessors.scss, "function");
      assert.equal(options.preprocessors && typeof options.preprocessors.styl, "function");
    }
  });
  it("rootDir is not overridden if specified explicitly", async () => {
    chdir(fixture("another-js-file"));
    let options = await search();
    if (options === null) {
      assert.fail("configuration wasn't found.");
    } else {
      assert.equal(options.outputMode, OutputMode.BEM);
      assert.equal(options.maxConcurrentCompiles, 8);
      assert.equal(options.rootDir, fixture("from-js-file", "blocks"));
      assert.equal(options.preprocessors && typeof options.preprocessors.scss, "function");
      assert.equal(options.preprocessors && typeof options.preprocessors.styl, "function");
    }
  });
  it("can load a config file from an explicit path.", async () => {
    let options = await load(fixture("another-js-file", "css-blocks.config.js"));
    if (options === null) {
      assert.fail("configuration wasn't found.");
    } else {
      assert.equal(options.outputMode, OutputMode.BEM);
      assert.equal(options.maxConcurrentCompiles, 8);
      assert.equal(options.rootDir, fixture("from-js-file", "blocks"));
      assert.equal(options.preprocessors && typeof options.preprocessors.scss, "function");
      assert.equal(options.preprocessors && typeof options.preprocessors.styl, "function");
    }
  });
});
