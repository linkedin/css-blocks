import * as glob from "glob";
import * as path from "path";
import * as fs from "fs";
import { suite, test, skip } from "mocha-typescript";
import execTest, { runWebpackAsPromise, readCss } from "./util/execTest";
import { DIST_DIRECTORY, BLOCK_FIXTURES_DIRECTORY} from "./util/testPaths";
import { config as extractTextConfig } from "./configs/extractTextConfig";
import { assert } from "chai";

// import assertError from "./util/assertError";
// import { MockImportRegistry } from "./util/MockImportRegistry";

@suite("Plugin")
export class PluginTest {
  before() {
    let globPattern = path.join(DIST_DIRECTORY, 'test_output', "**", "*");
    glob.sync(globPattern).forEach((f) => {
      fs.unlinkSync(f);
    });
  }

  @skip
  @test "skipped on purpose"() {
  }

  @test "compiles a css block"() {
    return execTest("hello");
  }

  @test "compiles a css block with a reference"() {
    return execTest("has-reference");
  }

  @test "compiles with interoperableCSS support"() {
    return execTest("interoperable", {interoperableCSS: true});
  }

  @test "works with ExtractTextPlugin"() {
    let entry = path.join(BLOCK_FIXTURES_DIRECTORY, "hello.block.css");
    return runWebpackAsPromise(extractTextConfig(entry)).then(() => {
      const cssFile = path.resolve(DIST_DIRECTORY, 'test_output', 'main.b815aed0afb162dc9e5f905d0aa9de7e.css');
      assert.deepEqual(readCss("hello"), fs.readFileSync(cssFile).toString());
    });
  }
}
