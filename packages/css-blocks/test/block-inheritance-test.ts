import { assert } from "chai";
import { skip, suite, test } from "mocha-typescript";

import { BEMProcessor } from "./util/BEMProcessor";
import { setupImporting } from "./util/setupImporting";

@suite("Block Inheritance")
export class BlockInheritance extends BEMProcessor {
  @test "can import another block"() {
    let { imports, config } = setupImporting();
    imports.registerSource(
      "foo/bar/base.css",
      `:scope { color: purple; }
       [state|large] { font-size: 20px; }
       .foo   { float: left;   }
       .foo[state|small] { font-size: 5px; }`,
    );

    let filename = "foo/bar/inherits.css";
    let inputCSS = `@block-reference base from "./base.css";
                    :scope { extends: base; color: red; }
                    .foo { clear: both; }
                    .b[state|small] {color: blue;}
                    @block-debug self to comment;`;

    return this.process(filename, inputCSS, config).then((result) => {
      imports.assertImported("foo/bar/base.css");
      assert.deepEqual(
        result.css.toString(),
        ".inherits { color: red; }\n" +
        ".base.inherits { color: red; }\n" +
        ".inherits__foo { clear: both; }\n" +
        ".inherits__b--small { color: blue; }\n" +
        "/* Source: foo/bar/inherits.css\n" +
        "   :scope => .base .inherits\n" +
        "   .b => .inherits__b\n" +
        "   .b[state|small] => .inherits__b--small\n" +
        "   .foo => .base__foo .inherits__foo\n" +
        "   .foo[state|small] => .base__foo--small\n" +
        "   [state|large] => .base--large */\n",
      );
    });
  }

  @skip
  @test "can unset an inherited property"() {
    let { imports, config } = setupImporting();
    // This is hard because the base block and the sub block have to be compiled together to make it work.
    // or the base block would need to discover all subblocks somehow.
    imports.registerSource(
      "foo/bar/base.css",
      `:scope { color: purple; }
       .foo   { float: left; width: 500px; }`,
    );

    let filename = "foo/bar/inherits.css";
    let inputCSS = `@block-reference base from "./base.css";
                    :scope { extends: base; color: red; }
                    .foo { clear: both; width: unset(); }`;

    return this.process(filename, inputCSS, config).then((result) => {
      imports.assertImported("foo/bar/base.css");
      assert.deepEqual(
        result.css.toString(),
        ".inherits { color: red; }\n" +
        ".inherits__foo { clear: both; }\n",
      );
    });
  }

  @test "inheritance conflicts automatically resolve to the base class"() {
    let { imports, config } = setupImporting();
    imports.registerSource(
      "base.css",
      `:scope { width: 100%; }`,
    );

    let filename = "sub.css";
    let inputCSS = `@block-reference base from "./base.css";
                    :scope {
                      extends: base;
                      width: 80%;
                    }`;

    return this.process(filename, inputCSS, config).then((result) => {
      imports.assertImported("base.css");
      assert.deepEqual(
        result.css.toString(),
        ".sub { width: 80%; }\n" +
        ".base.sub { width: 80%; }\n",
      );
    });
  }

  @test "inheritance conflicts automatically resolve pseudoelements to the base class"() {
    let { imports, config } = setupImporting();
    imports.registerSource(
      "base.css",
      `.foo::after { width: 100%; }`,
    );

    let filename = "sub.css";
    let inputCSS = `@block-reference base from "./base.css";
                    :scope {
                      extends: base;
                    }
                    .foo::after {
                      width: 80%;
                    }`;

    return this.process(filename, inputCSS, config).then((result) => {
      imports.assertImported("base.css");
      assert.deepEqual(
        result.css.toString(),
        ".sub__foo::after { width: 80%; }\n" +
        ".base__foo.sub__foo::after { width: 80%; }\n",
      );
    });
  }

  @test "multiple rulesets for the same target object pseudoelement get resolved"() {
    let { imports, config } = setupImporting();
    imports.registerSource(
      "base.css",
      `.nav { margin: 10px; }
       .nav + .nav { margin-bottom: 0px; }`,
    );

    let filename = "sub.css";
    let inputCSS = `@block-reference base from "./base.css";
                    :scope { extends: base; }
                    .nav { margin: 15px; }
                    .nav + .nav { margin-bottom: 5px; }`;

    return this.process(filename, inputCSS, config).then((result) => {
      imports.assertImported("base.css");
      assert.deepEqual(
        result.css.toString(),
        ".sub__nav { margin: 15px; }\n" +
        ".base__nav.sub__nav { margin: 15px; }\n" +
        ".sub__nav + .sub__nav { margin-bottom: 5px; }\n" +
        ".base__nav.sub__nav + .base__nav.sub__nav { margin-bottom: 5px; }\n",
      );
    });
  }

  // TODO: With the addition of the conflict validator, this use case now outputs duplicate resolve statement.
  // This bug will be resolved when https://github.com/css-blocks/css-blocks/issues/64 lands.
  @test @skip "multiple selectors in ruleset for object get resolved"() {
    let { imports, config } = setupImporting();
    imports.registerSource(
      "base.css",
      `.nav:active, .nav:hover { color: red; }`,
    );

    let filename = "sub.css";
    let inputCSS = `@block-reference base from "./base.css";
                    :scope { extends: base; }
                    .nav:active, .nav:hover { color: blue; }`;

    return this.process(filename, inputCSS, config).then((result) => {
      imports.assertImported("base.css");
      assert.deepEqual(
        result.css.toString(),
        ".sub__nav:active, .sub__nav:hover { color: blue; }\n" +
        ".base__nav.sub__nav:hover { color: blue; }\n" +
        ".base__nav.sub__nav:active { color: blue; }\n" +
        ".base__nav.sub__nav:active:hover { color: blue; }\n",
      );
    });
  }

  @skip
  @test "longhand inheritance conflicts automatically resolve to the base class"() {
    let { imports, config } = setupImporting();
    imports.registerSource(
      "base.css",
      `:scope { border: 1px solid black; }`,
    );

    let filename = "sub.css";
    let inputCSS = `@block-reference base from "./base.css";
                    :scope {
                      extends: base;
                      border-color: green;
                    }`;

    return this.process(filename, inputCSS, config).then((result) => {
      imports.assertImported("base.css");
      assert.deepEqual(
        result.css.toString(),
        ".sub { border-color: green; }\n" +
        ".base.sub { border-color: green; }\n",
      );
    });
  }

}
