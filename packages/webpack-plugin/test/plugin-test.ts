import { assert } from "chai";
import * as fs from "fs";
import * as glob from "glob";
import { skip, suite, test } from "mocha-typescript";
import * as path from "path";

import { config as extractTextConfig } from "./configs/extractTextConfig";
import { config as templateConfig } from "./configs/templateConfig";
import { execTest, readAsset, readCss, readCssSourceMap, runWebpackAsPromise } from "./util/execTest";
import { BLOCK_FIXTURES_DIRECTORY, DIST_DIRECTORY } from "./util/testPaths";

// The loader no longer works standalone like this. We need a better way to
// run this type of test suite.
@suite("Plugin")
export class PluginTest {
  eachOutputFile(callback: (f: string) => void) {
    let globPattern = path.join(DIST_DIRECTORY, "test_output", "**", "*");
    glob.sync(globPattern).forEach((f) => {
      callback(f);
    });
  }

  before() {
    this.eachOutputFile((f) => {
      fs.unlinkSync(f);
    });
  }

  @skip @test "compiles a css block"() {
    return execTest("hello");
  }

  @skip @test "compiles a css block with a reference"() {
    return execTest("has-reference");
  }

  @skip @test "works with ExtractTextPlugin"() {
    let entry = path.join(BLOCK_FIXTURES_DIRECTORY, "hello.block.css");
    return runWebpackAsPromise(extractTextConfig(entry)).then(() => {
      const cssFile = path.resolve(DIST_DIRECTORY, "test_output", "main.b815aed0afb162dc9e5f905d0aa9de7e.css");
      assert.deepEqual(readCss("hello"), fs.readFileSync(cssFile).toString());
    });
  }

  @skip @test "integrates with templates"() {
    return templateConfig().then(config => {
      return runWebpackAsPromise(config).then(() => {
        const actualCss = readAsset("css-blocks.css");
        const expectedCss = readCss("concat.template");
        assert.deepEqual(actualCss, expectedCss);
        const actualMap = JSON.parse(readAsset("css-blocks.css.map"));
        const expectedMap = readCssSourceMap("concat.template");
        assert.deepEqual(actualMap, expectedMap);
      });
    });
  }
  @skip @test "figure out why the paths in sourcemap sources are wrong in prev test."() {
    // there's an extra directory 'test/' in the paths.
  }
}
