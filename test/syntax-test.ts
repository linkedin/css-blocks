import { suite, test, skip } from "mocha-typescript";
import cssBlocks = require("../src/cssBlocks");
import { assert } from "chai";

import BEMProcessor from "./util/BEMProcessor";
import { MockImportRegistry } from "./util/MockImportRegistry";

import * as postcss from "postcss";

@suite("In BEM output mode")
export class BEMOutputMode extends BEMProcessor {
  @test "replaces block with the blockname from the file"() {
    let filename = "foo/bar/test-block.css";
    let inputCSS = `.root {color: red;}`;
    return this.process(filename, inputCSS).then((result) => {
      assert.deepEqual(
        result.css.toString(),
        ".test-block { color: red; }\n"
      );
    });
  }

  @test "handles pseudoclasses on the .root"() {
    let filename = "foo/bar/test-block-pseudos.css";
    let inputCSS = `.root {color: #111;}
                    .root:hover { font-weight: bold; }`;
    return this.process(filename, inputCSS).then((result) => {
      assert.deepEqual(
        result.css.toString(),
        ".test-block-pseudos { color: #111; }\n" +
        ".test-block-pseudos:hover { font-weight: bold; }\n"
      );
    });
  }

  @test "handles states"() {
    let filename = "foo/bar/test-state.css";
    let inputCSS = `.root {color: #111;}
                    [state|big] { transform: scale(2); }`;
    return this.process(filename, inputCSS).then((result) => {
      assert.deepEqual(
        result.css.toString(),
        ".test-state { color: #111; }\n" +
        ".test-state--big { transform: scale( 2 ); }\n"
      );
    });
  }

  @test "handles comma-delimited states"() {
    let filename = "foo/bar/test-state.css";
    let inputCSS = `[state|big], [state|really-big] { transform: scale(2); }`;
    return this.process(filename, inputCSS).then((result) => {
      assert.deepEqual(
        result.css.toString(),
        ".test-state--big, .test-state--really-big { transform: scale( 2 ); }\n"
      );
    });
  }

  @test "a state can be combined with itself"() {
    let filename = "foo/bar/self-combinator.css";
    let inputCSS = `[state|big] + [state|big]::after { content: "" }`;
    return this.process(filename, inputCSS).then((result) => {
      assert.deepEqual(
        result.css.toString(),
        ".self-combinator--big + .self-combinator--big::after { content: \"\"; }\n"
      );
    });
  }

  @test "handles exclusive states"() {
    let filename = "foo/bar/test-state.css";
    let inputCSS = `.root {color: #111;}
                    [state|font=big] { transform: scale(2); }`;
    return this.process(filename, inputCSS).then((result) => {
      assert.deepEqual(
        result.css.toString(),
        ".test-state { color: #111; }\n" +
        ".test-state--font-big { transform: scale( 2 ); }\n"
      );
    });
  }

  @test "handles comma-delimited exclusive states"() {
    let filename = "foo/bar/test-state.css";
    let inputCSS = `[state|font=big], [state|font=really-big] { transform: scale(2); }`;
    return this.process(filename, inputCSS).then((result) => {
      assert.deepEqual(
        result.css.toString(),
        ".test-state--font-big, .test-state--font-really-big { transform: scale( 2 ); }\n"
      );
    });
  }

  @test "a exclusive state can be combined with itself"() {
    let filename = "foo/bar/self-combinator.css";
    let inputCSS = `[state|font=big] + [state|font=big]::after { content: "" }`;
    return this.process(filename, inputCSS).then((result) => {
      assert.deepEqual(
        result.css.toString(),
        ".self-combinator--font-big + .self-combinator--font-big::after { content: \"\"; }\n"
      );
    });
  }

  @test "handles classes"() {
    let filename = "foo/bar/test-class.css";
    let inputCSS = `.root {color: #111;}
                    .my-class { display: block; }`;
    return this.process(filename, inputCSS).then((result) => {
      assert.deepEqual(
        result.css.toString(),
        ".test-class { color: #111; }\n" +
        ".test-class__my-class { display: block; }\n"
      );
    });
  }

  @test "handles classes with states"() {
    let filename = "foo/bar/stateful-class.css";
    let inputCSS = `.root {color: #111;}
                    .my-class { display: none; }
                    [state|visible] .my-class { display: block; }`;
    return this.process(filename, inputCSS).then((result) => {
      assert.deepEqual(
        result.css.toString(),
        ".stateful-class { color: #111; }\n" +
        ".stateful-class__my-class { display: none; }\n" +
        ".stateful-class--visible .stateful-class__my-class { display: block; }\n"
      );
    });
  }

