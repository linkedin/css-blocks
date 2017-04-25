//import { suite, test, slow, timeout, skip, only } from "mocha-typescript";
declare function require(name:string):any;
import { suite, test } from "mocha-typescript";
import { default as cssBlocksInitializer, api as cssBlocks } from "../src/css-blocks";
import { assert } from "chai";

import * as postcss from "postcss";
import * as perfectionist from "perfectionist";
 
@suite("In BEM output mode")
class BEMOutputMode {
  process(filename: string, contents: string) {
    let processOpts = { from: filename };
    let cssBlocksProcessor = cssBlocksInitializer(postcss)
    let cssBlocksOpts: cssBlocks.PluginOptions = {
      outputMode: cssBlocks.OutputMode.BEM,
    };
    return postcss([
      cssBlocksProcessor(cssBlocksOpts),
      perfectionist({format: "compact", indentSize: 2})
    ]).process(contents, processOpts);
  }

  @test "replaces block withe the blockname from the file"() {
    let filename = "foo/bar/test-1.scss";
    let inputCSS = `:block {color: red;}`;
    return this.process(filename, inputCSS).then((result) => {
      assert.equal(
        result.css.toString(),
        ".test-1 { color: red; }\n"
      );
    });
  }

  @test "handles pseudoclasses on the :block"() {
    let filename = "foo/bar/test-2.scss";
    let inputCSS = `:block {color: #111;}
                    :block:hover { font-weight: bold; }`;
    return this.process(filename, inputCSS).then((result) => {
      assert.equal(
        result.css.toString(),
        ".test-2 { color: #111; }\n" +
        ".test-2:hover { font-weight: bold; }\n"
      );
    });
  }
}
