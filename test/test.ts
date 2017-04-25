//import { suite, test, slow, timeout, skip, only } from "mocha-typescript";
declare function require(name:string):any;
import { suite, test } from "mocha-typescript";
import { default as cssBlocksInitializer, api as cssBlocks } from "../src/css-blocks";
import { assert } from "chai";

import * as postcss from "postcss";
 
@suite("In BEM output mode")
class BEMOutputMode {
  @test "replaces :block with the name of the block from filename"() {
    let cssBlocksProcessor = cssBlocksInitializer(postcss)
    let cssBlocksOpts: cssBlocks.PluginOptions = {
      outputMode: cssBlocks.OutputMode.BEM,
    };
    let processOpts = { from: "foo/bar/test-1.scss" };
    return postcss(cssBlocksProcessor(cssBlocksOpts)).process(":block { color: red; }", processOpts).then((result) => {
      assert.equal(result.css.toString(), ".test-1 { color: red; }");
    });
  }
}