  @test "handles classes with class states"() {
    let filename = "foo/bar/stateful-class.css";
    let inputCSS = `.root {color: #111;}
                    .my-class { display: none; }
                    .my-class[state|visible] { display: block; }`;
    return this.process(filename, inputCSS).then((result) => {
      assert.deepEqual(
        result.css.toString(),
        ".stateful-class { color: #111; }\n" +
        ".stateful-class__my-class { display: none; }\n" +
        ".stateful-class__my-class--visible { display: block; }\n"
      );
    });
  }

  @test "handles root states with class states"() {
    let filename = "foo/bar/stateful.css";
    let inputCSS = `.root {color: #111;}
                    .my-class { display: none; }
                    [state|translucent] .my-class[state|visible] { display: block; opacity: 0.75; }`;
    return this.process(filename, inputCSS).then((result) => {
      assert.deepEqual(
        result.css.toString(),
        ".stateful { color: #111; }\n" +
        ".stateful__my-class { display: none; }\n" +
        ".stateful--translucent .stateful__my-class--visible { display: block; opacity: .75; }\n"
      );
    });
  }
}

@suite("Block Syntax")
export class StraightJacket extends BEMProcessor {
  assertError(errorType: typeof cssBlocks.CssBlockError, message: string, promise: postcss.LazyResult) {
    return promise.then(
      () => {
        assert(false, `Error ${errorType.name} was not raised.`);
      },
      (reason) => {
        assert(reason instanceof errorType, reason.toString());
        assert.deepEqual(reason.message, message);
      });
  }

  @test "catches invalid states"() {
    let filename = "foo/bar/test-state.css";
    let inputCSS = `.root {color: #111;}
                    [state|asdf^=foo] { transform: scale(2); }`;
    return this.assertError(
      cssBlocks.InvalidBlockSyntax,
      "A state with a value must use the = operator (found ^= instead). (foo/bar/test-state.css:2:21)",
      this.process(filename, inputCSS));
  }

  @test "cannot combine two different states"() {
    let filename = "foo/bar/illegal-state-combinator.css";
    let inputCSS = `[state|a] [state|b] { float: left; }`;
    return this.assertError(
      cssBlocks.InvalidBlockSyntax,
      "Distinct states cannot be combined: [state|a] [state|b]" +
        " (foo/bar/illegal-state-combinator.css:1:1)",
      this.process(filename, inputCSS));
  }

  @test "cannot combine two different exclusive states"() {
    let filename = "foo/bar/illegal-state-combinator.css";
    let inputCSS = `[state|a] [state|exclusive=b] { float: left; }`;
    return this.assertError(
      cssBlocks.InvalidBlockSyntax,
      "Distinct states cannot be combined: [state|a] [state|exclusive=b]" +
        " (foo/bar/illegal-state-combinator.css:1:1)",
      this.process(filename, inputCSS));
  }

  @test "disallows combining classes"() {
    let filename = "foo/bar/illegal-class-combinator.css";
    let inputCSS = `.root {color: #111;}
                    .my-class .another-class { display: block; }`;
    return this.assertError(
      cssBlocks.InvalidBlockSyntax,
      "Distinct classes cannot be combined: .my-class .another-class" +
        " (foo/bar/illegal-class-combinator.css:2:21)",
      this.process(filename, inputCSS));
  }

  @test "disallows sibling combinators with root states"() {
    let filename = "foo/bar/illegal-class-combinator.css";
    let inputCSS = `.root {color: #111;}
                    [state|foo] ~ .another-class { display: block; }`;
    return this.assertError(
      cssBlocks.InvalidBlockSyntax,
      "A class is never a sibling of a state: [state|foo] ~ .another-class" +
        " (foo/bar/illegal-class-combinator.css:2:21)",
      this.process(filename, inputCSS));
  }

  @test "disallows sibling combinators with root states after adjacent root"() {
    let filename = "foo/bar/illegal-class-combinator.css";
    let inputCSS = `.root {color: #111;}
                    [state|foo] + [state|foo] ~ .another-class { display: block; }`;
    return this.assertError(
      cssBlocks.InvalidBlockSyntax,
      "A class is never a sibling of a state: [state|foo] + [state|foo] ~ .another-class" +
        " (foo/bar/illegal-class-combinator.css:2:21)",
      this.process(filename, inputCSS));
  }

