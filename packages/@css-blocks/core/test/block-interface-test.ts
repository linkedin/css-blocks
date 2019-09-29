import { assert } from "chai";
import { suite, test } from "mocha-typescript";
import { postcss } from "opticss";

import { BEMProcessor } from "./util/BEMProcessor";
import cssBlocks = require("./util/postcss-helper");
import { setupImporting } from "./util/setupImporting";

@suite("Block Interfaces")
export class BlockInterfaceTests extends BEMProcessor {
  assertError(errorType: typeof cssBlocks.CssBlockError, message: string, promise: postcss.LazyResult | Promise<postcss.Result>) {
    return promise.then(
      () => {
        assert(false, `Error ${errorType.name} was not raised.`);
      },
      (reason: Error) => {
        assert(reason instanceof errorType, reason.toString());
        assert.deepEqual(reason.message, message);
      });
  }

  @test "can detect missing surface area"() {
    let { imports, config } = setupImporting();
    imports.registerSource(
      "foo/bar/base.css",
      `:scope { color: purple; }
       :scope[large] { font-size: 20px; }
       .foo   { float: left;   }
       .foo[small] { font-size: 5px; }`,
    );

    let filename = "foo/bar/implements.css";
    let inputCSS = `@block base from "./base.css";
                    :scope { implements: base; color: red; }
                    .foo { clear: both; }
                    .b[small] {color: blue;}`;

    return this.assertError(
      cssBlocks.CssBlockError,
      `Missing implementations for: :scope[large], .foo[small] ` +
        `from foo/bar/base.css`,
      this.process(filename, inputCSS, config).then((res) => {
        imports.assertImported("foo/bar/base.css");
        return res;
      }));
  }

  @test "can import another block"() {
    let { imports, config } = setupImporting();
    imports.registerSource(
      "foo/bar/base.css",
      `:scope { color: purple; }
       :scope[large] { font-size: 20px; }
       .foo   { float: left;   }
       .foo[small] { font-size: 5px; }`,
    );
    imports.registerSource(
      "foo/bar/other.css",
      `:scope { color: purple; }
      :scope[medium] { font-size: 20px; }
      .foo   { float: left;   }
      .foo[medium] { font-size: 5px; }`,
    );

    let filename = "foo/bar/implements.css";
    let inputCSS = `@block base from "./base.css";
                    @block other from "./other.css";
                    :scope { implements: base, other; color: red; }
                    .foo { clear: both; }
                    .b[small] {color: blue;}
                    :scope[large] { }
                    .foo[small] { }`;

    return this.assertError(
      cssBlocks.CssBlockError,
      `Missing implementations for: :scope[medium], .foo[medium] ` +
        `from foo/bar/other.css`,
      this.process(filename, inputCSS, config).then((res) => {
        imports.assertImported("foo/bar/base.css");
        imports.assertImported("foo/bar/other.css");
        return res;
      }));
  }
}
