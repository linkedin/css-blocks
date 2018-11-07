import { assert } from "chai";
import { skip, suite, test } from "mocha-typescript";

import { assertError } from "../util/assertError";
import { BEMProcessor } from "../util/BEMProcessor";
import { MockImportRegistry } from "../util/MockImportRegistry";

const { InvalidBlockSyntax } = require("../util/postcss-helper");

@suite("Block Names")
export class BlockNames extends BEMProcessor {

  @test "block names in double quotes fail parse with helpful error"() {
    let imports = new MockImportRegistry();
    imports.registerSource(
      "foo/bar/imported.css",
      `:scope { block-name: "snow-flake"; }`,
    );

    let filename = "foo/bar/test-block.css";
    let inputCSS = `@block block from "./imported.css";
                    @block-debug block to comment;`;

    return this.process(filename, inputCSS, {importer: imports.importer()}).catch((err) => {
      assert.equal(err.message, "[css-blocks] BlockSyntaxError: Illegal block name. '\"snow-flake\"' is not a legal CSS identifier. (foo/bar/imported.css:1:10)");
    });
  }

  @test "block names in single quotes fail parse with helpful error"() {
    let imports = new MockImportRegistry();
    imports.registerSource(
      "foo/bar/imported.css",
      `:scope { block-name: 'snow-flake'; }`,
    );

    let filename = "foo/bar/test-block.css";
    let inputCSS = `@block imported from "./imported.css";
                    @block-debug snow-flake to comment;`;

    return this.process(filename, inputCSS, {importer: imports.importer()}).catch((err) => {
      assert.equal(err.message, "[css-blocks] BlockSyntaxError: Illegal block name. ''snow-flake'' is not a legal CSS identifier. (foo/bar/imported.css:1:10)");
    });
  }

  @test "block-name property only works in the root ruleset"() {
    let imports = new MockImportRegistry();
    imports.registerSource(
      "foo/bar/imported.css",
      `.not-root { block-name: snow-flake; }`,
    );

    let filename = "foo/bar/test-block.css";
    let inputCSS = `@block imported from "./imported.css";
                    @block-debug imported to comment;`;

    return this.process(filename, inputCSS, {importer: imports.importer()}).then((result) => {
      imports.assertImported("foo/bar/imported.css");
      assert.deepEqual(
        result.css.toString(),
        `/* Source: foo/bar/imported.css\n` +
        "   :scope => .imported\n" +
        "   .not-root => .imported__not-root */\n",
      );
    });
  }

  @skip
  @test "doesn't allow a block ref name to collide with a class name"() {
  }

  @skip
  @test "cannot combine :scope with a class as a descendant"() {
  }

  @test "doesn't allow poorly formed names in block-name property"() {
    let imports = new MockImportRegistry();
    imports.registerSource(
      "foo/bar/imported.css",
      `:scope { block-name: 123; }`,
    );

    let filename = "foo/bar/test-block.css";
    let inputCSS = `@block block from "./imported.css";`;

    return assertError(
      InvalidBlockSyntax,
      "Illegal block name. '123' is not a legal CSS identifier. (foo/bar/imported.css:1:10)",
      this.process(filename, inputCSS, {importer: imports.importer()}));
  }

  @test "block-name is removed from output"() {
    let filename = "foo/bar/test-block.css";
    let inputCSS = `:scope { block-name: foo; } .asdf { color: blue; }`;

    return this.process(filename, inputCSS).then((result) => {
      assert.deepEqual(
        result.css.toString(),
        `.foo__asdf { color: blue; }\n`,
      );
    });
  }
}
