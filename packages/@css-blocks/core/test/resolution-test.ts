import { assert } from "chai";
import { skip, suite, test } from "mocha-typescript";

import { InvalidBlockSyntax } from "../src";

import { BEMProcessor } from "./util/BEMProcessor";
import { setupImporting } from "./util/setupImporting";

@suite("Resolves conflicts")
export class BlockInheritance extends BEMProcessor {
  @test "results in an error betwixt properties"() {
    let { config, importer } = setupImporting();
    importer.registerSource(
      "a.css",
      `.foo { border: 3px; }`,
    );

    let filename = "conflicts.css";
    let inputCSS = `@block a from "./a.css";
                    .b {
                      border: 1px solid red;
                      border: resolve("a.foo");
                      border: none;
                    }`;

    return this.assertError(
      InvalidBlockSyntax,
      "Resolving border must happen either before or after all other values for border." +
        " (conflicts.css:4:23)",
      this.process(filename, inputCSS, config),
    );
  }

  @test "results in an error without concrete value"() {
    let { config, importer } = setupImporting();
    importer.registerSource(
      "a.css",
      `.foo { border: 3px; }`,
    );

    let filename = "conflicts.css";
    let inputCSS = `@block a from "./a.css";
                    .b {
                      border: resolve("a.foo");
                    }`;

    return this.assertError(
      InvalidBlockSyntax,
      "Cannot resolve border without a concrete value." +
        " (conflicts.css:3:23)",
      this.process(filename, inputCSS, config),
    );
  }

  @test "with a yield"() {
    let { config, importer } = setupImporting();
    importer.registerSource(
      "other.css",
      `.nav { border: 1px solid black; }`,
    );

    let filename = "conflicts.css";
    let inputCSS = `@block other from "./other.css";
                    .header {
                      border: none;
                      border: resolve("other.nav");
                    }`;

    return this.process(filename, inputCSS, config).then((result) => {
      importer.assertImported("other.css");
      assert.deepEqual(
        result.css.toString(),
        ".conflicts__header { border: none; }\n" +
        ".other__nav.conflicts__header { border: 1px solid black; }\n",
      );
    });
  }

  @test "with an override"() {
    let { config, importer } = setupImporting();
    importer.registerSource(
      "other.css",
      `.nav { border: 1px solid black; color: red; }`,
    );

    let filename = "conflicts.css";
    let inputCSS = `@block other from "./other.css";
                    .header {
                      width: 100%;
                      border: resolve("other.nav");
                      border: none;
                    }`;

    return this.process(filename, inputCSS, config).then((result) => {
      importer.assertImported("other.css");
      assert.deepEqual(
        result.css.toString(),
        ".conflicts__header { width: 100%; border: none; }\n" +
        ".other__nav.conflicts__header { border: none; }\n",
      );
    });
  }

  @test "for states combined with the resolution target"() {
    let { config, importer } = setupImporting();
    importer.registerSource(
      "grid.css",
      `:scope {
         display: grid;
         grid-template-areas: "nav     nav  nav  nav"
                              "sidebar main main main"; }
       .main    { grid-area: main;    font-size: 16px;         }
       .nav     { grid-area: nav;     border: 1px solid black; }
       .sidebar { grid-area: sidebar; background-color: #ccc;  }
       :scope[state|big] .main { font-size: 30px; }
       :scope[state|big] > .main { font-size: 40px; }
       :scope[state|big] > .main + .main { font-size: 20px; }`,
    );

    let filename = "conflicts.css";
    let inputCSS = `@block grid from "./grid.css";
                    .article {
                      font-size: 18px;
                      font-size: resolve("grid.main");
                    }`;

    return this.process(filename, inputCSS, config).then((result) => {
      importer.assertImported("grid.css");
      assert.deepEqual(
        result.css.toString(),
        ".conflicts__article { font-size: 18px; }\n" +
        ".grid__main.conflicts__article { font-size: 16px; }\n" +
        ".grid--big .grid__main.conflicts__article { font-size: 30px; }\n" +
        ".grid--big > .grid__main.conflicts__article { font-size: 40px; }\n" +
        ".grid--big > .grid__main + .grid__main.conflicts__article { font-size: 20px; }\n",
      );
    });
  }

  @test "for states combined with the resolution source"() {
    let { config, importer } = setupImporting();
    importer.registerSource(
      "target.css",
      `.main    { color: blue; }
       :scope[state|hidden] .main { color: transparent; }`,
    );

    let filename = "conflicts.css";
    let inputCSS = `@block target from "./target.css";
                    :scope[state|happy] .article {
                      color: green;
                      color: resolve("target.main");
                    }`;

    return this.process(filename, inputCSS, config).then((result) => {
      importer.assertImported("target.css");
      assert.deepEqual(
        result.css.toString(),
        ".conflicts--happy .conflicts__article { color: green; }\n" +
        ".conflicts--happy .target__main.conflicts__article { color: blue; }\n" +
        ".target--hidden.conflicts--happy .target__main.conflicts__article,\n" +
        ".target--hidden .conflicts--happy .target__main.conflicts__article,\n" +
        ".conflicts--happy .target--hidden .target__main.conflicts__article { color: transparent; }\n",
      );
    });
  }