  @test "disallows adjacent sibling combinators with root states"() {
    let filename = "foo/bar/illegal-class-combinator.css";
    let inputCSS = `.root {color: #111;}
                    [state|foo] + .another-class { display: block; }`;
    return this.assertError(
      cssBlocks.InvalidBlockSyntax,
      "A class is never a sibling of a state: [state|foo] + .another-class" +
        " (foo/bar/illegal-class-combinator.css:2:21)",
      this.process(filename, inputCSS));
  }

  @test "disallows combining classes without a combinator"() {
    let filename = "foo/bar/illegal-class-combinator.css";
    let inputCSS = `.root {color: #111;}
                    .my-class.another-class { display: block; }`;
    return this.assertError(
      cssBlocks.InvalidBlockSyntax,
      "Distinct classes cannot be combined: .my-class.another-class" +
        " (foo/bar/illegal-class-combinator.css:2:21)",
      this.process(filename, inputCSS));
  }

  @skip
  @test "disallows pseudos not attached to a block object."() {
  }

  @skip
  @test "disallows attribute selectors except for states."() {
  }

  @test "disallows a state before a class for the same element."() {
    let filename = "foo/bar/illegal-class-combinator.css";
    let inputCSS = `.root {color: #111;}
                    [state|foo].another-class { display: block; }`;
    return this.assertError(
      cssBlocks.InvalidBlockSyntax,
      "The class must precede the state: [state|foo].another-class" +
        " (foo/bar/illegal-class-combinator.css:2:21)",
      this.process(filename, inputCSS));
  }
  @test "disallows combining blocks and classes without a combinator"() {
    let filename = "foo/bar/illegal-class-combinator.css";
    let inputCSS = `.root {color: #111;}
                    .root.another-class { display: block; }`;
    return this.assertError(
      cssBlocks.InvalidBlockSyntax,
      "Cannot have block and class on the same DOM element: .root.another-class" +
        " (foo/bar/illegal-class-combinator.css:2:21)",
      this.process(filename, inputCSS));
  }
  @test "disallows combining states and block without a combinator"() {
    let filename = "foo/bar/illegal-class-combinator.css";
    let inputCSS = `.root {color: #111;}
                    .root[state|foo] { display: block; }`;
    return this.assertError(
      cssBlocks.InvalidBlockSyntax,
      "It's redundant to specify state with the block root: .root[state|foo]" +
        " (foo/bar/illegal-class-combinator.css:2:21)",
      this.process(filename, inputCSS));
  }
  @test "disallows !important"() {
    let filename = "foo/bar/no-important.css";
    let inputCSS = `.root {color: #111 !important;}`;
    return this.assertError(
      cssBlocks.InvalidBlockSyntax,
      "!important is not allowed for `color` in `.root` (foo/bar/no-important.css:1:8)",
      this.process(filename, inputCSS));
  }
}

@suite("Block References")
export class BlockReferences extends BEMProcessor {
  @test "can import another block"() {
    let imports = new MockImportRegistry();
    imports.registerSource("foo/bar/imported.css",
      `.root { color: purple; }
       [state|large] { font-size: 20px; }
       [state|theme=red] { color: red; }
       .foo   { float: left;   }
       .foo[state|small] { font-size: 5px; }
       .foo[state|font=fancy] { font-family: fancy; }`
    );

    let filename = "foo/bar/test-block.css";
    let inputCSS = `@block-reference "./imported.css";
                    @block-debug imported to comment;
                    .root { color: red; }
                    .b[state|big] {color: blue;}`;

    return this.process(filename, inputCSS, {importer: imports.importer()}).then((result) => {
      imports.assertImported("foo/bar/imported.css");
      assert.deepEqual(
        result.css.toString(),
        `/* Source: foo/bar/imported.css\n` +
        "   .root => .imported\n" +
        "   [state|theme=red] => .imported--theme-red\n" +
        "   [state|large] => .imported--large\n" +
        "   .foo => .imported__foo\n" +
        "   .foo[state|font=fancy] => .imported__foo--font-fancy\n" +
        "   .foo[state|small] => .imported__foo--small */\n" +
        ".test-block { color: red; }\n" +
        ".test-block__b--big { color: blue; }\n"
      );
    });
  }
}