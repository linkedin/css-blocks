import { assert } from "chai";
import { suite, test, skip } from "mocha-typescript";

import BEMProcessor from "./util/BEMProcessor";
import { MockImportRegistry } from "./util/MockImportRegistry";

@suite("Block Inheritance")
export class BlockInheritance extends BEMProcessor {
  @test "can import another block"() {
    let imports = new MockImportRegistry();
    imports.registerSource("foo/bar/base.css",
      `.root { color: purple; }
       [state|large] { font-size: 20px; }
       .foo   { float: left;   }
       .foo[state|small] { font-size: 5px; }`
    );

    let filename = "foo/bar/inherits.css";
    let inputCSS = `@block-reference "./base.css";
                    .root { extends: base; color: red; }
                    .foo { clear: both; }
                    .b[state|small] {color: blue;}`;

    return this.process(filename, inputCSS, {interoperableCSS: true, importer: imports.importer()}).then((result) => {
      imports.assertImported("foo/bar/base.css");
      assert.deepEqual(
        result.css.toString(),
        ":export {" +
        " root: inherits base;" +
        " foo: inherits__foo base__foo;" +
        " b: inherits__b;" +
        " b--small: inherits__b--small;" +
        " large: base--large;" +
        " foo--small: base__foo--small; " +
        "}\n" +
        ".inherits { color: red; }\n" +
        ".base.inherits { color: red; }\n" +
        ".inherits__foo { clear: both; }\n" +
        ".inherits__b--small { color: blue; }\n"
      );
    });
  }

  @skip
  @test "can unset an inherited property"() {
    // This is hard because the base block and the sub block have to be compiled together to make it work.
    // or the base block would need to discover all subblocks somehow.
    let imports = new MockImportRegistry();
    imports.registerSource("foo/bar/base.css",
      `.root { color: purple; }
       .foo   { float: left; width: 500px; }`
    );

    let filename = "foo/bar/inherits.css";
    let inputCSS = `@block-reference "./base.css";
                    .root { extends: base; color: red; }
                    .foo { clear: both; width: unset(); }`;

    return this.process(filename, inputCSS, {interoperableCSS: true, importer: imports.importer()}).then((result) => {
      imports.assertImported("foo/bar/base.css");
      assert.deepEqual(
        result.css.toString(),
        ":export {" +
        " block: inherits base;" +
        " foo: inherits__foo base__foo--without-width;" +
        "}\n" +
        ".inherits { color: red; }\n" +
        ".inherits__foo { clear: both; }\n"
      );
    });
  }

  @test "inheritance conflicts automatically resolve to the base class"() {
    let imports = new MockImportRegistry();
    imports.registerSource("base.css",
      `.root { width: 100%; }`
    );

    let filename = "sub.css";
    let inputCSS = `@block-reference "./base.css";
                    .root {
                      extends: base;
                      width: 80%;
                    }`;

    return this.process(filename, inputCSS, {importer: imports.importer()}).then((result) => {
      imports.assertImported("base.css");
      assert.deepEqual(
        result.css.toString(),
        ".sub { width: 80%; }\n" +
        ".base.sub { width: 80%; }\n"
      );
    });
  }

  @test "multiple rulesets for the same target object get resolved"() {
    let imports = new MockImportRegistry();
    imports.registerSource("base.css",
      `.nav { margin: 10px; }
       .nav + .nav { margin-bottom: 0px; }`
    );

    let filename = "sub.css";
    let inputCSS = `@block-reference "./base.css";
                    .root { extends: base; }
                    .nav { margin: 15px; }
                    .nav + .nav { margin-bottom: 5px; }`;

    return this.process(filename, inputCSS, {importer: imports.importer()}).then((result) => {
      imports.assertImported("base.css");
      assert.deepEqual(
        result.css.toString(),
        ".sub__nav { margin: 15px; }\n" +
        ".base__nav.sub__nav { margin: 15px; }\n" +
        ".sub__nav + .sub__nav { margin-bottom: 5px; }\n" +
        ".base__nav.sub__nav + .base__nav.sub__nav { margin-bottom: 5px; }\n"
      );
    });
  }

  @test "multiple selectors in ruleset for object get resolved"() {
    let imports = new MockImportRegistry();
    imports.registerSource("base.css",
      `.nav:active, .nav:hover { color: red; }`
    );

    let filename = "sub.css";
    let inputCSS = `@block-reference "./base.css";
                    .root { extends: base; }
                    .nav:active, .nav:hover { color: blue; }`;

    return this.process(filename, inputCSS, {importer: imports.importer()}).then((result) => {
      imports.assertImported("base.css");
      assert.deepEqual(
        result.css.toString(),
        ".sub__nav:active, .sub__nav:hover { color: blue; }\n" +
        ".base__nav.sub__nav:hover { color: blue; }\n" +
        ".base__nav.sub__nav:active { color: blue; }\n" +
        ".base__nav.sub__nav:active:hover { color: blue; }\n"
      );
    });
  }

  @skip
  @test "longhand inheritance conflicts automatically resolve to the base class"() {
    let imports = new MockImportRegistry();
    imports.registerSource("base.css",
      `.root { border: 1px solid black; }`
    );

    let filename = "sub.css";
    let inputCSS = `@block-reference "./base.css";
                    .root {
                      extends: base;
                      border-color: green;
                    }`;

    return this.process(filename, inputCSS, {importer: imports.importer()}).then((result) => {
      imports.assertImported("base.css");
      assert.deepEqual(
        result.css.toString(),
        ".sub { border-color: green; }\n" +
        ".base.sub { border-color: green; }\n"
      );
    });
  }

}
