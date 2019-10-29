import { assert } from "chai";
import {  suite, test } from "mocha-typescript";

import { BEMProcessor } from "../util/BEMProcessor";
import { indented } from "../util/indented";
import { setupImporting } from "../util/setupImporting";

@suite("Style Alias")
export class StyleAlias extends BEMProcessor {

  @test "can assign an alias to the scope, a class and a state"() {
    let { config } = setupImporting();

    let filename = "foo/bar/a-block.css";
    let inputCSS = `:scope { block-alias: a-block-alias1; color: red; }
                    .foo { block-alias: fooClassAlias; clear: both; }
                    .b[small] {block-alias: stateSmallAlias; color: blue;}
                    @block-debug self to comment;`;

    return this.process(filename, inputCSS, config).then((result) => {
      assert.deepEqual(
        result.css.toString().trim(),
        indented`
          .a-block { color: red; }
          .a-block__foo { clear: both; }
          .a-block__b--small { color: blue; }
          /* Source: foo/bar/a-block.css
           * :scope (.a-block, aliases: .a-block-alias1)
           *  ├── .b (.a-block__b)
           *  |    states:
           *  |    └── .b[small] (.a-block__b--small, aliases: .stateSmallAlias)
           *  └── .foo (.a-block__foo, aliases: .fooClassAlias)
           */`,
      );
    });
  }

  @test "can assign multiple aliases to the scope, a class and a state"() {
    let { config } = setupImporting();

    let filename = "foo/bar/a-block.css";
    let inputCSS = `:scope { block-alias: a-block-alias1 a-block-alias2; color: red; }
                    .foo { block-alias: my-class-alias1 my-class-alias-2; clear: both; }
                    .b[small] {block-alias: my-state-alias1 my-state-alias2; color: blue;}
                    @block-debug self to comment;`;

    return this.process(filename, inputCSS, config).then((result) => {
      assert.deepEqual(
        result.css.toString().trim(),
        indented`
          .a-block { color: red; }
          .a-block__foo { clear: both; }
          .a-block__b--small { color: blue; }
          /* Source: foo/bar/a-block.css
           * :scope (.a-block, aliases: .a-block-alias1 .a-block-alias2)
           *  ├── .b (.a-block__b)
           *  |    states:
           *  |    └── .b[small] (.a-block__b--small, aliases: .my-state-alias1 .my-state-alias2)
           *  └── .foo (.a-block__foo, aliases: .my-class-alias1 .my-class-alias-2)
           */`,
      );
    });
  }

  @test "should throw an error if it breaks the css syntax"() {
    let { config } = setupImporting();

    let filename = "foo/bar/a-block.css";
    let inputCSS = `:scope { block-alias: a-block-alias1 a-block-alias2-;-with; color: red; }
                    .foo { block-alias: my-class-alias1 my-class-alias-2; clear: both; }
                    .b[small] {block-alias: my-state-alias1 my-state-alias2; color: blue;}
                    @block-debug self to comment;`;

    return this.process(filename, inputCSS, config).then(() => assert(false, "noError was thown")).catch(err => {
      assert.equal(err.name, "CssSyntaxError");
    });
  }

  @test "should parse quoted aliases containing special characters"() {
    let { config } = setupImporting();

    let filename = "foo/bar/a-block.css";
    let inputCSS = `:scope { block-alias: a-block-alias1 "a-block-alias2--with"; color: red; }
                    .foo { block-alias: my-class-alias1 my-class-alias-2; clear: both; }
                    .b[small] {block-alias: my-state-alias1 my-state-alias2; color: blue;}
                    @block-debug self to comment;`;

    return this.process(filename, inputCSS, config).then((result) => {
      assert.deepEqual(
        result.css.toString().trim(),
        indented`
          .a-block { color: red; }
          .a-block__foo { clear: both; }
          .a-block__b--small { color: blue; }
          /* Source: foo/bar/a-block.css
           * :scope (.a-block, aliases: .a-block-alias1 .a-block-alias2--with)
           *  ├── .b (.a-block__b)
           *  |    states:
           *  |    └── .b[small] (.a-block__b--small, aliases: .my-state-alias1 .my-state-alias2)
           *  └── .foo (.a-block__foo, aliases: .my-class-alias1 .my-class-alias-2)
           */`,
      );
    });
  }
}
