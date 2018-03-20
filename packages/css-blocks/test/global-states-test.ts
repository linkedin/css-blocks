import { assert } from "chai";
import { suite, test } from "mocha-typescript";

import cssBlocks = require("../src/cssBlocks");

import { BEMProcessor } from "./util/BEMProcessor";
import { assertError } from "./util/assertError";
import { setupImporting } from "./util/setupImporting";

@suite("Resolves conflicts")
export class BlockInheritance extends BEMProcessor {
  @test "Can use global states"() {
    let { imports, config } = setupImporting();
    imports.registerSource(
      "app.block.css",
      `@block-global [state|is-loading];
       [state|is-loading] .profile {
         pointer-events: none;
       }`,
    );

    let filename = "widget.block.css";
    let inputCSS = `@block-reference app from "./app.block.css";
                    app[state|is-loading] .b {
                      border: none;
                    }`;

    return this.process(filename, inputCSS, config).then((result) => {
      imports.assertImported("app.block.css");
      assert.deepEqual(
        result.css.toString(),
        ".app--is-loading .widget__b { border: none; }\n",
      );
    });
  }
  @test "Can't use non-global states"() {
    let { imports, config } = setupImporting();
    imports.registerSource(
      "app.block.css",
      `[state|is-loading] .profile {
         pointer-events: none;
       }`,
    );

    let filename = "widget.block.css";
    let inputCSS = `@block-reference app from "./app.block.css";
                    app[state|is-loading] .b {
                      border: none;
                    }`;

    return assertError(
      cssBlocks.InvalidBlockSyntax,
      "[state|is-loading] is not global: app[state|is-loading] .b (widget.block.css:2:24)",
      this.process(filename, inputCSS, config));
  }
}
