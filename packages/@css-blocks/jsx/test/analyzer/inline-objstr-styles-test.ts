import { mock } from "@css-blocks/test-utils";

import { assert } from "chai";
import { suite, test } from "mocha-typescript";

import { CSSBlocksJSXAnalyzer as Analyzer } from "../../src/Analyzer";
import { testParse as parse } from "../util";

@suite("Analyzer | Inline Objstr Styles")
export class Test {
  after() {
    mock.restore();
  }

  @test "Elements can hand inline dynamic styles"() {
    mock({
      "bar.block.css": ":scope { color: red; } .foo { color: blue; }",
    });

    return parse(`
      import bar from 'bar.block.css';
      import objstr from 'obj-str';

      function render(){
        return ( <div class={objstr({ [bar]: true })}></div> );
      }`,
    ).then((analyzer: Analyzer) => {
      let result = analyzer.serialize();
      let analysis = result.analyses[0];
      let elementAnalysis = analysis.elements.a;
      assert.deepEqual(analysis.stylesFound, ["bar:scope"]);
      assert.deepEqual(elementAnalysis.dynamicClasses, []);
      assert.deepEqual(elementAnalysis.dynamicAttributes, []);
      assert.deepEqual(elementAnalysis.staticStyles, [0]);
    });
  }
  @test "with classes and states are tracked when applied"() {
    mock({
      "bar.block.css": `
        :scope { color: red; }
        .foo { color: blue; }
        .foo[state|always] { font-weight: bold; }`,
    });

    return parse(`
      import bar from 'bar.block.css';
      import objstr from 'obj-str';
      function sometimes() { return true; }
      <div class={ objstr({ [bar.foo]: true, [bar.foo.always()]: sometimes() }) }></div>;
    `,
    ).then((analyzer: Analyzer) => {
      let result = analyzer.serialize();
      let analysis = result.analyses[0];
      let elementAnalysis = analysis.elements.a;
      assert.deepEqual(analysis.stylesFound, ["bar.foo", "bar.foo[state|always]"]);
      assert.deepEqual(elementAnalysis.dynamicClasses, []);
      assert.deepEqual(elementAnalysis.dynamicAttributes, [{condition: true, value: [ 1 ]}]);
      assert.deepEqual(elementAnalysis.staticStyles, [0]);
    });
  }
  @test "Objstr lookup understands scope"() {
    mock({
      "bar.block.css": ":scope { color: red; } .foo { color: blue; }",
    });

    return parse(`
      import bar from 'bar.block.css';
      import objstr from 'obj-str';

      () => {
        let objstr = function(){};
        <div class={ objstr({ [bar.foo]: 'bar', biz: 'baz' }) }></div>;
      }
    `,
  ).catch((err: Error) => {
      assert.equal(err.message, "[css-blocks] AnalysisError: The call to style function 'objstr' does not resolve to an import statement of a known style helper. (7:21)");
    });
  }

  @test "handles unknown function call in class attribute"() {
    mock({
      "bar.block.css": ":scope { color: red; } .foo { color: blue; }",
    });

    return parse(`
      import bar from 'bar.block.css';
      import objstr from 'obj-str';
      function wtf(isGoingOn) {
        return 'bbq';
      }

      <div class={ wtf('nope') }></div>;
    `,
  ).catch((err: Error) => {
      assert.equal(err.message, "[css-blocks] AnalysisError: Function called within class attribute value 'wtf' must be either an 'objstr' call, or a state reference (8:19)");
    });
  }

}
