import { assert } from "chai";
import { suite, test } from "mocha-typescript";

import { BEMProcessor } from "../util/BEMProcessor";

@suite("In BEM output mode")
export class BEMOutputMode extends BEMProcessor {

  @test async "cannot select attributes in the html namespace"() {
    let filename = "foo/bar/html-attrs.css";
    let inputCSS = `:scope[html|data-foo=bar] { color: red }`;
    try {
      await this.process(filename, inputCSS);
    } catch (e) {
      assert.equal(e.toString(), "Error: [css-blocks] BlockSyntaxError: Cannot select attributes in the `html` namespace: :scope[html|data-foo=bar] (foo/bar/html-attrs.css:1:7)");
      return;
    }
    assert.fail("Error was expected.");
  }

  @test "supports arbitrary whitespace in combinators"() {
    let filename = "foo/bar/self-combinator.css";
    let inputCSS = `:scope[big]
     .foo::after { content: "" }`;
    return this.process(filename, inputCSS).then((result) => {
      assert.deepEqual(
        result.css.toString(),
        ".self-combinator--big\n     .self-combinator__foo::after { content: \"\"; }\n",
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
                    :scope[big] { transform: scale(2); }`;
    return this.process(filename, inputCSS).then((result) => {
      assert.deepEqual(
        result.css.toString(),
        ".test-state { color: #111; }\n" +
        ".test-state--big { transform: scale( 2 ); }\n",
      );
    });
  }

  @test "handles states on scopes"() {
    let filename = "foo/bar/test-state.css";
    let inputCSS = `:scope {color: #111;}
                    :scope[big] .thing { transform: scale(2); }
                    :scope[big] .thing[medium] { transform: scale(1.8); }`;
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
    let inputCSS = `:scope[big], :scope[really-big] { transform: scale(2); }`;
    return this.process(filename, inputCSS).then((result) => {
      assert.deepEqual(
        result.css.toString(),
        ".test-state--big, .test-state--really-big { transform: scale( 2 ); }\n",
      );
    });
  }

  @test "a state can be combined with itself"() {
    let filename = "foo/bar/self-combinator.css";
    let inputCSS = `:scope[big] + :scope[big]::after { content: "" }`;
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
      :scope:checked + :scope[when-checked] {
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
                    :scope[font=big] { transform: scale(2); }`;
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
                    :scope[size='1dp'] { transform: scale(2); }`;
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
                    :scope[size="1dp"] { transform: scale(2); }`;
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
    let inputCSS = `:scope[font=big], :scope[font=really-big] { transform: scale(2); }`;
    return this.process(filename, inputCSS).then((result) => {
      assert.deepEqual(
        result.css.toString(),
        ".test-state--font-big, .test-state--font-really-big { transform: scale( 2 ); }\n",
      );
    });
  }

  @test "a exclusive state can be combined with itself"() {
    let filename = "foo/bar/self-combinator.css";
    let inputCSS = `:scope[font=big] + :scope[font=big]::after { content: "" }`;
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
                    :scope[visible] .my-class { display: block; }`;
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
                    .my-class[visible] { display: block; }`;
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
                    :scope[translucent] .my-class[visible] { display: block; opacity: 0.75; }`;
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
