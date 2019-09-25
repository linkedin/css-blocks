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
    let inputCSS = `:scope { block-alias: a-block-alias1 a-block-alias2; color: red; }
                    .foo { block-alias: fooClassAlias; clear: both; }
                    .b[state|small] {block-alias: stateSmallAlias; color: blue;}
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
           *  |    └── .b[state|small] (.a-block__b--small, aliases: .stateSmallAlias)
           *  └── .foo (.a-block__foo, aliases: .fooClassAlias)
           */`,
      );
    });
  }

  // write a test for checking multiple block aliases on the same style
}
