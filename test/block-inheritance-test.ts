import { assert } from "chai";
import { suite, test, skip } from "mocha-typescript";

import BEMProcessor from "./util/BEMProcessor";
import { MockImportRegistry } from "./util/MockImportRegistry";

@suite("Block Inheritance")
export class BlockInheritance extends BEMProcessor {
  @test "can import another block"() {
    let imports = new MockImportRegistry();
    imports.registerSource("foo/bar/base.css",
      `:block { color: purple; }
       [state-large] { font-size: 20px; }
       .foo   { float: left;   }
       .foo[substate-small] { font-size: 5px; }`
    );

    let filename = "foo/bar/inherits.css";
    let inputCSS = `@block-reference "./base.css";
                    :block { extends: base; color: red; }
                    .foo { clear: both; }
                    .b[substate-small] {color: blue;}`;

    return this.process(filename, inputCSS, {interoperableCSS: true, importer: imports.importer()}).then((result) => {
      imports.assertImported("foo/bar/base.css");
      assert.deepEqual(
        result.css.toString(),
        ":export {" +
        " block: inherits base;" +
        " foo: inherits__foo base__foo;" +
        " b: inherits__b;" +
        " b--small: inherits__b--small;" +
        " large: base--large;" +
        " foo--small: base__foo--small; " +
        "}\n" +
        ".inherits { color: red; }\n" +
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
      `:block { color: purple; }
       .foo   { float: left; width: 500px; }`
    );

    let filename = "foo/bar/inherits.css";
    let inputCSS = `@block-reference "./base.css";
                    :block { extends: base; color: red; }
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
}
