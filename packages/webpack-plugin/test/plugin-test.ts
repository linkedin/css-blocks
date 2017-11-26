import * as glob from "glob";
import * as path from "path";
import * as fs from "fs";
import { suite, test, skip } from "mocha-typescript";
import execTest, { runWebpackAsPromise, readCss, readBundle, readAsset, readCssSourceMap } from "./util/execTest";
import { DIST_DIRECTORY, BLOCK_FIXTURES_DIRECTORY} from "./util/testPaths";
import { config as extractTextConfig } from "./configs/extractTextConfig";
import { config as templateConfig } from "./configs/templateConfig";
import { assert } from "chai";

// import assertError from "./util/assertError";
// import { MockImportRegistry } from "./util/MockImportRegistry";

@suite("Plugin")
export class PluginTest {
  eachOutputFile(callback: (f:string) => void) {
    let globPattern = path.join(DIST_DIRECTORY, 'test_output', "**", "*");
    glob.sync(globPattern).forEach((f) => {
      callback(f);
    });
  }

  before() {
    this.eachOutputFile((f) => {
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
  @test "works with ExtractTextPlugin and interoperableCSS"() {
    let entry = path.join(BLOCK_FIXTURES_DIRECTORY, "interoperable.block.css");
    return runWebpackAsPromise(extractTextConfig(entry, {interoperableCSS: true})).then(() => {
      const cssFile = path.resolve(DIST_DIRECTORY, 'test_output', 'main.14bcc09d3040794ae803e076f3612b6e.css');
      assert.deepEqual(readCss("interoperable.extractText"), fs.readFileSync(cssFile).toString());
      let bundle = readBundle("bundle.extractText.js");
      assert.equal(bundle.root, "interoperable");
      assert.equal(bundle.t, "interoperable--t");
      assert.equal(bundle["class"], "interoperable__class");
      assert.equal(bundle["class--s"], "interoperable__class--s");
    });
  }

  @test "integrates with templates"() {
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
  @skip
  @test "figure out why the paths in sourcemap sources are wrong in prev test."(){
    // there's an extra directory 'test/' in the paths.
  }
}
