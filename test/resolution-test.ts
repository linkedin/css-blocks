import { assert } from "chai";
import { suite, test, skip } from "mocha-typescript";

import BEMProcessor from "./util/BEMProcessor";
import { MockImportRegistry } from "./util/MockImportRegistry";
import assertError from "./util/assertError";

import cssBlocks = require("../src/cssBlocks");

@suite("Resolves conflicts")
export class BlockInheritance extends BEMProcessor {
  @test "results in an error betwixt properties"() {
    let imports = new MockImportRegistry();
    imports.registerSource("a.css",
      `.foo { border: 3px; }`
    );

    let filename = "conflicts.css";
    let inputCSS = `@block-reference "./a.css";
                    .b {
                      border: 1px solid red;
                      border: resolve("a.foo");
                      border: none;
                    }`;

    return assertError(
      cssBlocks.InvalidBlockSyntax,
      "Resolving border must happen either before or after all other values for border." +
        " (conflicts.css:4:23)",
      this.process(filename, inputCSS, {importer: imports.importer()})
    );
  }

  @test "results in an error without concrete value"() {
    let imports = new MockImportRegistry();
    imports.registerSource("a.css",
      `.foo { border: 3px; }`
    );

    let filename = "conflicts.css";
    let inputCSS = `@block-reference "./a.css";
                    .b {
                      border: resolve("a.foo");
                    }`;

    return assertError(
      cssBlocks.InvalidBlockSyntax,
      "Cannot resolve border without a concrete value." +
        " (conflicts.css:3:23)",
      this.process(filename, inputCSS, {importer: imports.importer()})
    );
  }

  @test "with a yield"() {
    let imports = new MockImportRegistry();
    imports.registerSource("other.css",
      `.nav { border: 1px solid black; }`
    );

    let filename = "conflicts.css";
    let inputCSS = `@block-reference "./other.css";
                    .header {
                      border: none;
                      border: resolve("other.nav");
                    }`;

    return this.process(filename, inputCSS, {importer: imports.importer()}).then((result) => {
      imports.assertImported("other.css");
      assert.deepEqual(
        result.css.toString(),
        ".conflicts__header { border: none; }\n" +
        ".other__nav.conflicts__header { border: 1px solid black; }\n"
      );
    });
  }

  @test "with an override"() {
    let imports = new MockImportRegistry();
    imports.registerSource("other.css",
      `.nav { border: 1px solid black; color: red; }`
    );

    let filename = "conflicts.css";
    let inputCSS = `@block-reference "./other.css";
                    .header {
                      width: 100%;
                      border: resolve("other.nav");
                      border: none;
                    }`;

    return this.process(filename, inputCSS, {importer: imports.importer()}).then((result) => {
      imports.assertImported("other.css");
      assert.deepEqual(
        result.css.toString(),
        ".conflicts__header { width: 100%; border: none; }\n" +
        ".other__nav.conflicts__header { border: none; }\n"
      );
    });
  }

  @test "for states combined with the resolution target"() {
    let imports = new MockImportRegistry();
    imports.registerSource("grid.css",
      `.root {
         display: grid;
         grid-template-areas: "nav     nav  nav  nav"
                              "sidebar main main main"; }
       .main    { grid-area: main;    font-size: 16px;         }
       .nav     { grid-area: nav;     border: 1px solid black; }
       .sidebar { grid-area: sidebar; background-color: #ccc;  }
       [state|big] .main { font-size: 30px; }
       [state|big] > .main { font-size: 40px; }
       [state|big] > .main + .main { font-size: 20px; }`
    );

    let filename = "conflicts.css";
    let inputCSS = `@block-reference "./grid.css";
                    .article {
                      font-size: 18px;
                      font-size: resolve("grid.main");
                    }`;

    return this.process(filename, inputCSS, {importer: imports.importer()}).then((result) => {
      imports.assertImported("grid.css");
      assert.deepEqual(
        result.css.toString(),
        ".conflicts__article { font-size: 18px; }\n" +
        ".grid__main.conflicts__article { font-size: 16px; }\n" +
        ".grid--big .grid__main.conflicts__article { font-size: 30px; }\n" +
        ".grid--big > .grid__main.conflicts__article { font-size: 40px; }\n" +
        ".grid--big > .grid__main + .grid__main.conflicts__article { font-size: 20px; }\n"
      );
    });
  }

