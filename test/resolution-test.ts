import { assert } from "chai";
import { suite, test, skip } from "mocha-typescript";

import BEMProcessor from "./util/BEMProcessor";
import { MockImportRegistry } from "./util/MockImportRegistry";

@suite("Resolves conflicts")
export class BlockInheritance extends BEMProcessor {
  @skip
  @test "with an override"() {
    let imports = new MockImportRegistry();
    imports.registerSource("grid.css",
      `:block {
         display: grid;
         grid-template-areas: "nav     nav  nav  nav"
                              "sidebar main main main"; }
       .main    { grid-area: main;                             }
       .nav     { grid-area: nav;     border: 1px solid black; }
       .sidebar { grid-area: sidebar; background-color: #ccc;  }
       :state(big) .main { font-size: 30px; }`
    );

    let filename = "conflicts.css";
    let inputCSS = `@block-reference "./grid.css";
                    .header {
                      border: resolve("grid.nav");
                      border: none;
                    }`;

    return this.process(filename, inputCSS, {importer: imports.importer()}).then((result) => {
      imports.assertImported("grid.css");
      assert.equal(
        result.css.toString(),
        ".conflicts__header { border: none; }\n" +
        ".conflicts__header.grid__nav { border: none; }\n" +
        ".conflicts__article { font-size: 18px; }\n" +
        ".grid--big .conflicts__article.grid__main { font-size: 30px; }\n"
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
                      font-size: resolve("grid.main");
                      font-size: 18px;
                      font-size: resolve("grid:state(big).main");
                    }`;

    return this.process(filename, inputCSS, {importer: imports.importer()}).then((result) => {
      imports.assertImported("grid.css");
      assert.equal(
        result.css.toString(),
        ".conflicts__header { border: none; }\n" +
        ".conflicts__header.grid__nav { border: none; }\n" +
        ".conflicts__article { font-size: 18px; }\n" +
        ".conflicts__article.grid__main { font-size: 18px; }\n" +
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
