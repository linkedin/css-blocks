import { assert } from "chai";
import { suite, test, skip } from "mocha-typescript";
import * as postcss from "postcss";

import BEMProcessor from "./util/BEMProcessor";
import { MockImportRegistry } from "./util/MockImportRegistry";

import cssBlocks = require("../src/cssBlocks");

@suite("Resolves conflicts")
export class BlockInheritance extends BEMProcessor {
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

    return this.assertError(
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

    return this.assertError(
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

    return this.assertError(
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

  @skip
  @test "inheritance conflicts automatically resolve to the base class"() {
  }

  @skip
  @test "compatible but different combinators"() {
  }

  @skip
  @test "incompatible combinators"() {
  }

  @skip
  @test "handles dual state contexts when not sharing a block root"() {
  }
}
