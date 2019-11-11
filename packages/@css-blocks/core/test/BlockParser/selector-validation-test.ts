import { assert } from "chai";
import { skip, suite, test } from "mocha-typescript";

import { assertError, assertMultipleErrors } from "../util/assertError";
import { BEMProcessor } from "../util/BEMProcessor";

const { InvalidBlockSyntax } = require("../util/postcss-helper");

@suite("Block Selector Validation")
export class StraightJacket extends BEMProcessor {

  @skip // this is harder than it looks
  @test "allows combining class states without a combinator"() {
    let filename = "foo/bar/multi-class-state.css";
    let inputCSS = `.foo {color: #111;}
                    .foo[first][second] { display: block; }`;

    return this.process(filename, inputCSS).then((result) => {
      assert.deepEqual(
        result.css.toString(),
        ".multi-class-state__foo { color: #111; }\n" +
        ".multi-class-state__foo--first.multi-class-state__foo--second { display: block; }\n",
      );
    });
  }

  @test "catches invalid states"() {
    let filename = "foo/bar/test-state.css";
    let inputCSS = `:scope {color: #111;}
                    :scope[asdf^=foo] { transform: scale(2); }`;

    return assertMultipleErrors([{
        type: InvalidBlockSyntax,
        message: "A state with a value must use the = operator (found ^= instead). (foo/bar/test-state.css:2:27)",
      }],
                                this.process(filename, inputCSS));
  }

  @test "catches states with colon instead of bar"() {
    let filename = "foo/bar/test-state.css";
    let inputCSS = `:scope {color: #111;}
                    :scope[state:asdf=foo] { transform: scale(2); }`;
    return assertError(
      InvalidBlockSyntax,
      'Unexpected ":" found. (foo/bar/test-state.css:2:21)',
      this.process(filename, inputCSS));
  }

  @test "cannot combine two different states"() {
    let filename = "foo/bar/illegal-state-combinator.css";
    let inputCSS = `:scope[a] :scope[b] { float: left; }`;

    return assertMultipleErrors([{
        type: InvalidBlockSyntax,
        message: "Illegal scoping of a root-level state: :scope[a] :scope[b]" + " (foo/bar/illegal-state-combinator.css:1:10)",
      }],
                                this.process(filename, inputCSS));
  }

  @test "cannot combine two different exclusive states"() {
    let filename = "foo/bar/illegal-state-combinator.css";
    let inputCSS = `:scope[a] :scope[exclusive=b] { float: left; }`;
    return assertMultipleErrors([{
        type: InvalidBlockSyntax,
        message: "Illegal scoping of a root-level state: :scope[a] :scope[exclusive=b]" + " (foo/bar/illegal-state-combinator.css:1:10)",
      }],
                                this.process(filename, inputCSS));
  }

  @test "disallows combining classes"() {
    let filename = "foo/bar/illegal-class-combinator.css";
    let inputCSS = `:scope {color: #111;}
                    .my-class .another-class { display: block; }`;
    return assertMultipleErrors([{
      type: InvalidBlockSyntax,
      message: "Distinct classes cannot be combined: .my-class .another-class" +
        " (foo/bar/illegal-class-combinator.css:2:31)",
    }],
                                this.process(filename, inputCSS));
  }

  @test "disallows sibling combinators with root states"() {
    let filename = "foo/bar/illegal-class-combinator.css";
    let inputCSS = `:scope {color: #111;}
                    :scope[foo] ~ .another-class { display: block; }`;
    return assertMultipleErrors([{
      type: InvalidBlockSyntax,
      message: "A class cannot be a sibling with a root-level state: :scope[foo] ~ .another-class" +
        " (foo/bar/illegal-class-combinator.css:2:33)",
    }],                         this.process(filename, inputCSS));
  }

  @test "disallows sibling combinators with root states after adjacent root"() {
    let filename = "foo/bar/illegal-class-combinator.css";
    let inputCSS = `:scope {color: #111;}
                    :scope[foo] + :scope[foo] ~ .another-class { display: block; }`;
    return assertMultipleErrors([{
      type: InvalidBlockSyntax,
      message: "A class cannot be a sibling with a root-level state: :scope[foo] + :scope[foo] ~ .another-class" +
        " (foo/bar/illegal-class-combinator.css:2:47)",
    }],                         this.process(filename, inputCSS));
  }

