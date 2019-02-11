import { assert } from "chai";
import { suite, test, only } from "mocha-typescript";

import { assertError } from "../util/assertError";
import { BEMProcessor } from "../util/BEMProcessor";
import { MockImportRegistry } from "../util/MockImportRegistry";

const { InvalidBlockSyntax } = require("../util/postcss-helper");

@suite("Block Names")
export class BlockNames extends BEMProcessor {

  @test @only "composes may only be used in a rule set"() {
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

  @test @only "throws on missing block reference"() {
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

  @test @only "throws when referencing the local block"() {
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

  @test @only "composition not allowed on rule sets with a scope selector"() {
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

  @test @only "property conflicts that arise from composition must be resolved"() {
    let imports = new MockImportRegistry();
    imports.registerSource(
      "foo/bar/biz.css",
      `.baz { color: red; }`,
    );

    let filename = "foo/bar/test-block.css";
    let inputCSS = `@block biz from "./biz.css";
                    .bar { composes: biz.baz; color: green; }`;

    return assertError(
      InvalidBlockSyntax,
      `Style composition is not allowed in rule sets with a scope selector. (foo/bar/test-block.css:2:50)`,
      this.process(filename, inputCSS, {importer: imports.importer()}));
  }

  @only @test "block names in double quotes fail parse with helpful error"() {
    let imports = new MockImportRegistry();
    imports.registerSource(
      "foo/bar/biz.css",
      `.baz { color: red; }`,
    );

    let filename = "foo/bar/test-block.css";
    let inputCSS = `@block biz from "./biz.css";
                    .bar[state|color][state|inverse] { composes: biz.baz; }`;

    return this.process(filename, inputCSS, {importer: imports.importer()}).then((result) => {
      assert.deepEqual(
        result.css.toString(),
        `.foo__asdf { color: blue; }\n`,
      );
    });
  }
}
