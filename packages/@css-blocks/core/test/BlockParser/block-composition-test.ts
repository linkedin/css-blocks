import { assert } from "chai";
import { suite, test } from "mocha-typescript";

import { assertMultipleErrorsRejection } from "../util/assertError";
import { BEMProcessor } from "../util/BEMProcessor";
import { indented } from "../util/indented";
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

    return assertMultipleErrorsRejection(
      [{
        type: InvalidBlockSyntax,
        message: `The "composes" property may only be used in a rule set. (foo/bar/test-block.css:2:48)`,
      },
       {
        type: InvalidBlockSyntax,
        message: `Cannot read property 'valueOf' of undefined (foo/bar/test-block.css:2:21)`,
      }],
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

    return assertMultipleErrorsRejection(
      [{
        type: InvalidBlockSyntax,
        message: `No style "biz.buz" found. (foo/bar/test-block.css:2:28)`,
      }],
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

    return assertMultipleErrorsRejection(
      [{
        type: InvalidBlockSyntax,
        message: `Styles from the same Block may not be composed together. (foo/bar/test-block.css:3:28)`,
      }],
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
                    :scope[awesome] .bar { composes: biz.baz; }`;

    return assertMultipleErrorsRejection(
      [{
      type: InvalidBlockSyntax,
      message: `Style composition is not allowed in rule sets with a context selector. (foo/bar/test-block.css:2:44)`}],
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

  @test "composes considers quotes optional"() {
    let imports = new MockImportRegistry();
    imports.registerSource(
      "foo/bar/biz.css",
      `.biz { color: red; } .baz { color: green; } .buz { color: blue; }`,
    );

    let filename = "foo/bar/test-block.css";
    let inputCSS = `
      @block other from "./biz.css";
      .biz { composes: other.biz; }
      .baz { composes: 'other.baz'; }
      .buz { composes: "other.buz" }
    `;

    return this.process(filename, inputCSS, {importer: imports.importer()}).then((result) => {
      assert.deepEqual(
        result.css.toString(),
        `.test-block__biz { }\n.test-block__baz { }\n.test-block__buz { }\n`,
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
                    .bar[active] { composes: biz.buz; }
                    .bar[color][inverse] { composes: biz.baz; background: blue; }
                    @block-debug self to comment;
                    `;

    return this.process(filename, inputCSS, {importer: imports.importer()}).then((result) => {
      assert.deepEqual(
        result.css.toString().trim(),
        indented`
          .test-block__bar { }
          .test-block__bar--active { }
          .test-block__bar--color.test-block__bar--inverse { background: blue; }
          /* Source: foo/bar/test-block.css
           * :scope (.test-block)
           *  composes:
           *  └── biz
           *  └── .bar (.test-block__bar)
           *       composes:
           *       ├── biz.baz
           *       ├── biz.buz when [active]
           *       └── biz.baz when [color] && [inverse]
           *       states:
           *       └── .bar[inverse] (.test-block__bar--inverse)
           */`,
      );
    });
  }
}