  @test "for states combined with the resolution source involving child combinators"() {
    let { config, importer } = setupImporting();
    importer.registerSource(
      "target.css",
      `.main    { color: blue; }
       :scope[state|hidden] > .main { color: transparent; }`,
    );

    let filename = "conflicts.css";
    let inputCSS = `@block target from "./target.css";
                    :scope[state|happy] .article {
                      color: green;
                      color: resolve("target.main");
                    }`;

    return this.process(filename, inputCSS, config).then((result) => {
      importer.assertImported("target.css");
      assert.deepEqual(
        result.css.toString(),
        ".conflicts--happy .conflicts__article { color: green; }\n" +
        ".conflicts--happy .target__main.conflicts__article { color: blue; }\n" +
        ".target--hidden.conflicts--happy > .target__main.conflicts__article,\n" +
        ".conflicts--happy .target--hidden > .target__main.conflicts__article { color: transparent; }\n",
      );
    });
  }

  @test "for states combined with the resolution source both involving child combinators"() {
    let { config, importer } = setupImporting();
    importer.registerSource(
      "target.css",
      `.main    { color: blue; }
       :scope[state|hidden] > .main { color: transparent; }`,
    );

    let filename = "conflicts.css";
    let inputCSS = `@block target from "./target.css";
                    :scope[state|happy] > .article {
                      color: green;
                      color: resolve("target.main");
                    }`;

    return this.process(filename, inputCSS, config).then((result) => {
      importer.assertImported("target.css");
      assert.deepEqual(
        result.css.toString(),
        ".conflicts--happy > .conflicts__article { color: green; }\n" +
        ".conflicts--happy > .target__main.conflicts__article { color: blue; }\n" +
        ".target--hidden.conflicts--happy > .target__main.conflicts__article { color: transparent; }\n",
      );
    });
  }

