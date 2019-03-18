import { assert } from "chai";
import { suite, test } from "mocha-typescript";

import { assertError } from "../util/assertError";
import { BEMProcessor } from "../util/BEMProcessor";
import { MockImportRegistry } from "../util/MockImportRegistry";

const { InvalidBlockSyntax } = require("../util/postcss-helper");

@suite("In-Stylesheet Block Composition")
export class BlockNames extends BEMProcessor {

  @test "composes may only be used in a rule set"() {
    let imports = new MockImportRegistry();
    imports.registerSource(
      "foo/bar/biz.css",
      `.baz { color: red; }`,
    );

    let filename = "foo/bar/test-block.css";
    let inputCSS = `@block biz from "./biz.css";
                    @media(max-width: 200px) { composes: biz.baz; }`;

    return assertError(
      InvalidBlockSyntax,
      `The "composes" property may only be used in a rule set. (foo/bar/test-block.css:2:48)`,
      this.process(filename, inputCSS, {importer: imports.importer()}));
  }

  @test "throws on missing block reference"() {
    let imports = new MockImportRegistry();
    imports.registerSource(
      "foo/bar/biz.css",
      `.baz { color: red; }`,
    );

    let filename = "foo/bar/test-block.css";
    let inputCSS = `@block biz from "./biz.css";
                    .bar { composes: biz.buz; }`;

    return assertError(
      InvalidBlockSyntax,
      `No style "biz.buz" found. (foo/bar/test-block.css:2:28)`,
      this.process(filename, inputCSS, {importer: imports.importer()}));
  }

  @test "throws when referencing the local block"() {
    let imports = new MockImportRegistry();
    imports.registerSource(
      "foo/bar/biz.css",
      `.baz { color: red; }`,
    );

    let filename = "foo/bar/test-block.css";
    let inputCSS = `@block biz from "./biz.css";
                    .buz { color: green; }
                    .bar { composes: .buz; }`;

    return assertError(
      InvalidBlockSyntax,
      `Styles from the same Block may not be composed together. (foo/bar/test-block.css:3:28)`,
      this.process(filename, inputCSS, {importer: imports.importer()}));
  }

  @test "composition not allowed on rule sets with a scope selector"() {
    let imports = new MockImportRegistry();
    imports.registerSource(
      "foo/bar/biz.css",
      `.baz { color: red; }`,
    );

    let filename = "foo/bar/test-block.css";
    let inputCSS = `@block biz from "./biz.css";
                    :scope[state|awesome] .bar { composes: biz.baz; }`;

    return assertError(
      InvalidBlockSyntax,
      `Style composition is not allowed in rule sets with a scope selector. (foo/bar/test-block.css:2:50)`,
      this.process(filename, inputCSS, {importer: imports.importer()}));
  }

  @test "composes attribute is stripped in output"() {
    let imports = new MockImportRegistry();
    imports.registerSource(
      "foo/bar/biz.css",
      `.baz { color: red; }`,
    );

    let filename = "foo/bar/test-block.css";
    let inputCSS = `@block biz from "./biz.css";
                    :scope { composes: biz.baz; background: blue; }`;

    return this.process(filename, inputCSS, {importer: imports.importer()}).then((result) => {
      assert.deepEqual(
        result.css.toString(),
        `.test-block { background: blue; }\n`,
      );
    });
  }

  @test "composes attribute understands possible state combinations"() {
    let imports = new MockImportRegistry();
    imports.registerSource(
      "foo/bar/biz.css",
      `:scope { color: green; } .baz { color: red; } .buz { color: yellow; }`,
    );

    let filename = "foo/bar/test-block.css";
    let inputCSS = `@block biz from "./biz.css";
                    :scope { composes: biz; }
                    .bar { composes: biz.baz; }
                    .bar[state|active] { composes: biz.buz; }
                    .bar[state|color][state|inverse] { composes: biz.baz; background: blue; }
                    @block-debug self to comment;
                    `;

    return this.process(filename, inputCSS, {importer: imports.importer()}).then((result) => {
      assert.deepEqual(
        result.css.toString(),
        `.test-block__bar--color.test-block--inverse { background: blue; }\n`,
      );
    });
  }
}
