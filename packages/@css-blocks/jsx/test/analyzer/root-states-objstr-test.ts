import mock from "@css-blocks/build/dist/src/testing/transient-fs";
import { assert } from "chai";
import { suite, test } from "mocha-typescript";

import { CSSBlocksJSXAnalyzer as Analyzer } from "../../src/Analyzer";
import { testParse as parse } from "../util";

@suite("Analyzer | External Objstr Root States")
export class Test {
  after() {
    mock.restore();
  }

  @test "Root states with sub-states are tracked"() {
    mock({
      "bar.block.css": `
        :scope { color: blue; }
        :scope[state|color=yellow] {
          color: yellow;
        }
      `,
    });

    return parse(`
      import bar from 'bar.block.css';
      import objstr from 'obj-str';

      let style = objstr({
        [bar]: true,
        [bar.color('yellow')]: true
      });

      <div class={style}></div>;`,
    ).then((analyzer: Analyzer) => {
      let result = analyzer.serialize();
      let analysis = result.analyses[0];
      let elementAnalysis = analysis.elements.a;
      assert.deepEqual(elementAnalysis.dynamicClasses, []);
      assert.deepEqual(elementAnalysis.dynamicAttributes, []);
      assert.deepEqual(elementAnalysis.staticStyles, [0, 1]);
      assert.deepEqual(analysis.stylesFound, ["bar:scope", "bar:scope[state|color=yellow]"]);
    });
  }

  @test "When provided state value is dynamic, state object is registered as dynamic"() {
    mock({
      "bar.block.css": `
        :scope { color: blue; }
        :scope[state|color=yellow] {
          color: yellow;
        }
        :scope[state|color=green] {
          color: green;
        }
      `,
    });

    return parse(`
      import bar from 'bar.block.css';
      import objstr from 'obj-str';
      let leSigh = true;
      let style = objstr({
        [bar]: true,
        [bar.color('yellow')]: leSigh
      });

      <div class={style}></div>;`,
    ).then((analyzer: Analyzer) => {
      let result = analyzer.serialize();
      let analysis = result.analyses[0];
      let elementAnalysis = analysis.elements.a;
      assert.deepEqual(elementAnalysis.dynamicClasses, []);
      assert.deepEqual(elementAnalysis.dynamicAttributes, [{condition: true, value: 1}]);
      assert.deepEqual(elementAnalysis.staticStyles, [0]);
      assert.deepEqual(analysis.stylesFound, ["bar:scope", "bar:scope[state|color=yellow]"]);
    });
  }

  @test "static states can depend on dynamic classes"() {
    mock({
      "bar.block.css": `
        :scope { color: blue; }
        :scope[state|awesome] {
          color: yellow;
        }
      `,
    });

    return parse(`
      import bar, { states } from 'bar.block.css';
      import objstr from 'obj-str';
      let leSigh = true;
      let style = objstr({
        [bar]: leSigh,
        [bar.awesome()]: true
      });
      <div class={style}></div>;`,
    ).then((analyzer: Analyzer) => {
      let result = analyzer.serialize();
      let analysis = result.analyses[0];
      let elementAnalysis = analysis.elements.a;
      assert.deepEqual(analysis.stylesFound, ["bar:scope", "bar:scope[state|awesome]"]);
      assert.deepEqual(elementAnalysis.dynamicClasses, [{condition: true, whenTrue: [0]}]);
      assert.deepEqual(elementAnalysis.dynamicAttributes, [{container: 0, value: 1}]);
      assert.deepEqual(elementAnalysis.staticStyles, []);
    });
  }

  @test "Boolean states register"() {
    mock({
      "bar.block.css": `
        :scope { color: blue; }
        :scope[state|awesome] {
          color: yellow;
        }
      `,
    });

    return parse(`
      import bar from 'bar.block.css';
      import objstr from 'obj-str';
      let leSigh = true;
      let style = objstr({
        [bar]: true,
        [bar.awesome()]: leSigh
      });
      <div class={style}></div>;`,
    ).then((analyzer: Analyzer) => {
      let result = analyzer.serialize();
      let analysis = result.analyses[0];
      let elementAnalysis = analysis.elements.a;
      assert.deepEqual(analysis.stylesFound, ["bar:scope", "bar:scope[state|awesome]"]);
      assert.deepEqual(elementAnalysis.dynamicClasses, []);
      assert.deepEqual(elementAnalysis.dynamicAttributes, [{condition: true, value: 1}]);
      assert.deepEqual(elementAnalysis.staticStyles, [0]);
    });
  }

  @test "Accessing sub-state on boolean state throws"() {
    mock({
      "bar.block.css": `
        :scope { color: blue; }
        :scope[state|awesome] {
          color: yellow;
        }
      `,
    });

    return parse(`
      import bar from 'bar.block.css';
      import objstr from 'obj-str';
      let leSigh = true;
      let style = objstr({
        [bar]: true,
        [bar.awesome('wat')]: leSigh
      });
      <div class={style}></div>;`,
    ).then(
      (_analysis: Analyzer) => {
        assert.ok(false, "should not have succeeded.");
      },
      (err) => {
        assert.equal(err.message, '[css-blocks] MalformedBlockPath: State ":scope[state|awesome]" has no value "wat" on Block "bar".\n  Did you mean: :scope[state|awesome]? (7:9)');
      });
  }

  @test "Conflicting state names on root and class are handled"() {
    mock({
      "bar.block.css": `
        :scope { color: blue; }
        :scope[state|awesome] {
          color: yellow;
        }
        .pretty[state|awesome] {
          color: red;
        }
      `,
    });

    return parse(`
      import bar from 'bar.block.css';
      import objstr from 'obj-str';
      let leSigh = true;
      let style1 = objstr({
        [bar.pretty]: true,
        [bar.pretty.awesome()]: true
      });
      let style2 = objstr({
        [bar]: true,
        [bar.awesome()]: true,
      });
      <div>
        <div class={style1}></div>
        <span class={style2}></span>
      </div>;
      `,
    ).then((analyzer: Analyzer) => {
      let result = analyzer.serialize();
      let analysis = result.analyses[0];
      assert.deepEqual(analysis.stylesFound, ["bar.pretty", "bar.pretty[state|awesome]", "bar:scope", "bar:scope[state|awesome]"]);
      let elementAnalysis = analysis.elements.a;
      assert.deepEqual(elementAnalysis.dynamicClasses, []);
      assert.deepEqual(elementAnalysis.dynamicAttributes, []);
      assert.deepEqual(elementAnalysis.staticStyles, [0, 1]);
      let elementAnalysis2 = analysis.elements.b;
      assert.deepEqual(elementAnalysis2.dynamicClasses, []);
      assert.deepEqual(elementAnalysis2.dynamicAttributes, []);
      assert.deepEqual(elementAnalysis2.staticStyles, [2, 3]);
    });
  }

}
