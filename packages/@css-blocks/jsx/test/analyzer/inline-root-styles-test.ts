import { mock } from "@css-blocks/test-utils";

import { assert } from "chai";
import { suite, test } from "mocha-typescript";

import { CSSBlocksJSXAnalyzer as Analyzer } from "../../src/Analyzer";
import { testParse as parse } from "../util";

@suite("Analyzer | Inline Root Styles")
export class Test {
  after() {
    mock.restore();
  }

  @test "Elements with root applied are tracked on attribute `class`"() {
    mock({
      "bar.block.css": ":scope { color: red; } .foo { color: blue; }",
    });

    return parse(`
      import bar from 'bar.block.css'
      function render(){
        return ( <div class={bar}></div> );
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

  @test "Elements with root applied are tracked on attribute `className`"() {
    mock({
      "bar.block.css": ":scope { color: red; } .foo { color: blue; }",
    });

    return parse(`
      import bar from 'bar.block.css'
      function render(){
        return ( <div className={bar}></div> );
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

  @test "Root block styles are deduped if applied to multiple valid properties"() {
    mock({
      "bar.block.css": ":scope { color: red; } .foo { color: blue; }",
    });

    return parse(`
      import bar from 'bar.block.css'
      function render(){
        return ( <div class={bar} className={bar}></div> );
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

}
