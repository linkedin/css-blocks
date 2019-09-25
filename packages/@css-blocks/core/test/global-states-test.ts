import { assert } from "chai";
import { suite, test } from "mocha-typescript";

import { assertError } from "./util/assertError";
import { BEMProcessor } from "./util/BEMProcessor";
import cssBlocks = require("./util/postcss-helper");
import { setupImporting } from "./util/setupImporting";

@suite("Resolves conflicts")
export class BlockInheritance extends BEMProcessor {
  @test "Can use global states"() {
    let { imports, config } = setupImporting();
    imports.registerSource(
      "app.block.css",
      `@block-global [state|is-loading];
       :scope[state|is-loading] .profile {
         pointer-events: none;
       }`,
    );

    let filename = "widget.block.css";
    let inputCSS = `@block app from "./app.block.css";
                    app[state|is-loading] :scope {
                      border: none;
                    }
                    app[state|is-loading] .b {
                      border: none;
                    }`;

    return this.process(filename, inputCSS, config).then((result) => {
      imports.assertImported("app.block.css");
      assert.deepEqual(
        result.css.toString(),
        ".app--is-loading .widget { border: none; }\n" +
        ".app--is-loading .widget__b { border: none; }\n",
      );
    });
  }
  @test "Global state usage must specify a global state, not just a block name."() {
    let { imports, config } = setupImporting();
    imports.registerSource(
      "app.block.css",
      `@block-global [state|is-loading];
       :scope[state|is-loading] .profile {
         pointer-events: none;
       }`,
    );

    let filename = "widget.block.css";
    let inputCSS = `@block app from "./app.block.css";
                    app .b {
                      border: none;
                    }`;

    return assertError(
      cssBlocks.InvalidBlockSyntax,
      "Missing global state selector on external Block 'app'. Did you mean one of: :scope[state|is-loading] (widget.block.css:2:21)",
      this.process(filename, inputCSS, config));
  }
  @test "External block error has better error if mis-used but has no global states."() {
    let { imports, config } = setupImporting();
    imports.registerSource(
      "app.block.css",
      `:scope[state|is-loading] .profile {
         pointer-events: none;
       }`,
    );

    let filename = "widget.block.css";
    let inputCSS = `@block app from "./app.block.css";
                    app .b {
                      border: none;
                    }`;

    return assertError(
      cssBlocks.InvalidBlockSyntax,
      "External Block 'app' has no global states. (widget.block.css:2:21)",
      this.process(filename, inputCSS, config));
  }
  @test "Can't use non-global states"() {
    let { imports, config } = setupImporting();
    imports.registerSource(
      "app.block.css",
      `:scope[state|is-loading] .profile {
         pointer-events: none;
       }`,
    );

    let filename = "widget.block.css";
    let inputCSS = `@block app from "./app.block.css";
                    app[state|is-loading] .b {
                      border: none;
                    }`;

    return assertError(
      cssBlocks.InvalidBlockSyntax,
      "[state|is-loading] is not global: app[state|is-loading] .b (widget.block.css:2:24)",
      this.process(filename, inputCSS, config));
  }
}
