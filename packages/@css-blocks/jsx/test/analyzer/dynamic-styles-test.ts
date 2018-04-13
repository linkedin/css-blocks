import { assert } from "chai";
import { suite, test } from "mocha-typescript";

import { CSSBlocksJSXAnalyzer as Analyzer } from "../../src/Analyzer";
import { testParse as parse } from "../util";

const mock = require("mock-fs");

@suite("Analyzer | Dynamic Styles")
export class Test {
  after() {
    mock.restore();
  }

  @test "Objstr where value is a not a literal are marked dynamic"() {
    mock({
      "bar.block.css": `
        .func { color: red; }
        .expr { color: red; }
        .equality { color: blue; }
        .bool { color: blue; }
        .new { color: blue; }
      `,
    });

    return parse(`
      import bar from 'bar.block.css';
      import objstr from 'obj-str';
      let val = 'test';
      function render(){
        let funcStyle = objstr({ [bar.func]: alert() });
        let exprStyle = objstr({ [bar.expr]: val });
        let equalityStyle = objstr({ [bar.equality]: val === test });
        let boolStyle = objstr({ [bar.bool]: val && val });
        let newStyle = objstr({ [bar.new]: new Object() });
        return ( <div><div class={funcStyle}></div>
                 <div class={exprStyle}></div>
                 <div class={equalityStyle}></div>
                 <div class={boolStyle}></div>
                 <div class={newStyle}></div></div>
               );
      }`,
    ).then((analyzer: Analyzer) => {
      let result = analyzer.serialize();
      let analysis = result.analyses[0];
      assert.deepEqual(analysis.stylesFound, ["bar.bool", "bar.equality", "bar.expr", "bar.func", "bar.new"]);
      assert.deepEqual(analysis.elements.a.dynamicClasses, [{condition: true, whenTrue: [3]}]);
      assert.deepEqual(analysis.elements.b.dynamicClasses, [{condition: true, whenTrue: [2]}]);
      assert.deepEqual(analysis.elements.c.dynamicClasses, [{condition: true, whenTrue: [1]}]);
      assert.deepEqual(analysis.elements.d.dynamicClasses, [{condition: true, whenTrue: [0]}]);
      assert.deepEqual(analysis.elements.e.dynamicClasses, [{condition: true, whenTrue: [4]}]);
    });
  }

  @test "Inline objstr where value is a not a literal are marked dynamic"() {
    mock({
      "bar.block.css": `
        .func { color: red; }
        .expr { color: red; }
        .equality { color: blue; }
        .bool { color: blue; }
        .new { color: blue; }
      `,
    });

    return parse(`
      import bar from 'bar.block.css';
      import objstr from 'obj-str';
      let val = 'test';
      function render(){
        return ( <div><div class={objstr({ [bar.func]: alert() })}></div>
                 <div class={objstr({ [bar.expr]: val })}></div>
                 <div class={objstr({ [bar.equality]: val === test })}></div>
                 <div class={objstr({ [bar.bool]: val && val })}></div>
                 <div class={objstr({ [bar.new]: new Object() })}></div></div>
               );
      }`,
    ).then((analyzer: Analyzer) => {
      let result = analyzer.serialize();
      let analysis = result.analyses[0];
      assert.deepEqual(analysis.stylesFound, ["bar.bool", "bar.equality", "bar.expr", "bar.func", "bar.new"]);
      assert.deepEqual(analysis.elements.a.dynamicClasses, [{condition: true, whenTrue: [3]}]);
      assert.deepEqual(analysis.elements.b.dynamicClasses, [{condition: true, whenTrue: [2]}]);
      assert.deepEqual(analysis.elements.c.dynamicClasses, [{condition: true, whenTrue: [1]}]);
      assert.deepEqual(analysis.elements.d.dynamicClasses, [{condition: true, whenTrue: [0]}]);
      assert.deepEqual(analysis.elements.e.dynamicClasses, [{condition: true, whenTrue: [4]}]);
    });
  }

  @test "Throws when spread operator used in states."() {
    mock({
      "foo.block.css": `
        :scope { }
        [state|cool=foo] { }
      `,
    });

    let code = `
      import objstr from 'obj-str';
      import foo from 'foo.block.css';

      let args = [ 'foo' ];

      let styles = objstr({
        [foo]: true,
        [foo.cool(...args)]: true
      });
      <div class={styles}></div>;
    `;

    return parse(code).then(
      (_analysis: Analyzer) => {
        assert.ok(false, "should not get here.");
      },
      (e) => {
        assert.equal(e.message, "[css-blocks] AnalysisError: The spread operator is not allowed in CSS Block states. (9:18)");
      });
  }
}
