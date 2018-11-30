import { assert } from "chai";
import { skip, suite, test } from "mocha-typescript";

import { BEMProcessor } from "../util/BEMProcessor";

@suite("In BEM output mode")
export class BEMOutputMode extends BEMProcessor {

  @skip
  @test "supports arbitrary whitespace in combinators"() {
    let filename = "foo/bar/self-combinator.css";
    let inputCSS = `:scope[state|big]
     :scope[state|big]::after { content: "" }`;
    return this.process(filename, inputCSS).then((result) => {
      assert.deepEqual(
        result.css.toString(),
        ".self-combinator--big .self-combinator--big::after { content: \"\"; }\n",
      );
    });
  }

  @test "replaces block with the blockname from the file"() {
    let filename = "foo/bar/test-block.css";
    let inputCSS = `:scope {color: red;}`;
    return this.process(filename, inputCSS).then((result) => {
      assert.deepEqual(
        result.css.toString(),
        ".test-block { color: red; }\n",
      );
    });
  }

  @test "handles pseudoclasses on the :scope"() {
    let filename = "foo/bar/test-block-pseudos.css";
    let inputCSS = `:scope {color: #111;}
                    :scope:hover { font-weight: bold; }`;
    return this.process(filename, inputCSS).then((result) => {
      assert.deepEqual(
        result.css.toString(),
        ".test-block-pseudos { color: #111; }\n" +
        ".test-block-pseudos:hover { font-weight: bold; }\n",
      );
    });
  }

  @test "handles states"() {
    let filename = "foo/bar/test-state.css";
    let inputCSS = `:scope {color: #111;}
                    :scope[state|big] { transform: scale(2); }`;
    return this.process(filename, inputCSS).then((result) => {
      assert.deepEqual(
        result.css.toString(),
        ".test-state { color: #111; }\n" +
        ".test-state--big { transform: scale( 2 ); }\n",
      );
    });
  }

  @test "handles states as scopes"() {
    let filename = "foo/bar/test-state.css";
    let inputCSS = `:scope {color: #111;}
                    :scope[state|big] .thing { transform: scale(2); }
                    :scope[state|big] .thing[state|medium] { transform: scale(1.8); }`;
    return this.process(filename, inputCSS).then((result) => {
      assert.deepEqual(
        result.css.toString(),
        ".test-state { color: #111; }\n" +
        ".test-state--big .test-state__thing { transform: scale( 2 ); }\n" +
        ".test-state--big .test-state__thing--medium { transform: scale( 1.8 ); }\n",
      );
    });
  }

  @test "handles comma-delimited states"() {
    let filename = "foo/bar/test-state.css";
    let inputCSS = `:scope[state|big], :scope[state|really-big] { transform: scale(2); }`;
    return this.process(filename, inputCSS).then((result) => {
      assert.deepEqual(
        result.css.toString(),
        ".test-state--big, .test-state--really-big { transform: scale( 2 ); }\n",
      );
    });
  }

  @test "a state can be combined with itself"() {
    let filename = "foo/bar/self-combinator.css";
    let inputCSS = `:scope[state|big] + :scope[state|big]::after { content: "" }`;
    return this.process(filename, inputCSS).then((result) => {
      assert.deepEqual(
        result.css.toString(),
        ".self-combinator--big + .self-combinator--big::after { content: \"\"; }\n",
      );
    });
  }

  @test "checkbox with sibling label"() {
    let filename = "foo/bar/checkbox.block.css";
    let inputCSS = `
      :scope:checked + :scope[state|when-checked] {
        color: green;
      }
    `;
    return this.process(filename, inputCSS).then((result) => {
      assert.deepEqual(
        result.css.toString(),
        ".checkbox:checked + .checkbox--when-checked { color: green; }\n",
      );
    });
  }

  @test "handles exclusive states"() {
    let filename = "foo/bar/test-state.css";
    let inputCSS = `:scope {color: #111;}
                    :scope[state|font=big] { transform: scale(2); }`;
    return this.process(filename, inputCSS).then((result) => {
      assert.deepEqual(
        result.css.toString(),
        ".test-state { color: #111; }\n" +
        ".test-state--font-big { transform: scale( 2 ); }\n",
      );
    });
  }

