import { assert } from 'chai';
import { suite, test } from 'mocha-typescript';
import { MetaAnalysis } from '../../src/utils/Analysis';
import { testParse as parse } from '../util';

const mock = require('mock-fs');

@suite('Analyzer | External Objstr Root States')
export class Test {
  after() {
    mock.restore();
  }

  @test 'Root states with sub-states are tracked'(){
    mock({
      'bar.block.css': `
        .root { color: blue; }
        [state|color=yellow] {
          color: yellow;
        }
      `
    });

    return parse(`
      import bar from 'bar.block.css';
      import objstr from 'obj-str';

      let style = objstr({
        [bar]: true,
        [bar.color('yellow')]: true
      });

      <div class={style}></div>;`
    ).then((metaAnalysis: MetaAnalysis) => {
      let result = metaAnalysis.serialize();
      let analysis = result.analyses[0];
      let elementAnalysis = analysis.elements.a;
      assert.deepEqual(elementAnalysis.dynamicClasses, []);
      assert.deepEqual(elementAnalysis.dynamicStates, []);
      assert.deepEqual(elementAnalysis.staticStyles, [0, 1]);
      assert.deepEqual(analysis.stylesFound, ['bar.root', 'bar[state|color=yellow]']);
    });
  }

  @test 'When provided state value is dynamic, state object is registered as dynamic'(){
    mock({
      'bar.block.css': `
        .root { color: blue; }
        [state|color=yellow] {
          color: yellow;
        }
        [state|color=green] {
          color: green;
        }
      `
    });

    return parse(`
      import bar from 'bar.block.css';
      import objstr from 'obj-str';
      let leSigh = true;
      let style = objstr({
        [bar]: true,
        [bar.color('yellow')]: leSigh
      });

      <div class={style}></div>;`
    ).then((metaAnalysis: MetaAnalysis) => {
      let result = metaAnalysis.serialize();
      let analysis = result.analyses[0];
      let elementAnalysis = analysis.elements.a;
      assert.deepEqual(elementAnalysis.dynamicClasses, []);
      assert.deepEqual(elementAnalysis.dynamicStates, [{condition: true, state: 1}]);
      assert.deepEqual(elementAnalysis.staticStyles, [0]);
      assert.deepEqual(analysis.stylesFound, ['bar.root', 'bar[state|color=yellow]']);
    });
  }

  @test 'static states can depend on dynamic classes'(){
    mock({
      'bar.block.css': `
        .root { color: blue; }
        [state|awesome] {
          color: yellow;
        }
      `
    });

    return parse(`
      import bar, { states } from 'bar.block.css';
      import objstr from 'obj-str';
      let leSigh = true;
      let style = objstr({
        [bar]: leSigh,
        [bar.awesome()]: true
      });
      <div class={style}></div>;`
    ).then((metaAnalysis: MetaAnalysis) => {
      let result = metaAnalysis.serialize();
      let analysis = result.analyses[0];
      let elementAnalysis = analysis.elements.a;
      assert.deepEqual(analysis.stylesFound, ['bar.root', 'bar[state|awesome]']);
      assert.deepEqual(elementAnalysis.dynamicClasses, [{condition: true, whenTrue: [0]}]);
      assert.deepEqual(elementAnalysis.dynamicStates, [{container: 0, state: 1}]);
      assert.deepEqual(elementAnalysis.staticStyles, []);
    });
  }

  @test 'Boolean states register'(){
    mock({
      'bar.block.css': `
        .root { color: blue; }
        [state|awesome] {
          color: yellow;
        }
      `
    });

    return parse(`
      import bar from 'bar.block.css';
      import objstr from 'obj-str';
      let leSigh = true;
      let style = objstr({
        [bar]: true,
        [bar.awesome()]: leSigh
      });
      <div class={style}></div>;`
    ).then((metaAnalysis: MetaAnalysis) => {
      let result = metaAnalysis.serialize();
      let analysis = result.analyses[0];
      let elementAnalysis = analysis.elements.a;
      assert.deepEqual(analysis.stylesFound, ['bar.root', 'bar[state|awesome]']);
      assert.deepEqual(elementAnalysis.dynamicClasses, []);
      assert.deepEqual(elementAnalysis.dynamicStates, [{condition: true, state: 1}]);
      assert.deepEqual(elementAnalysis.staticStyles, [0]);
    });
  }

  @test 'Accessing sub-state on boolean state throws'(){
    mock({
      'bar.block.css': `
        .root { color: blue; }
        [state|awesome] {
          color: yellow;
        }
      `
    });

    return parse(`
      import bar from 'bar.block.css';
      import objstr from 'obj-str';
      let leSigh = true;
      let style = objstr({
        [bar]: true,
        [bar.awesome('wat')]: leSigh
      });
      <div class={style}></div>;`
    ).then((analysis: MetaAnalysis) => {
      assert.ok(false, 'should not have succeeded.');
    },     (err) => {
      assert.equal(err.message, '[css-blocks] MalformedBlockPath: No state [state|awesome=wat] found on block "bar".\n  Did you mean: [state|awesome]? (7:9)');
    });
  }

  @test 'Conflicting state names on root and class are handled'(){
    mock({
      'bar.block.css': `
        .root { color: blue; }
        [state|awesome] {
          color: yellow;
        }
        .pretty[state|awesome] {
          color: red;
        }
      `
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
      `
    ).then((metaAnalysis: MetaAnalysis) => {
      let result = metaAnalysis.serialize();
      let analysis = result.analyses[0];
      assert.deepEqual(analysis.stylesFound, ['bar.pretty', 'bar.pretty[state|awesome]', 'bar.root', 'bar[state|awesome]']);
      let elementAnalysis = analysis.elements.a;
      assert.deepEqual(elementAnalysis.dynamicClasses, []);
      assert.deepEqual(elementAnalysis.dynamicStates, []);
      assert.deepEqual(elementAnalysis.staticStyles, [0, 1]);
      let elementAnalysis2 = analysis.elements.b;
      assert.deepEqual(elementAnalysis2.dynamicClasses, []);
      assert.deepEqual(elementAnalysis2.dynamicStates, []);
      assert.deepEqual(elementAnalysis2.staticStyles, [2, 3]);
    });
  }

}
