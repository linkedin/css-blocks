import { assert } from "chai";
import { suite, test } from "mocha-typescript";

import { OutputMode } from "../src/configuration";

import { BEMProcessor } from "./util/BEMProcessor";

// Reduce whitespace.
function minify(s: string) {
  return s.replace(/(^[\s\n]+|[\s\n]+$)/gm, " ").replace(/[\s\n][\s\n]+/gm, " ").replace(/\n/gm, " ").trim();
}

@suite("Output mode")
export class BEMOutputMode extends BEMProcessor {
  @test "outputs BEM"() {
    let filename = "foo/bar/test-block.css";
    let inputCSS = `
      :scope { color: red; }
      :scope[state|active] { color: orange; }
      .foo {color: yellow; }
      .foo[state|color="green"] { color: green; }
      .foo[state|color="blue"] { color: blue; }
    `;
    return this.process(filename, inputCSS, { outputMode: OutputMode.BEM }).then((result) => {
      assert.deepEqual(
        minify(result.css.toString()),
        minify(`
          .test-block { color: red; }
          .test-block--active { color: orange; }
          .test-block__foo { color: yellow; }
          .test-block__foo--color-green { color: green; }
          .test-block__foo--color-blue { color: blue; }
        `),
      );
    });
  }
  @test "outputs BEM_UNIQUE"() {
    let filename = "foo/bar/test-block.css";
    let inputCSS = `
      :scope { color: red; }
      :scope[state|active] { color: orange; }
      .foo {color: yellow; }
      .foo[state|color="green"] { color: green; }
      .foo[state|color="blue"] { color: blue; }
    `;
    return this.process(filename, inputCSS, { outputMode: OutputMode.BEM_UNIQUE }).then((result) => {
      let css = result.css.toString();

      // Discover the generated GUID for this block.
      // It changes every time the process is killed.
      let uid = (css.match(/test-block_(.....)/) || [])[1];

      assert.deepEqual(
        minify(css),
        minify(`
          .test-block_${uid} { color: red; }
          .test-block_${uid}--active { color: orange; }
          .test-block_${uid}__foo { color: yellow; }
          .test-block_${uid}__foo--color-green { color: green; }
          .test-block_${uid}__foo--color-blue { color: blue; }
        `),
      );
    });
  }
}
