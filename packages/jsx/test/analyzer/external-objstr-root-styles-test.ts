import { assert } from "chai";
import { suite, test } from "mocha-typescript";

import { MetaAnalysis } from "../../src/utils/Analysis";
import { testParse as parse } from "../util";

const mock = require("mock-fs");

@suite("Analyzer | External Objstr Root Styles")
export class Test {
  after() {
    mock.restore();
  }

  @test "Elements with mixed classes and block styles are errors."() {
    mock({
      "bar.block.css": ":scope { color: red; } .foo { color: blue; }",
    });

    return parse(`
      import bar from 'bar.block.css';
      import objstr from 'obj-str';

      function render(){
        let style = objstr({
          [bar]: true,
          foo: 'bar'
        });
        return ( <div class={style}></div> );
      }`,
    ).then(
      (_analysis: MetaAnalysis) => {
        assert.ok(false, "should not have succeeded.");
      },
      e => {
        assert.equal(e.message, "[css-blocks] AnalysisError: Cannot mix class names with block styles. (8:10)");
      });
  }

  @test "Elements with root applied are tracked on attribute `class`"() {
    mock({
      "bar.block.css": ":scope { color: red; } .foo { color: blue; }",
    });

    return parse(`
      import bar from 'bar.block.css';
      import objstr from 'obj-str';

      function render(){
        let style = objstr({
          [bar]: true,
        });
        return ( <div class={style}></div> );
      }`,
    ).then((metaAnalysis: MetaAnalysis) => {
      let result = metaAnalysis.serialize();
      let analysis = result.analyses[0];
      let elementAnalysis = analysis.elements.a;
      assert.deepEqual(elementAnalysis.dynamicClasses, []);
      assert.deepEqual(elementAnalysis.dynamicStates, []);
      assert.deepEqual(elementAnalysis.staticStyles, [0]);
      assert.deepEqual(analysis.stylesFound, ["bar:scope"]);
    });
  }

  @test "Root block styles may be applied with `:scope` on attribute `class`"() {
    mock({
      "bar.block.css": ":scope { color: red; } .foo { color: blue; }",
    });

    return parse(`
      import bar from 'bar.block.css'
      import objstr from 'obj-str';

      function render(){
        let style = objstr({
          [bar]: true,
        });
        return ( <div class={style}></div> );
      }`,
    ).then((metaAnalysis: MetaAnalysis) => {
      let result = metaAnalysis.serialize();
      let analysis = result.analyses[0];
      let elementAnalysis = analysis.elements.a;
      assert.deepEqual(elementAnalysis.dynamicClasses, []);
      assert.deepEqual(elementAnalysis.dynamicStates, []);
      assert.deepEqual(elementAnalysis.staticStyles, [0]);
      assert.deepEqual(analysis.stylesFound, ["bar:scope"]);
    });
  }

  @test "Elements with root applied are tracked on attribute `className`"() {
    mock({
      "bar.block.css": ":scope { color: red; } .foo { color: blue; }",
    });

    return parse(`
      import bar from 'bar.block.css';
      import objstr from 'obj-str';

      function render(){
        let style = objstr({
          [bar]: true,
        });
        return ( <div className={style}></div> );
      }`,
    ).then((metaAnalysis: MetaAnalysis) => {
      let result = metaAnalysis.serialize();
      let analysis = result.analyses[0];
      let elementAnalysis = analysis.elements.a;
      assert.deepEqual(elementAnalysis.dynamicClasses, []);
      assert.deepEqual(elementAnalysis.dynamicStates, []);
      assert.deepEqual(elementAnalysis.staticStyles, [0]);
      assert.deepEqual(analysis.stylesFound, ["bar:scope"]);
    });
  }

  @test "Root block styles may be applied with `:scope` on attribute `className`"() {
    mock({
      "bar.block.css": ":scope { color: red; } .foo { color: blue; }",
    });

    return parse(`
      import bar from 'bar.block.css';
      import objstr from 'obj-str';

      function render(){
        let style = objstr({
          [bar]: true,
        });
        return ( <div className={style}></div> );
      }`,
    ).then((metaAnalysis: MetaAnalysis) => {
      let result = metaAnalysis.serialize();
      let analysis = result.analyses[0];
      let elementAnalysis = analysis.elements.a;
      assert.deepEqual(elementAnalysis.dynamicClasses, []);
      assert.deepEqual(elementAnalysis.dynamicStates, []);
      assert.deepEqual(elementAnalysis.staticStyles, [0]);
      assert.deepEqual(analysis.stylesFound, ["bar:scope"]);
    });
  }

