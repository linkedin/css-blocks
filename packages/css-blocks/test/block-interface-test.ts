import { assert } from "chai";
import { suite, test } from "mocha-typescript";
import * as postcss from "postcss";

import cssBlocks = require("../src/cssBlocks");

import { BEMProcessor } from "./util/BEMProcessor";
import { MockImportRegistry } from "./util/MockImportRegistry";

@suite("Block Interfaces")
export class BlockInterfaceTests extends BEMProcessor {
  assertError(errorType: typeof cssBlocks.CssBlockError, message: string, promise: postcss.LazyResult) {
    return promise.then(
      () => {
        assert(false, `Error ${errorType.name} was not raised.`);
      },
      (reason) => {
        assert(reason instanceof errorType, reason.toString());
        assert.deepEqual(reason.message, message);
      });
  }

  @test "can detect missing surface area"() {
    let imports = new MockImportRegistry();
    imports.registerSource(
      "foo/bar/base.css",
      `.root { color: purple; }
       [state|large] { font-size: 20px; }
       .foo   { float: left;   }
       .foo[state|small] { font-size: 5px; }`,
    );

    let filename = "foo/bar/implements.css";
    let inputCSS = `@block-reference base from "./base.css";
                    .root { implements: base; color: red; }
                    .foo { clear: both; }
                    .b[state|small] {color: blue;}`;

    return this.assertError(
      cssBlocks.CssBlockError,
      `Missing implementations for: [state|large], .foo[state|small] ` +
        `from foo/bar/base.css`,
      this.process(filename, inputCSS, {importer: imports.importer()}).then(() => {
        imports.assertImported("foo/bar/base.css");
      }));
  }

  @test "can import another block"() {
    let imports = new MockImportRegistry();
    imports.registerSource(
      "foo/bar/base.css",
      `.root { color: purple; }
       [state|large] { font-size: 20px; }
       .foo   { float: left;   }
       .foo[state|small] { font-size: 5px; }`,
    );
    imports.registerSource(
      "foo/bar/other.css",
      `.root { color: purple; }
      [state|medium] { font-size: 20px; }
      .foo   { float: left;   }
      .foo[state|medium] { font-size: 5px; }`,
    );

    let filename = "foo/bar/implements.css";
    let inputCSS = `@block-reference base from "./base.css";
                    @block-reference other from "./other.css";
                    .root { implements: base, other; color: red; }
                    .foo { clear: both; }
                    .b[state|small] {color: blue;}
                    [state|large] { }
                    .foo[state|small] { }`;

    return this.assertError(
      cssBlocks.CssBlockError,
      `Missing implementations for: [state|medium], .foo[state|medium] ` +
        `from foo/bar/other.css`,
      this.process(filename, inputCSS, {importer: imports.importer()}).then(() => {
        imports.assertImported("foo/bar/base.css");
        imports.assertImported("foo/bar/other.css");
      }));
  }
}
