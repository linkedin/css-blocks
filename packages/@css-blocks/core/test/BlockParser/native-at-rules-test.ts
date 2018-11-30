import { assert } from "chai";
import { suite, test } from "mocha-typescript";

import { BEMProcessor } from "../util/BEMProcessor";

@suite("Native At Rules Untouched")
export class AtRulesUntouched extends BEMProcessor {

  @test "@keyframes is left alone"() {
    let filename = "foo/bar/test-keyframes.css";
    let inputCSS = `@keyframes foo {
      0% { top: 0px; }
      100% { top: 100px; }
    }`;

    return this.process(filename, inputCSS).then((result) => {
      assert.deepEqual(
        result.css.toString(),
        "@keyframes foo {\n" +
        " 0% { top: 0; }\n" +
        " 100% { top: 100px; }\n" +
        "}\n",
      );
    });
  }

  @test "@media is handled"() {
    let filename = "foo/bar/test-media.css";
    let inputCSS = `
    :scope { color: red; }
    @media all and (max-width: 400px) {
      :scope[state|responsive] { color: blue; }
      .a-class { width: 100%; }
    }`;

    return this.process(filename, inputCSS).then((result) => {
      assert.deepEqual(
        result.css.toString(),
        ".test-media { color: red; }\n" +
          "@media all and (max-width: 400px) {\n" +
          " .test-media--responsive { color: blue; }\n" +
          " .test-media__a-class { width: 100%; }\n" +
          "}\n",
      );
    });
  }
}