  @test "for states combined with the resolution source"() {
    let imports = new MockImportRegistry();
    imports.registerSource("target.css",
      `.main    { color: blue; }
       [state|hidden] .main { color: transparent; }`
    );

    let filename = "conflicts.css";
    let inputCSS = `@block-reference "./target.css";
                    [state|happy] .article {
                      color: green;
                      color: resolve("target.main");
                    }`;

    return this.process(filename, inputCSS, {importer: imports.importer()}).then((result) => {
      imports.assertImported("target.css");
      assert.deepEqual(
        result.css.toString(),
        ".conflicts--happy .conflicts__article { color: green; }\n" +
        ".conflicts--happy .target__main.conflicts__article { color: blue; }\n" +
        ".target--hidden.conflicts--happy .target__main.conflicts__article,\n" +
        ".target--hidden .conflicts--happy .target__main.conflicts__article,\n" +
        ".conflicts--happy .target--hidden .target__main.conflicts__article { color: transparent; }\n"
      );
    });
  }

  @test "for states combined with the resolution source involving child combinators"() {
    let imports = new MockImportRegistry();
    imports.registerSource("target.css",
      `.main    { color: blue; }
       [state|hidden] > .main { color: transparent; }`
    );

    let filename = "conflicts.css";
    let inputCSS = `@block-reference "./target.css";
                    [state|happy] .article {
                      color: green;
                      color: resolve("target.main");
                    }`;

    return this.process(filename, inputCSS, {importer: imports.importer()}).then((result) => {
      imports.assertImported("target.css");
      assert.deepEqual(
        result.css.toString(),
        ".conflicts--happy .conflicts__article { color: green; }\n" +
        ".conflicts--happy .target__main.conflicts__article { color: blue; }\n" +
        ".target--hidden.conflicts--happy > .target__main.conflicts__article,\n" +
        ".conflicts--happy .target--hidden > .target__main.conflicts__article { color: transparent; }\n"
      );
    });
  }

  @test "for states combined with the resolution source both involving child combinators"() {
    let imports = new MockImportRegistry();
    imports.registerSource("target.css",
      `.main    { color: blue; }
       [state|hidden] > .main { color: transparent; }`
    );

    let filename = "conflicts.css";
    let inputCSS = `@block-reference "./target.css";
                    [state|happy] > .article {
                      color: green;
                      color: resolve("target.main");
                    }`;

    return this.process(filename, inputCSS, {importer: imports.importer()}).then((result) => {
      imports.assertImported("target.css");
      assert.deepEqual(
        result.css.toString(),
        ".conflicts--happy > .conflicts__article { color: green; }\n" +
        ".conflicts--happy > .target__main.conflicts__article { color: blue; }\n" +
        ".target--hidden.conflicts--happy > .target__main.conflicts__article { color: transparent; }\n"
      );
    });
  }

  @skip
  @test "of short-hand properties conflicting with long-hand properties"() {
    let imports = new MockImportRegistry();
    imports.registerSource("grid.css",
      `.root {
         display: grid;
         grid-template-areas: "nav     nav  nav  nav"
                              "sidebar main main main"; }
       .main    { grid-area: main;    font-size: 16px;         }
       .nav     { grid-area: nav;     border: 1px solid black; }
       .sidebar { grid-area: sidebar; background-color: #ccc;  }
       [state|big] .main { font-size: 30px; }
       [state|big] > .main { font-size: 40px; }
       [state|big] > .main + .main { font-size: 20px; }`
    );

    let filename = "conflicts.css";
    let inputCSS = `@block-reference "./grid.css";
                    .header {
                      border-bottom: 2px;
                      border-bottom: resolve("grid.nav");
                    }
                    .another-header {
                      border-width: 3px;
                      border-width: resolve("grid.nav");
                    }
                    .third-header {
                      border-bottom-width: 3px;
                      border-bottom-width: resolve("grid.nav");
                    }`;

    return this.process(filename, inputCSS, {importer: imports.importer()}).then((result) => {
      imports.assertImported("grid.css");
      assert.deepEqual(
        result.css.toString(),
        ".conflicts__header { border-bottom: 2px; }\n" +
        ".conflicts__header.grid__nav { border-bottom: 1px solid black }\n" +
        ".conflicts__another-header { border-width: 3px; }\n" +
        ".conflicts__another-header.grid__nav { border-width: 1px; }\n" +
        ".conflicts__third-header { border-bottom-width: 3px; }\n" +
        ".conflicts__third-header.grid__nav { border-bottom-width: 1px; }\n"
      );
    });
  }

