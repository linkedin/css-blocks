import { assert } from "chai";
import { suite, test } from "mocha-typescript";

import { assertError, assertMultipleErrors } from "./util/assertError";
import { BEMProcessor } from "./util/BEMProcessor";
import cssBlocks = require("./util/postcss-helper");
import { setupImporting } from "./util/setupImporting";

@suite("Resolves conflicts")
export class BlockInheritance extends BEMProcessor {
  @test "Can use global states"() {
    let { imports, config } = setupImporting();
    imports.registerSource(
      "app.block.css",
      `@block-global [is-loading];
       :scope[is-loading] .profile {
         pointer-events: none;
       }`,
    );

    let filename = "widget.block.css";
    let inputCSS = `@block app from "./app.block.css";
                    :scope[app|is-loading] :scope {
                      border: none;
                    }
                    :scope[app|is-loading] .b {
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
  @test "External block error has better error if mis-used but has no global states."() {
    let { imports, config } = setupImporting();
    imports.registerSource(
      "app.block.css",
      `:scope[is-loading] .profile {
         pointer-events: none;
       }`,
    );

    let filename = "widget.block.css";
    let inputCSS = `@block app from "./app.block.css";
                    :scope[app|is-not-loading] .b {
                      border: none;
                    }`;

    return assertMultipleErrors(
      [{
        type: cssBlocks.InvalidBlockSyntax,
        message: "External Block 'app' has no global states. (widget.block.css:2:21)",
      },
       {
          type: cssBlocks.InvalidBlockSyntax,
          message: "No state [app|is-not-loading] found in : :scope[app|is-not-loading] .b (widget.block.css:2:27)",
      }],
      this.process(filename, inputCSS, config));
  }
  @test "Can't use non-global states"() {
    let { imports, config } = setupImporting();
    imports.registerSource(
      "app.block.css",
      `@block-global [modal-visible];
       :scope[is-loading] .profile {
         pointer-events: none;
       }
       :scope[modal-visible] {
         background-color: gray;
       }`,
    );

    let filename = "widget.block.css";
    let inputCSS = `@block app from "./app.block.css";
                    :scope[app|is-loading] .b {
                      border: none;
                    }`;

    return assertError(
      cssBlocks.InvalidBlockSyntax,
      "[app|is-loading] is not global: :scope[app|is-loading] .b (widget.block.css:2:27)",
      this.process(filename, inputCSS, config));
  }
}