  @skip
  @test "of short-hand properties conflicting with long-hand properties"() {
    let { config, importer } = setupImporting();
    importer.registerSource(
      "grid.css",
      `:scope {
         display: grid;
         grid-template-areas: "nav     nav  nav  nav"
                              "sidebar main main main"; }
       .main    { grid-area: main;    font-size: 16px;         }
       .nav     { grid-area: nav;     border: 1px solid black; }
       .sidebar { grid-area: sidebar; background-color: #ccc;  }
       :scope[state|big] .main { font-size: 30px; }
       :scope[state|big] > .main { font-size: 40px; }
       :scope[state|big] > .main + .main { font-size: 20px; }`,
    );

    let filename = "conflicts.css";
    let inputCSS = `@block grid from "./grid.css";
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

    return this.process(filename, inputCSS, config).then((result) => {
      importer.assertImported("grid.css");
      assert.deepEqual(
        result.css.toString(),
        ".conflicts__header { border-bottom: 2px; }\n" +
        ".conflicts__header.grid__nav { border-bottom: 1px solid black }\n" +
        ".conflicts__another-header { border-width: 3px; }\n" +
        ".conflicts__another-header.grid__nav { border-width: 1px; }\n" +
        ".conflicts__third-header { border-bottom-width: 3px; }\n" +
        ".conflicts__third-header.grid__nav { border-bottom-width: 1px; }\n",
      );
    });
  }

  @test "when the property is repeated all values are copied."() {
    let { config, importer } = setupImporting();
    importer.registerSource(
      "other.css",
      `.foo { font-size: 10px; font-size: 0.5rem; }
       .bar { font-size: 99px; font-size: 10rem; }`,
    );

    let filename = "conflicts.css";
    let inputCSS = `@block other from "./other.css";
                    .article {
                      font-size: resolve("other.foo");
                      font-size: 18px;
                      font-size: 2rem;
                      font-size: resolve("other.bar");
                    }`;

    return this.process(filename, inputCSS, config).then((result) => {
      importer.assertImported("other.css");
      assert.deepEqual(
        result.css.toString(),
        ".conflicts__article { font-size: 18px; font-size: 2rem; }\n" +
        ".other__bar.conflicts__article { font-size: 99px; font-size: 10rem; }\n" +
        ".other__foo.conflicts__article { font-size: 18px; font-size: 2rem; }\n",
      );
    });
  }

  @test "doesn't concern selectors that don't conflict."() {
    let { config, importer } = setupImporting();
    importer.registerSource(
      "other.css",
      `.foo { font-size: 10px; }
       :scope[state|dark] .foo { color: black; }
       .bar { font-size: 99px; }
       :scope[state|dark] .bar { color: dark-gray; }`,
    );

    let filename = "conflicts.css";
    let inputCSS = `@block other from "./other.css";
                    .article {
                      font-size: resolve("other.foo");
                      font-size: 18px;
                      font-size: resolve("other.bar");
                    }`;

    return this.process(filename, inputCSS, config).then((result) => {
      importer.assertImported("other.css");
      assert.deepEqual(
        result.css.toString(),
        ".conflicts__article { font-size: 18px; }\n" +
        ".other__bar.conflicts__article { font-size: 99px; }\n" +
        ".other__foo.conflicts__article { font-size: 18px; }\n",
      );
    });
  }

  @test "errors when no selectors conflict."() {
    let { config, importer } = setupImporting();
    importer.registerSource(
      "other.css",
      `.foo { font-size: 10px; }`,
    );

    let filename = "conflicts.css";
    let inputCSS = `@block other from "./other.css";
                    .article {
                      border: resolve("other.foo");
                      border: 1px solid green;
                    }`;

    return this.assertError(
      InvalidBlockSyntax,
      "There are no conflicting values for border found in any selectors targeting other.foo." +
        " (conflicts.css:3:23)",
      this.process(filename, inputCSS, config),
    );
  }

  @test "doesn't create a resolution if the values are the same but it also doesn't error."() {
    let { config, importer } = setupImporting();
    importer.registerSource(
      "other.css",
      `.nav { border: 1px solid black; }`,
    );

    let filename = "conflicts.css";
    let inputCSS = `@block other from "./other.css";
                    .header {
                      border: 1px solid black;
                      border: resolve("other.nav");
                    }`;

    return this.process(filename, inputCSS, config).then((result) => {
      importer.assertImported("other.css");
      assert.deepEqual(
        result.css.toString(),
        ".conflicts__header { border: 1px solid black; }\n",
      );
    });
  }

  @test "resolves conflicts against a sub-block"() {
    let { config, importer } = setupImporting();
    importer.registerSource(
      "base.css",
      `.nav { border: 1px solid black; width: 100%; }
       .sidebar { color: blue; }`,
    );
    importer.registerSource(
      "other.css",
      `@block base from "base.css";
       :scope { extends: base; }
       .nav { border: 1px solid black; color: red; }`,
    );

    let filename = "conflicts.css";
    let inputCSS = `@block other from "./other.css";
                    .header {
                      width: 80%;
                      width: resolve("other.nav");
                      border: none;
                      border: resolve("other.nav");
                      color: green;
                      color: resolve("other.sidebar");
                    }`;

    return this.process(filename, inputCSS, config).then((result) => {
      importer.assertImported("other.css");
      importer.assertImported("base.css");
      assert.deepEqual(
        result.css.toString(),
        ".conflicts__header { width: 80%; border: none; color: green; }\n" +
        ".base__sidebar.conflicts__header { color: blue; }\n" +
        ".other__nav.conflicts__header { border: 1px solid black; }\n" +
        ".base__nav.conflicts__header { width: 100%; }\n",
      );
    });
  }

  @test "resolves block roots"() {
    let { config, importer } = setupImporting();
    importer.registerSource(
      "other.css",
      `:scope { border: 1px solid black; width: 100%; }`,
    );

    let filename = "conflicts.css";
    let inputCSS = `@block other from "./other.css";
                    .header {
                      border: none;
                      border: resolve("other");
                      width: 100px;
                      width: resolve("other:scope");
                    }`;

    return this.process(filename, inputCSS, config).then((result) => {
      importer.assertImported("other.css");
      assert.deepEqual(
        result.css.toString(),
        ".conflicts__header { border: none; width: 100px; }\n" +
        ".other.conflicts__header { width: 100%; }\n" +
        ".other.conflicts__header { border: 1px solid black; }\n",
      );
    });
  }

  @test "resolves root states"() {
    let { config, importer } = setupImporting();
    importer.registerSource(
      "other.css",
      `:scope[state|foo] { width: 100%; }`,
    );

    let filename = "conflicts.css";
    let inputCSS = `@block other from "./other.css";
                    .header {
                      width: 100px;
                      width: resolve("other[state|foo]");
                    }`;

    return this.process(filename, inputCSS, config).then((result) => {
      importer.assertImported("other.css");
      assert.deepEqual(
        result.css.toString(),
        ".conflicts__header { width: 100px; }\n" +
        ".other--foo.conflicts__header { width: 100%; }\n",
      );
    });
  }

  @test "resolves class states"() {
    let { config, importer } = setupImporting();
    importer.registerSource(
      "other.css",
      `.asdf[state|foo] { width: 100%; }`,
    );

    let filename = "conflicts.css";
    let inputCSS = `@block other from "./other.css";
                    .header {
                      width: 100px;
                      width: resolve("other.asdf[state|foo]");
                    }`;

    return this.process(filename, inputCSS, config).then((result) => {
      importer.assertImported("other.css");
      assert.deepEqual(
        result.css.toString(),
        ".conflicts__header { width: 100px; }\n" +
        ".other__asdf--foo.conflicts__header { width: 100%; }\n",
      );
    });
  }

  @test "resolves pseduoelement override"() {
    let { config, importer } = setupImporting();
    importer.registerSource(
      "other.css",
      `.asdf::before { width: 100%; }`,
    );

    let filename = "conflicts.css";
    let inputCSS = `@block other from "./other.css";
                    .header::before {
                      width: 100px;
                      width: resolve("other.asdf");
                    }`;

    return this.process(filename, inputCSS, config).then((result) => {
      importer.assertImported("other.css");
      assert.deepEqual(
        result.css.toString(),
        ".conflicts__header::before { width: 100px; }\n" +
        ".other__asdf.conflicts__header::before { width: 100%; }\n",
      );
    });
  }
  @test "resolves pseduoelement yield"() {
    let { config, importer } = setupImporting();
    importer.registerSource(
      "other.css",
      `.asdf::before { width: 100%; }`,
    );

    let filename = "conflicts.css";
    let inputCSS = `@block other from "./other.css";
                    .header::before {
                      width: resolve("other.asdf");
                      width: 100px;
                    }`;

    return this.process(filename, inputCSS, config).then((result) => {
      importer.assertImported("other.css");
      assert.deepEqual(
        result.css.toString(),
        ".conflicts__header::before { width: 100px; }\n" +
        ".other__asdf.conflicts__header::before { width: 100px; }\n",
      );
    });
  }

  @test "compatible but different combinators"() {
    let { config, importer } = setupImporting();
    importer.registerSource(
      "target.css",
      `.adjacent + .adjacent { border: 1px; }
       .sibling ~ .sibling   { color: blue; }
       :scope[state|ancestor] .descendant { float: left; }
       :scope[state|parent] > .child { position: relative; }`,
    );

    let filename = "conflicts.css";
    let inputCSS = `@block target from "./target.css";
                    .adjacent + .adjacent { color: green; color: resolve("target.sibling"); }
                    .sibling ~ .sibling   { border: 2px; border: resolve("target.adjacent"); }
                    :scope[state|ancestor] .descendant { position: absolute; position: resolve("target.child"); }
                    :scope[state|parent] > .child { float: right; float: resolve("target.descendant"); }`;

    return this.process(filename, inputCSS, config).then((result) => {
      importer.assertImported("target.css");
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
        ".target--ancestor .conflicts--parent > .target__descendant.conflicts__child { float: left; }\n",
      );
    });
  }

  @skip
  @test "handles custom properties and shorthand/longhand conflict resolution somehow"() {
  }

  @test "for states combined with the resolution source has adjacent selectors"() {
    let { config, importer } = setupImporting();
    importer.registerSource(
      "target.css",
      `.main    { color: blue; }
       .main + .main { color: transparent; }`,
    );

    let filename = "conflicts.css";
    let inputCSS = `@block target from "./target.css";
                    :scope[state|happy] > .article {
                      color: green;
                      color: resolve("target.main");
                    }`;

    return this.process(filename, inputCSS, config).then((result) => {
      importer.assertImported("target.css");
      assert.deepEqual(
        result.css.toString(),
        ".conflicts--happy > .conflicts__article { color: green; }\n" +
        ".conflicts--happy > .target__main.conflicts__article { color: blue; }\n" +
        ".conflicts--happy > .target__main + .target__main.conflicts__article { color: transparent; }\n",
      );
    });
  }

  @test "resolving to your own block is illegal"() {
    let filename = "conflicts.css";
    let inputCSS = `:scope[state|happy] > .article {
                      color: green;
                      color: resolve(".bio");
                    }
                    :scope[state|sad] > .bio {
                      color: blue;
                    }`;

    return this.assertError(
      InvalidBlockSyntax,
      "Cannot resolve conflicts with your own block." +
        " (conflicts.css:3:23)",
      this.process(filename, inputCSS),
    );
  }
  @test "resolving to your super block is illegal"() {
    let { config, importer } = setupImporting();
    importer.registerSource(
      "super.css",
      `.main    { color: blue; }`,
    );

    let filename = "conflicts.css";
    let inputCSS = `@block super from "super.css";
                    :scope { extends: super; }
                    .article {
                      color: green;
                      color: resolve("super.main");
                    }`;

    return this.assertError(
      InvalidBlockSyntax,
      "Cannot resolve conflicts with ancestors of your own block." +
        " (conflicts.css:5:23)",
      this.process(filename, inputCSS, config),
    );
  }
}
