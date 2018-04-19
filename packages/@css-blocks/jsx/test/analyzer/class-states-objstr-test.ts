import { assert } from "chai";
import { suite, test } from "mocha-typescript";

import { CSSBlocksJSXAnalyzer as Analyzer } from "../../src/Analyzer";
import { testParse as parse } from "../util";

const mock = require("mock-fs");

@suite("Analyzer | External Objstr Class States")
export class Test {
  after() {
    mock.restore();
  }

  @test "States with sub-states are tracked"() {
    mock({
      "bar.block.css": `
        :scope { color: blue; }
        .pretty { color: red; }
        .pretty[state|color=yellow] {
          color: yellow;
        }
      `,
    });

    return parse(`
      import bar from 'bar.block.css';
      import objstr from 'obj-str';

      let style = objstr({
        [bar.pretty]: true,
        [bar.pretty.color('yellow')]: true
      });

      <div class={style}></div>;`,
    ).then((analyzer: Analyzer) => {
      let result = analyzer.serialize();
      let analysis = result.analyses[0];
      let elementAnalysis = analysis.elements.a;
      assert.deepEqual(elementAnalysis.dynamicClasses, []);
      assert.deepEqual(elementAnalysis.dynamicAttributes, []);
      assert.deepEqual(elementAnalysis.staticStyles, [0, 1]);
      assert.deepEqual(analysis.stylesFound, ["bar.pretty", "bar.pretty[state|color=yellow]"]);
    });
  }

  @test "When provided state value is dynamic, state object is registered as dynamic"() {
    mock({
      "bar.block.css": `
        :scope { color: blue; }
        .pretty { color: red; }
        .pretty[state|color=yellow] {
          color: yellow;
        }
        .pretty[state|color=green] {
          color: green;
        }
      `,
    });

    return parse(`
      import bar from 'bar.block.css';
      import objstr from 'obj-str';
      let leSigh = true;
      let style = objstr({
        [bar.pretty]: true,
        [bar.pretty.color("yellow")]: leSigh
      });

      <div class={style}></div>;`,
    ).then((analyzer: Analyzer) => {
      let result = analyzer.serialize();
      let analysis = result.analyses[0];
      let elementAnalysis = analysis.elements.a;
      assert.deepEqual(elementAnalysis.dynamicClasses, []);
      assert.deepEqual(elementAnalysis.dynamicAttributes, [{condition: true, value: 1}]);
      assert.deepEqual(elementAnalysis.staticStyles, [0]);
      assert.deepEqual(analysis.stylesFound, ["bar.pretty", "bar.pretty[state|color=yellow]"]);
    });
  }

  @test "Handles inherited states"() {
    mock({
      "bar.block.css": `
        @block-reference foo from "./foo.block.css";
        :scope { extends: foo; }
        .pretty[state|color=black] {
          color: black;
        }
      `,
      "foo.block.css": `
        :scope { color: blue; }
        .pretty { color: red; }
        .pretty[state|color=green] {
          color: green;
        }
      `,
    });

    return parse(`
      import bar from 'bar.block.css';
      import objstr from 'obj-str';
      let leSigh = true;
      let style = objstr({
        [bar.pretty]: true,
        [bar.pretty.color("green")]: true
      });

      <div class={style}></div>;`,
    ).then((analyzer: Analyzer) => {
      let result = analyzer.serialize();
      let analysis = result.analyses[0];
      let elementAnalysis = analysis.elements.a;
      assert.deepEqual(analysis.stylesFound, ["bar.pretty", "bar.pretty[state|color=green]"]);
      assert.deepEqual(elementAnalysis.dynamicClasses, []);
      assert.deepEqual(elementAnalysis.dynamicAttributes, []);
      assert.deepEqual(elementAnalysis.staticStyles, [0, 1]);
    });
  }

  @test "Throws if multiple states from same group are applied"() {
    mock({
      "bar.block.css": `
        @block-reference foo from "./foo.block.css";
        :scope { extends: foo; }
        .pretty[state|color=black] {
          color: black;
        }
      `,
      "foo.block.css": `
        :scope { color: blue; }
        .pretty { color: red; }
        .pretty[state|color=green] {
          color: green;
        }
      `,
    });

    return parse(`
      import bar from 'bar.block.css';
      import objstr from 'obj-str';
      let leSigh = true;
      let style = objstr({
        [bar.pretty]: true,
        [bar.pretty.color("green")]: true,
        [bar.pretty.color("black")]: true
      });

      <div class={style}></div>;`,
    ).then((_analysis: Analyzer) => {
      assert.ok(false, "Should never get here");
    }).catch((err) => {
      assert.equal(err.message, `[css-blocks] TemplateError: Can not apply multiple states at the same time from the exclusive state group ".pretty[state|color]". (:11:6)`);
    });
  }