  @test "when the property is repeated all values are copied."() {
    let imports = new MockImportRegistry();
    imports.registerSource("other.css",
      `.foo { font-size: 10px; font-size: 0.5rem; }
       .bar { font-size: 99px; font-size: 10rem; }`
    );

    let filename = "conflicts.css";
    let inputCSS = `@block-reference "./other.css";
                    .article {
                      font-size: resolve("other.foo");
                      font-size: 18px;
                      font-size: 2rem;
                      font-size: resolve("other.bar");
                    }`;

    return this.process(filename, inputCSS, {importer: imports.importer()}).then((result) => {
      imports.assertImported("other.css");
      assert.deepEqual(
        result.css.toString(),
        ".conflicts__article { font-size: 18px; font-size: 2rem; }\n" +
        ".other__bar.conflicts__article { font-size: 99px; font-size: 10rem; }\n" +
        ".other__foo.conflicts__article { font-size: 18px; font-size: 2rem; }\n"
      );
    });
  }

  @test "doesn't concern selectors that don't conflict."() {
    let imports = new MockImportRegistry();
    imports.registerSource("other.css",
      `.foo { font-size: 10px; }
       [state|dark] .foo { color: black; }
       .bar { font-size: 99px; }
       [state|dark] .bar { color: dark-gray; }`
    );

    let filename = "conflicts.css";
    let inputCSS = `@block-reference "./other.css";
                    .article {
                      font-size: resolve("other.foo");
                      font-size: 18px;
                      font-size: resolve("other.bar");
                    }`;

    return this.process(filename, inputCSS, {importer: imports.importer()}).then((result) => {
      imports.assertImported("other.css");
      assert.deepEqual(
        result.css.toString(),
        ".conflicts__article { font-size: 18px; }\n" +
        ".other__bar.conflicts__article { font-size: 99px; }\n" +
        ".other__foo.conflicts__article { font-size: 18px; }\n"
      );
    });
  }

  @test "errors when no selectors conflict."() {
    let imports = new MockImportRegistry();
    imports.registerSource("other.css",
      `.foo { font-size: 10px; }`
    );

    let filename = "conflicts.css";
    let inputCSS = `@block-reference "./other.css";
                    .article {
                      border: resolve("other.foo");
                      border: 1px solid green;
                    }`;

    return assertError(
      cssBlocks.InvalidBlockSyntax,
      "There are no conflicting values for border found in any selectors targeting other.foo." +
        " (conflicts.css:3:23)",
      this.process(filename, inputCSS, {importer: imports.importer()})
    );
  }

  @test "doesn't create a resolution if the values are the same but it also doesn't error."() {
    let imports = new MockImportRegistry();
    imports.registerSource("other.css",
      `.nav { border: 1px solid black; }`
    );

    let filename = "conflicts.css";
    let inputCSS = `@block-reference "./other.css";
                    .header {
                      border: 1px solid black;
                      border: resolve("other.nav");
                    }`;

    return this.process(filename, inputCSS, {importer: imports.importer()}).then((result) => {
      imports.assertImported("other.css");
      assert.deepEqual(
        result.css.toString(),
        ".conflicts__header { border: 1px solid black; }\n"
      );
    });
  }

