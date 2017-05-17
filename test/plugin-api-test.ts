import { assert } from "chai";
import { suite, test } from "mocha-typescript";
import * as postcss from "postcss";

import cssBlocks = require("../src/cssBlocks");
import { OptionsReader } from "../src/Options";

@suite("Setting up")
export class SetupTests {
  @test "options are optional"() {
    let cssBlocksPlugin = cssBlocks(postcss);
    let processor = cssBlocksPlugin();
    assert(processor);
  }
  @test "default options"() {
    const reader = new OptionsReader({});
    assert.equal(reader.outputMode, cssBlocks.OutputMode.BEM);
    assert.equal(reader.outputModeName, "BEM");
  }
  @test "a filename is required"() {
    let cssBlocksPlugin = cssBlocks(postcss);
    let processor = cssBlocksPlugin();
    let inputCSS = `.root {color: red;}`;
    return postcss([
      processor
    ]).process(inputCSS, {}).then(() => {
      assert(false, "Error was not raised.");
    }).catch((reason: Error) => {
      assert(reason instanceof cssBlocks.CssBlockError);
      assert(reason instanceof cssBlocks.MissingSourcePath);
      assert.equal(reason.message, "PostCSS `from` option is missing. The source filename is required for CSS Blocks to work correctly.");
    });
  }
}