  @test "disallows adjacent sibling combinators with root states"() {
    let filename = "foo/bar/illegal-class-combinator.css";
    let inputCSS = `:scope {color: #111;}
                    :scope[foo] + .another-class { display: block; }`;
    return assertMultipleErrors([{
      type: InvalidBlockSyntax,
      message: "A class cannot be a sibling with a root-level state: :scope[foo] + .another-class" +
        " (foo/bar/illegal-class-combinator.css:2:33)",
      }],                       this.process(filename, inputCSS));
  }

  @test "disallows combining classes without a combinator"() {
    let filename = "foo/bar/illegal-class-combinator.css";

    let inputCSS = `:scope {color: #111;}
                    .my-class.another-class { display: block; }`;
    return assertMultipleErrors([{
        type: InvalidBlockSyntax,
        message: "Two distinct classes cannot be selected on the same element: .my-class.another-class" +
        " (foo/bar/illegal-class-combinator.css:2:30)",
      }],                       this.process(filename, inputCSS));
  }

  @test "allows combining states without a combinator"() {
    let filename = "foo/bar/multi-state.css";
    let inputCSS = `:scope {color: #111;}
                    :scope[first][second] { display: block; }`;
    return this.process(filename, inputCSS).then((result) => {
      assert.deepEqual(
        result.css.toString(),
        ".multi-state { color: #111; }\n" +
        ".multi-state--first.multi-state--second { display: block; }\n",
      );
    });
  }

  @test "disallows element names attached to states."() {
    let filename = "foo/bar/illegal.css";
    let inputCSS = `div[foo] { display: block; }`;
    return assertError(
      InvalidBlockSyntax,
      "Tag name selectors are not allowed: div[foo]" +
        " (foo/bar/illegal.css:1:1)",
      this.process(filename, inputCSS));
  }

  @test "disallows stand-alone attribute selectors except for states."() {
    let filename = "foo/bar/illegal-class-combinator.css";
    let inputCSS = `:scope [href] { display: block; }`;
    return assertError(
      InvalidBlockSyntax,
      "States without an explicit :scope or class selector are not supported: " +
        ":scope [href] (foo/bar/illegal-class-combinator.css:1:8)",
      this.process(filename, inputCSS));
  }

  // It's possible we can relax this constraint, but I want to see
  // concrete use cases to understand why it's necessary -- states are more optimizable.
  // and I think this forces styling concerns to be kept more decoupled.
  @test "disallows attribute selectors except for states."() {
    let filename = "foo/bar/illegal-class-combinator.css";
    let inputCSS = `:scope[html|href] { display: block; }`;
    return assertError(
      InvalidBlockSyntax,
      "Cannot select attributes in the `html` namespace: :scope[html|href] " +
        "(foo/bar/illegal-class-combinator.css:1:7)",
      this.process(filename, inputCSS));
  }

  @test "disallows a state before a class for the same element."() {
    let filename = "foo/bar/illegal-class-combinator.css";
    let inputCSS = `:scope {color: #111;}
                    :scope[foo].another-class { display: block; }`;
    return assertMultipleErrors([{
      type: InvalidBlockSyntax,
      message: "The class must precede the state: :scope[foo].another-class" +
        " (foo/bar/illegal-class-combinator.css:2:21)",
      }],                       this.process(filename, inputCSS));
  }

  @test "disallows combining blocks and classes without a combinator"() {
    let filename = "foo/bar/illegal-class-combinator.css";
    let inputCSS = `:scope {color: #111;}
                    :scope.another-class { display: block; }`;
    return assertMultipleErrors([{
      type: InvalidBlockSyntax,
      message: ".another-class cannot be on the same element as :scope: :scope.another-class" +
        " (foo/bar/illegal-class-combinator.css:2:21)",
    }],                         this.process(filename, inputCSS));
  }

  @test "disallows bare state selectors (for now!)"() {
    let filename = "foo/bar/illegal-class-combinator.css";
    let inputCSS = `:scope {color: #111;}
                    [foo] { display: block; }`;
    return assertError(
      InvalidBlockSyntax,
      "States without an explicit :scope or class selector are not supported: [foo]" +
        " (foo/bar/illegal-class-combinator.css:2:21)",
      this.process(filename, inputCSS));
  }

  @test "disallows !important"() {
    let filename = "foo/bar/no-important.css";
    let inputCSS = `:scope {color: #111 !important;}`;
    return assertError(
      InvalidBlockSyntax,
      "!important is not allowed for `color` in `:scope` (foo/bar/no-important.css:1:9)",
      this.process(filename, inputCSS));
  }
}