  @test "handles exclusive states with single quotes"() {
    let filename = "foo/bar/test-state.css";
    let inputCSS = `:scope {color: #111;}
                    :scope[state|size='1dp'] { transform: scale(2); }`;
    return this.process(filename, inputCSS).then((result) => {
      assert.deepEqual(
        result.css.toString(),
        ".test-state { color: #111; }\n" +
        ".test-state--size-1dp { transform: scale( 2 ); }\n",
      );
    });
  }

  @test "handles exclusive states with double quotes"() {
    let filename = "foo/bar/test-state.css";
    let inputCSS = `:scope {color: #111;}
                    :scope[state|size="1dp"] { transform: scale(2); }`;
    return this.process(filename, inputCSS).then((result) => {
      assert.deepEqual(
        result.css.toString(),
        ".test-state { color: #111; }\n" +
        ".test-state--size-1dp { transform: scale( 2 ); }\n",
      );
    });
  }

  @test "handles comma-delimited exclusive states"() {
    let filename = "foo/bar/test-state.css";
    let inputCSS = `:scope[state|font=big], :scope[state|font=really-big] { transform: scale(2); }`;
    return this.process(filename, inputCSS).then((result) => {
      assert.deepEqual(
        result.css.toString(),
        ".test-state--font-big, .test-state--font-really-big { transform: scale( 2 ); }\n",
      );
    });
  }

  @test "a exclusive state can be combined with itself"() {
    let filename = "foo/bar/self-combinator.css";
    let inputCSS = `:scope[state|font=big] + :scope[state|font=big]::after { content: "" }`;
    return this.process(filename, inputCSS).then((result) => {
      assert.deepEqual(
        result.css.toString(),
        ".self-combinator--font-big + .self-combinator--font-big::after { content: \"\"; }\n",
      );
    });
  }

  @test "handles classes"() {
    let filename = "foo/bar/test-class.css";
    let inputCSS = `:scope {color: #111;}
                    .my-class { display: block; }`;
    return this.process(filename, inputCSS).then((result) => {
      assert.deepEqual(
        result.css.toString(),
        ".test-class { color: #111; }\n" +
        ".test-class__my-class { display: block; }\n",
      );
    });
  }

  @test "handles classes with states"() {
    let filename = "foo/bar/stateful-class.css";
    let inputCSS = `:scope {color: #111;}
                    .my-class { display: none; }
                    :scope[state|visible] .my-class { display: block; }`;
    return this.process(filename, inputCSS).then((result) => {
      assert.deepEqual(
        result.css.toString(),
        ".stateful-class { color: #111; }\n" +
        ".stateful-class__my-class { display: none; }\n" +
        ".stateful-class--visible .stateful-class__my-class { display: block; }\n",
      );
    });
  }

  @test "handles classes with class states"() {
    let filename = "foo/bar/stateful-class.css";
    let inputCSS = `:scope {color: #111;}
                    .my-class { display: none; }
                    .my-class[state|visible] { display: block; }`;
    return this.process(filename, inputCSS).then((result) => {
      assert.deepEqual(
        result.css.toString(),
        ".stateful-class { color: #111; }\n" +
        ".stateful-class__my-class { display: none; }\n" +
        ".stateful-class__my-class--visible { display: block; }\n",
      );
    });
  }

  @test "handles root states with class states"() {
    let filename = "foo/bar/stateful.css";
    let inputCSS = `:scope {color: #111;}
                    .my-class { display: none; }
                    :scope[state|translucent] .my-class[state|visible] { display: block; opacity: 0.75; }`;
    return this.process(filename, inputCSS).then((result) => {
      assert.deepEqual(
        result.css.toString(),
        ".stateful { color: #111; }\n" +
        ".stateful__my-class { display: none; }\n" +
        ".stateful--translucent .stateful__my-class--visible { display: block; opacity: .75; }\n",
      );
    });
  }
}
