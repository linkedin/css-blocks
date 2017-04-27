//import { suite, test, slow, timeout, skip, only } from "mocha-typescript";
//declare function require(name:string):any;
import { suite, test } from "mocha-typescript";
import cssBlocks = require("../src/cssBlocks");
import { assert } from "chai";
import { PluginOptions, OptionsReader } from "../src/Options";

import * as postcss from "postcss";
import * as perfectionist from "perfectionist";

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
    let inputCSS = `:block {color: red;}`;
    return postcss([
      processor
    ]).process(inputCSS, {}).then(() => {
      assert(false, "Error was not raised.");
    }).catch((reason) => {
      assert(reason instanceof cssBlocks.CssBlockError);
      assert(reason instanceof cssBlocks.MissingSourcePath);
      assert.equal(reason.message, "PostCSS `from` option is missing. The source filename is required for CSS Blocks to work correctly.");
    });

  }
}
 
@suite("In BEM output mode")
export class BEMOutputMode {
  process(filename: string, contents: string) {
    let processOpts = { from: filename };
    let cssBlocksProcessor = cssBlocks(postcss)
    let cssBlocksOpts: PluginOptions = {
      outputMode: cssBlocks.OutputMode.BEM,
    };
    return postcss([
      cssBlocksProcessor(cssBlocksOpts),
      perfectionist({format: "compact", indentSize: 2})
    ]).process(contents, processOpts);
  }

  @test "replaces block withe the blockname from the file"() {
    let filename = "foo/bar/test-block.scss";
    let inputCSS = `:block {color: red;}`;
    return this.process(filename, inputCSS).then((result) => {
      assert.equal(
        result.css.toString(),
        ".test-block { color: red; }\n"
      );
    });
  }

  @test "handles pseudoclasses on the :block"() {
    let filename = "foo/bar/test-block-pseudos.scss";
    let inputCSS = `:block {color: #111;}
                    :block:hover { font-weight: bold; }`;
    return this.process(filename, inputCSS).then((result) => {
      assert.equal(
        result.css.toString(),
        ".test-block-pseudos { color: #111; }\n" +
        ".test-block-pseudos:hover { font-weight: bold; }\n"
      );
    });
  }

  @test "handles :states"() {
    let filename = "foo/bar/test-state.scss";
    let inputCSS = `:block {color: #111;}
                    :state(big) { transform: scale(2); }`;
    return this.process(filename, inputCSS).then((result) => {
      assert.equal(
        result.css.toString(),
        ".test-state { color: #111; }\n" +
        ".test-state--big { transform: scale( 2 ); }\n"
      );
    });
  }

  @test "handles comma-delimited :states"() {
    let filename = "foo/bar/test-state.scss";
    let inputCSS = `:state(big), :state(really-big) { transform: scale(2); }`;
    return this.process(filename, inputCSS).then((result) => {
      assert.equal(
        result.css.toString(),
        ".test-state--big, .test-state--really-big { transform: scale( 2 ); }\n"
      );
    });
  }

  @test "a state can be combined with itself"() {
    let filename = "foo/bar/self-combinator.scss";
    let inputCSS = `:state(big) + :state(big)::after { content: "" }`;
    return this.process(filename, inputCSS).then((result) => {
      assert.equal(
        result.css.toString(),
        ".self-combinator--big + .self-combinator--big::after { content: \"\"; }\n"
      );
    });
  }

  @test "handles invalid :states"() {
    let filename = "foo/bar/test-state.scss";
    let inputCSS = `:block {color: #111;}
                    :state() { transform: scale(2); }`;
    return this.process(filename, inputCSS).then(() => {
      assert(false, "Error was not raised.");
    }).catch((reason) => {
      assert(reason instanceof cssBlocks.CssBlockError);
      assert(reason instanceof cssBlocks.InvalidBlockSyntax);
      assert.equal(reason.message, "Invalid state declaration: :state() (foo/bar/test-state.scss:2:21)");
    });
  }

  @test "cannot combine two different :states"() {
    let filename = "foo/bar/illegal-state-combinator.scss";
    let inputCSS = `:state(a) :state(b) { float: left; }`;
    return this.process(filename, inputCSS).then(() => {
      assert(false, "Error was not raised.");
    }).catch((reason) => {
      assert(reason instanceof cssBlocks.CssBlockError);
      assert(reason instanceof cssBlocks.InvalidBlockSyntax);
      assert.equal(reason.message, "Distinct states cannot be combined: :state(a) :state(b) (foo/bar/illegal-state-combinator.scss:1:1)");
    });
  }
}