  @test "resolves conflicts against a sub-block"() {
    let imports = new MockImportRegistry();
    imports.registerSource("base.css",
      `.nav { border: 1px solid black; width: 100%; }
       .sidebar { color: blue; }`
    );
    imports.registerSource("other.css",
      `@block-reference "base.css";
       .root { extends: base; }
       .nav { border: 1px solid black; color: red; }`
    );

    let filename = "conflicts.css";
    let inputCSS = `@block-reference "./other.css";
                    .header {
                      width: 80%;
                      width: resolve("other.nav");
                      border: none;
                      border: resolve("other.nav");
                      color: green;
                      color: resolve("other.sidebar");
                    }`;

    return this.process(filename, inputCSS, {importer: imports.importer()}).then((result) => {
      imports.assertImported("other.css");
      imports.assertImported("base.css");
      assert.deepEqual(
        result.css.toString(),
        ".conflicts__header { width: 80%; border: none; color: green; }\n" +
        ".base__sidebar.conflicts__header { color: blue; }\n" +
        ".other__nav.conflicts__header { border: 1px solid black; }\n" +
        ".base__nav.conflicts__header { width: 100%; }\n"
      );
    });
  }

  @test "resolves block roots"() {
    let imports = new MockImportRegistry();
    imports.registerSource("other.css",
      `.root { border: 1px solid black; width: 100%; }`
    );

    let filename = "conflicts.css";
    let inputCSS = `@block-reference "./other.css";
                    .header {
                      border: none;
                      border: resolve("other");
                      width: 100px;
                      width: resolve("other.root");
                    }`;

    return this.process(filename, inputCSS, {importer: imports.importer()}).then((result) => {
      imports.assertImported("other.css");
      assert.deepEqual(
        result.css.toString(),
        ".conflicts__header { border: none; width: 100px; }\n" +
        ".other.conflicts__header { width: 100%; }\n" +
        ".other.conflicts__header { border: 1px solid black; }\n"
      );
    });
  }

  @test "resolves root states"() {
    let imports = new MockImportRegistry();
    imports.registerSource("other.css",
      `[state|foo] { width: 100%; }`
    );

    let filename = "conflicts.css";
    let inputCSS = `@block-reference "./other.css";
                    .header {
                      width: 100px;
                      width: resolve("other[state|foo]");
                    }`;

    return this.process(filename, inputCSS, {importer: imports.importer()}).then((result) => {
      imports.assertImported("other.css");
      assert.deepEqual(
        result.css.toString(),
        ".conflicts__header { width: 100px; }\n" +
        ".other--foo.conflicts__header { width: 100%; }\n"
      );
    });
  }

  @test "resolves class states"() {
    let imports = new MockImportRegistry();
    imports.registerSource("other.css",
      `.asdf[state|foo] { width: 100%; }`
    );

    let filename = "conflicts.css";
    let inputCSS = `@block-reference "./other.css";
                    .header {
                      width: 100px;
                      width: resolve("other.asdf[state|foo]");
                    }`;

    return this.process(filename, inputCSS, {importer: imports.importer()}).then((result) => {
      imports.assertImported("other.css");
      assert.deepEqual(
        result.css.toString(),
        ".conflicts__header { width: 100px; }\n" +
        ".other__asdf--foo.conflicts__header { width: 100%; }\n"
      );
    });
  }

  @test "resolves pseduoelement override"() {
    let imports = new MockImportRegistry();
    imports.registerSource("other.css",
      `.asdf::before { width: 100%; }`
    );

    let filename = "conflicts.css";
    let inputCSS = `@block-reference "./other.css";
                    .header::before {
                      width: 100px;
                      width: resolve("other.asdf");
                    }`;

    return this.process(filename, inputCSS, {importer: imports.importer()}).then((result) => {
      imports.assertImported("other.css");
      assert.deepEqual(
        result.css.toString(),
        ".conflicts__header::before { width: 100px; }\n" +
        ".other__asdf.conflicts__header::before { width: 100%; }\n"
      );
    });
  }
  @test "resolves pseduoelement yield"() {
    let imports = new MockImportRegistry();
    imports.registerSource("other.css",
      `.asdf::before { width: 100%; }`
    );

    let filename = "conflicts.css";
    let inputCSS = `@block-reference "./other.css";
                    .header::before {
                      width: resolve("other.asdf");
                      width: 100px;
                    }`;

    return this.process(filename, inputCSS, {importer: imports.importer()}).then((result) => {
      imports.assertImported("other.css");
      assert.deepEqual(
        result.css.toString(),
        ".conflicts__header::before { width: 100px; }\n" +
        ".other__asdf.conflicts__header::before { width: 100px; }\n"
      );
    });
  }