  @test "Root block styles are deduped if applied to multiple valid properties"() {
    mock({
      "bar.block.css": ":scope { color: red; } .foo { color: blue; }",
    });

    return parse(`
      import bar from 'bar.block.css'
      import objstr from 'obj-str';

      function render(){
        let style = objstr({
          [bar]: true,
        });
        return ( <div class={style} className={style}></div> );
      }`,
    ).then((metaAnalysis: MetaAnalysis) => {
      let result = metaAnalysis.serialize();
      let analysis = result.analyses[0];
      let elementAnalysis = analysis.elements.a;
      assert.deepEqual(elementAnalysis.dynamicClasses, []);
      assert.deepEqual(elementAnalysis.dynamicStates, []);
      assert.deepEqual(elementAnalysis.staticStyles, [0]);
      assert.deepEqual(analysis.stylesFound, ["bar:scope"]);
    });
  }

  @test "Root block styles are combined if applied to multiple valid properties"() {
    mock({
      "bar.block.css": ":scope { color: red; } .foo { color: blue; }",
      "foo.block.css": ":scope { font-family: sans-serif; } .big { font-size: 28px; }",
    });

    return parse(`
      import bar from 'bar.block.css'
      import foo from 'foo.block.css'
      import objstr from 'obj-str';

      function render(){
        let style = objstr({
          [bar]: true,
        });
        let otherStyle = objstr({
          [foo]: true,
        });
        return ( <div class={style} className={otherStyle}></div> );
      }`,
    ).then((metaAnalysis: MetaAnalysis) => {
      let result = metaAnalysis.serialize();
      let analysis = result.analyses[0];
      let elementAnalysis = analysis.elements.a;
      assert.deepEqual(Object.keys(analysis.elements), ["a"]);
      assert.deepEqual(elementAnalysis.dynamicClasses, []);
      assert.deepEqual(elementAnalysis.dynamicStates, []);
      assert.deepEqual(elementAnalysis.staticStyles, [0, 1]);
      assert.deepEqual(analysis.stylesFound, ["bar:scope", "foo:scope"]);
    });
  }

  @test "Cannot pass a style variable to a function."() {
    mock({
      "bar.block.css": ":scope { color: red; } .foo { color: blue; }",
    });

    return parse(`
      import bar from 'bar.block.css'
      import objstr from 'obj-str';

      function render(){
        let style = objstr({
          [bar]: true,
        });
        youShallNotPass(style);
        return ( <div class={style}></div> );
      }`,
    ).then(
      (_analysis: MetaAnalysis) => {
        assert.ok(false, "should not have succeeded.");
      },
      e => {
        assert.equal(e.message, "[css-blocks] AnalysisError: illegal use of a style variable. (9:8)");
      });
  }

  @test "Cannot change the value of a variable used for styles to a new value"() {
    mock({
      "bar.block.css": ":scope { color: red; } .foo { color: blue; }",
    });

    return parse(`
      import bar from 'bar.block.css'
      import objstr from 'obj-str';

      function render(){
        let style = objstr({
          [bar]: true,
        });
        style = "foo";
        return ( <div class={style}></div> );
      }`,
    ).then(
      (_analysis: MetaAnalysis) => {
        assert.ok(false, "should not have succeeded.");
      },
      e => {
        assert.equal(e.message, "[css-blocks] AnalysisError: illegal assignment to a style variable. (9:8)");
      });
  }

  @test "Can console.log a style variable"() {
    mock({
      "bar.block.css": ":scope { color: red; } .foo { color: blue; }",
    });

    return parse(`
      import bar from 'bar.block.css'
      import objstr from 'obj-str';

      function render(){
        let style = objstr({
          [bar]: true,
        });
        console.log(style);
        return ( <div class={style}></div> );
      }`,
    ).then((_analysis: MetaAnalysis) => {
    });
  }

  @test "Unused objstr calls are not analyzed"() {
    mock({
      "bar.block.css": ":scope { color: red; } .foo { color: blue; }",
      "foo.block.css": ":scope { font-family: sans-serif; } .big { font-size: 28px; }",
    });

    return parse(`
      import bar from 'bar.block.css'
      import foo from 'foo.block.css'
      import objstr from 'obj-str';

      function render(){
        let style = objstr({
          [bar]: true,
        });
        let otherStyle = objstr({
          [foo]: true,
        });
        let unusedStyle = objstr({
          [foo.big]: true,
        });
        return ( <div class={style} className={otherStyle}></div> );
      }`,
    ).then((metaAnalysis: MetaAnalysis) => {
      let result = metaAnalysis.serialize();
      let analysis = result.analyses[0];
      let elementAnalysis = analysis.elements.a;
      assert.deepEqual(Object.keys(analysis.elements), ["a"]);
      assert.deepEqual(elementAnalysis.dynamicClasses, []);
      assert.deepEqual(elementAnalysis.dynamicStates, []);
      assert.deepEqual(elementAnalysis.staticStyles, [0, 1]);
      assert.deepEqual(analysis.stylesFound, ["bar:scope", "foo:scope"]);
    });
  }
}