  @test "Handles dynamic states"() {
    mock({
      "bar.block.css": `
        @block-reference foo from "./foo.block.css";
        :scope { extends: foo; }
        .pretty[state|color=black] {
          color: black;
        }
      `,
      "foo.block.css": `
        :scope { color: blue; }
        .pretty { color: red; }
        .pretty[state|color=yellow] {
          color: yellow;
        }
        .pretty[state|color=green] {
          color: green;
        }
      `,
    });

    return parse(`
      import bar from 'bar.block.css';
      import objstr from 'obj-str';

      let leSigh = true;
      let state = 'yellow';

      let style = objstr({
        [bar.pretty]: true,
        [bar.pretty.color(state)]: leSigh,
      });

      <div class={style}></div>;
    `,
    ).then((analyzer: Analyzer) => {
      let result = analyzer.serialize();
      let analysis = result.analyses[0];
      let elementAnalysis = analysis.elements.a;
      assert.deepEqual(analysis.stylesFound, ["bar.pretty", "bar.pretty[state|color=black]", "bar.pretty[state|color=green]", "bar.pretty[state|color=yellow]"]);
      assert.deepEqual(elementAnalysis.dynamicClasses, []);
      assert.deepEqual(elementAnalysis.dynamicAttributes, [{stringExpression: true, group: {black: 1, green: 2, yellow: 3}}]);
      assert.deepEqual(elementAnalysis.staticStyles, [0]);
    });
  }

  @test "Throws error when no sub-state passed"() {
    mock({
      "bar.block.css": `
        @block-reference foo from "./foo.block.css";
        :scope { extends: foo; }
        .pretty[state|color=black] {
          color: black;
        }
      `,
      "foo.block.css": `
        :scope { color: blue; }
        .pretty { color: red; }
        .pretty[state|color=yellow] {
          color: yellow;
        }
        .pretty[state|color=green] {
          color: green;
        }
      `,
    });

    return parse(`
      import bar from 'bar.block.css';
      import objstr from 'obj-str';

      let leSigh = true;

      let style = objstr({
        [bar.pretty]: true,
        [bar.pretty.color()]: leSigh,
      });

      <div class={style}></div>;
    `).then((_analysis: Analyzer) => {
      assert.ok(false, "Should never get here");
    }).catch((err) => {
      assert.equal(err.message, `[css-blocks] MalformedBlockPath: State "bar.pretty[state|color]" expects a value. (9:9)`);
    });
  }

  @test "Boolean states register"() {
    mock({
      "bar.block.css": `
        :scope { color: blue; }
        .pretty { color: red; }
        .pretty[state|awesome] {
          color: yellow;
        }
      `,
    });

    return parse(`
      import bar from 'bar.block.css';
      import objstr from 'obj-str';
      let leSigh = true;
      let style = objstr({
        [bar.pretty]: true,
        [bar.pretty.awesome()]: leSigh
      });
      <div class={style}></div>;
    `,
    ).then((analyzer: Analyzer) => {
      let result = analyzer.serialize();
      let analysis = result.analyses[0];
      let elementAnalysis = analysis.elements.a;
      assert.deepEqual(analysis.stylesFound, ["bar.pretty", "bar.pretty[state|awesome]"]);
      assert.deepEqual(elementAnalysis.dynamicClasses, []);
      assert.deepEqual(elementAnalysis.dynamicAttributes, [{condition: true, value: 1}]);
      assert.deepEqual(elementAnalysis.staticStyles, [0]);
    });
  }

  @test "Accessing sub-state on boolean state throws"() {
    mock({
      "bar.block.css": `
        :scope { color: blue; }
        .pretty { color: red; }
        .pretty[state|awesome] {
          color: yellow;
        }
      `,
    });

    return parse(`
      import bar from 'bar.block.css';
      import objstr from 'obj-str';
      let leSigh = true;
      let style = objstr({
        [bar.pretty]: true,
        [bar.pretty.awesome('wat')]: leSigh
      });
      <div class={style}></div>;
    `).then((_analysis: Analyzer) => {
      assert.ok(false, "Should never get here");
    }).catch((err) => {
      assert.equal(err.message, '[css-blocks] MalformedBlockPath: State ".pretty[state|awesome]" has no value "wat" on Block "bar".\n  Did you mean: .pretty[state|awesome]? (7:9)');
    });
  }

}