  @test "compatible but different combinators"() {
    let imports = new MockImportRegistry();
    imports.registerSource("target.css",
      `.adjacent + .adjacent { border: 1px; }
       .sibling ~ .sibling   { color: blue; }
       [state|ancestor] .descendant { float: left; }
       [state|parent] > .child { position: relative; }`
    );

    let filename = "conflicts.css";
    let inputCSS = `@block-reference "./target.css";
                    .adjacent + .adjacent { color: green; color: resolve("target.sibling"); }
                    .sibling ~ .sibling   { border: 2px; border: resolve("target.adjacent"); }
                    [state|ancestor] .descendant { position: absolute; position: resolve("target.child"); }
                    [state|parent] > .child { float: right; float: resolve("target.descendant"); }`;

    return this.process(filename, inputCSS, {importer: imports.importer()}).then((result) => {
      imports.assertImported("target.css");
      assert.deepEqual(
        result.css.toString(),
        ".conflicts__adjacent + .conflicts__adjacent { color: green; }\n" +
        ".target__sibling.conflicts__adjacent + .target__sibling.conflicts__adjacent,\n" +
        ".target__sibling ~ .conflicts__adjacent + .target__sibling.conflicts__adjacent { color: blue; }\n" +

        ".conflicts__sibling ~ .conflicts__sibling { border: 2px; }\n" +
        ".target__adjacent.conflicts__sibling + .target__adjacent.conflicts__sibling,\n" +
        ".conflicts__sibling ~ .target__adjacent + .target__adjacent.conflicts__sibling { border: 1px; }\n" +

        ".conflicts--ancestor .conflicts__descendant { position: absolute; }\n" +
        ".target--parent.conflicts--ancestor > .target__child.conflicts__descendant,\n" +
        ".conflicts--ancestor .target--parent > .target__child.conflicts__descendant { position: relative; }\n" +

        ".conflicts--parent > .conflicts__child { float: right; }\n" +
        ".target--ancestor.conflicts--parent > .target__descendant.conflicts__child,\n" +
        ".target--ancestor .conflicts--parent > .target__descendant.conflicts__child { float: left; }\n"
      );
    });
  }

  @skip
  @test "handles custom properties and shorthand/longhand conflict resolution somehow"() {
  }

  @test "for states combined with the resolution source has adjacent selectors"() {
    let imports = new MockImportRegistry();
    imports.registerSource("target.css",
      `.main    { color: blue; }
       .main + .main { color: transparent; }`
    );

    let filename = "conflicts.css";
    let inputCSS = `@block-reference "./target.css";
                    [state|happy] > .article {
                      color: green;
                      color: resolve("target.main");
                    }`;

    return this.process(filename, inputCSS, {importer: imports.importer()}).then((result) => {
      imports.assertImported("target.css");
      assert.deepEqual(
        result.css.toString(),
        ".conflicts--happy > .conflicts__article { color: green; }\n" +
        ".conflicts--happy > .target__main.conflicts__article { color: blue; }\n" +
        ".conflicts--happy > .target__main + .target__main.conflicts__article { color: transparent; }\n"
      );
    });
  }

  @test "resolving to your own block is illegal"() {
    let filename = "conflicts.css";
    let inputCSS = `[state|happy] > .article {
                      color: green;
                      color: resolve(".bio");
                    }
                    [state|sad] > .bio {
                      color: blue;
                    }`;

    return assertError(
      cssBlocks.InvalidBlockSyntax,
      "Cannot resolve conflicts with your own block." +
        " (conflicts.css:3:23)",
      this.process(filename, inputCSS)
    );
  }
  @test "resolving to your super block is illegal"() {
    let imports = new MockImportRegistry();
    imports.registerSource("super.css",
      `.main    { color: blue; }`
    );

    let filename = "conflicts.css";
    let inputCSS = `@block-reference "super.css";
                    .root { extends: super; }
                    .article {
                      color: green;
                      color: resolve(".main");
                    }`;

    return assertError(
      cssBlocks.InvalidBlockSyntax,
      "Cannot resolve conflicts with ancestors of your own block." +
        " (conflicts.css:5:23)",
      this.process(filename, inputCSS, {importer: imports.importer()})
    );
  }
}
