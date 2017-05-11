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
        assert.equal(reason.message, message);
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

  @skip
  @test "with an underride"() {
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
      assert.equal(
        result.css.toString(),
        ".conflicts__header { border: none; }\n" +
        ".conflicts__header.other__nav { border: 1px solid black; }\n"
      );
    });
  }

  @skip
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
      assert.equal(
        result.css.toString(),
        ".conflicts__header { width: 100%; border: none; }\n" +
        ".conflicts__header.other__nav { border: none; }\n"
      );
    });
  }

  @skip
  @test "for states with combinators"() {
    let imports = new MockImportRegistry();
    imports.registerSource("grid.css",
      `:block {
         display: grid;
         grid-template-areas: "nav     nav  nav  nav"
                              "sidebar main main main"; }
       .main    { grid-area: main;    font-size: 16px;         }
       .nav     { grid-area: nav;     border: 1px solid black; }
       .sidebar { grid-area: sidebar; background-color: #ccc;  }
       :state(big) .main { font-size: 30px; }
       :state(big) > .main { font-size: 40px; }
       :state(big) > .main + .main { font-size: 20px; }`
    );

    let filename = "conflicts.css";
    let inputCSS = `@block-reference "./grid.css";
                    .article {
                      font-size: 18px;
                      font-size: resolve("grid.main");
                    }`;

    return this.process(filename, inputCSS, {importer: imports.importer()}).then((result) => {
      imports.assertImported("grid.css");
      assert.equal(
        result.css.toString(),
        ".conflicts__article { font-size: 18px; }\n" +
        ".conflicts__article.grid__main { font-size: 16px; }\n" +
        ".grid--big .conflicts__article.grid__main { font-size: 30px; }\n" +
        ".grid--big > .conflicts__article.grid__main { font-size: 40px; }\n" +
        ".grid--big > .conflicts__article.grid__main .conflicts__article.grid__main { font-size: 20px; }\n"
      );
    });
  }

  @skip
  @test "of short-hand properties conflicting with long-hand properties"() {
    let imports = new MockImportRegistry();
    imports.registerSource("grid.css",
      `:block {
         display: grid;
         grid-template-areas: "nav     nav  nav  nav"
                              "sidebar main main main"; }
       .main    { grid-area: main;    font-size: 16px;         }
       .nav     { grid-area: nav;     border: 1px solid black; }
       .sidebar { grid-area: sidebar; background-color: #ccc;  }
       :state(big) .main { font-size: 30px; }
       :state(big) > .main { font-size: 40px; }
       :state(big) > .main + .main { font-size: 20px; }`
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
      assert.equal(
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

  @skip
  @test "when the property is repeated all values are copied."() {
    let imports = new MockImportRegistry();
    imports.registerSource("grid.css",
      `:block {
         display: grid;
         grid-template-areas: "nav     nav  nav  nav"
                              "sidebar main main main"; }
       .main    { grid-area: main;    font-size: 16px;         }
       .nav     { grid-area: nav;     border: 1px solid black; }
       .sidebar { grid-area: sidebar; background-color: #ccc;  }
       :state(big) .main { font-size: 30px; }
       :state(big) > .main { font-size: 40px; }
       :state(big) > .main + .main { font-size: 20px; }`
    );

    let filename = "conflicts.css";
    let inputCSS = `@block-reference "./grid.css";
                    .article {
                      font-size: resolve("grid.main");
                      font-size: 18px;
                      font-size: 2rem;
                    }`;

    return this.process(filename, inputCSS, {importer: imports.importer()}).then((result) => {
      imports.assertImported("grid.css");
      assert.equal(
        result.css.toString(),
        ".conflicts__header { border: none; }\n" +
        ".conflicts__header.grid__nav { border: none; }\n" +
        ".conflicts__article { font-size: 18px; font-size: 2rem;}\n" +
        ".conflicts__article.grid__main { font-size: 18px; font-size: 2rem;}\n"
      );
    });
  }

  @skip
  @test "when resolved property isn't set locally generates error"() {
  }

  @skip
  @test "when resolved property isn't set on the referenced object generates error"() {
  }

  @skip
  @test "inheritance conflicts automatically resolve to the sub class"() {
  }
}
