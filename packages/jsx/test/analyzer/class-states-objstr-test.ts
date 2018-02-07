import { assert } from 'chai';
import { suite, test } from 'mocha-typescript';

import { MetaAnalysis } from '../../src/utils/Analysis';
import { testParse as parse } from '../util';

const mock = require('mock-fs');

@suite('Analyzer | External Objstr Class States')
export class Test {
  after() {
    mock.restore();
  }

  @test 'States with sub-states are tracked'() {
    mock({
      'bar.block.css': `
        .root { color: blue; }
        .pretty { color: red; }
        .pretty[state|color=yellow] {
          color: yellow;
        }
      `
    });

    return parse(`
      import bar from 'bar.block.css';
      import objstr from 'obj-str';

      let style = objstr({
        [bar.pretty]: true,
        [bar.pretty.color('yellow')]: true
      });

      <div class={style}></div>;`
    ).then((metaAnalysis: MetaAnalysis) => {
      let result = metaAnalysis.serialize();
      let analysis = result.analyses[0];
      let elementAnalysis = analysis.elements.a;
      assert.deepEqual(elementAnalysis.dynamicClasses, []);
      assert.deepEqual(elementAnalysis.dynamicStates, []);
      assert.deepEqual(elementAnalysis.staticStyles, [0, 1]);
      assert.deepEqual(analysis.stylesFound, ['bar.pretty', 'bar.pretty[state|color=yellow]']);
    });
  }

  @test 'When provided state value is dynamic, state object is registered as dynamic'() {
    mock({
      'bar.block.css': `
        .root { color: blue; }
        .pretty { color: red; }
        .pretty[state|color=yellow] {
          color: yellow;
        }
        .pretty[state|color=green] {
          color: green;
        }
      `
    });

    return parse(`
      import bar from 'bar.block.css';
      import objstr from 'obj-str';
      let leSigh = true;
      let style = objstr({
        [bar.pretty]: true,
        [bar.pretty.color("yellow")]: leSigh
      });

      <div class={style}></div>;`
    ).then((metaAnalysis: MetaAnalysis) => {
      let result = metaAnalysis.serialize();
      let analysis = result.analyses[0];
      let elementAnalysis = analysis.elements.a;
      assert.deepEqual(elementAnalysis.dynamicClasses, []);
      assert.deepEqual(elementAnalysis.dynamicStates, [{condition: true, state: 1}]);
      assert.deepEqual(elementAnalysis.staticStyles, [0]);
      assert.deepEqual(analysis.stylesFound, ['bar.pretty', 'bar.pretty[state|color=yellow]']);
    });
  }

  @test 'Handles inherited states'() {
    mock({
      'bar.block.css': `
        @block-reference foo from "./foo.block.css";
        .root { extends: foo; }
        .pretty[state|color=black] {
          color: black;
        }
      `,
      'foo.block.css': `
        .root { color: blue; }
        .pretty { color: red; }
        .pretty[state|color=yellow] {
          color: yellow;
        }
        .pretty[state|color=green] {
          color: green;
        }
      `
    });

    return parse(`
      import bar from 'bar.block.css';
      import objstr from 'obj-str';
      let leSigh = true;
      let style = objstr({
        [bar.pretty]: true,
        [bar.pretty.color('yellow')]: leSigh,
        [bar.pretty.color('black')]: !leSigh
      });

      <div class={style}></div>;`
    ).then((metaAnalysis: MetaAnalysis) => {
      let result = metaAnalysis.serialize();
      let analysis = result.analyses[0];
      let elementAnalysis = analysis.elements.a;
      assert.deepEqual(analysis.stylesFound, ['bar.pretty', 'bar.pretty[state|color=black]', 'bar.pretty[state|color=yellow]']);
      assert.deepEqual(elementAnalysis.dynamicClasses, []);
      assert.deepEqual(elementAnalysis.dynamicStates, [{condition: true, state: 2}, {condition: true, state: 1}]);
      assert.deepEqual(elementAnalysis.staticStyles, [0]);
    });
  }

  @test 'Handles dynamic states'() {
    mock({
      'bar.block.css': `
        @block-reference foo from "./foo.block.css";
        .root { extends: foo; }
        .pretty[state|color=black] {
          color: black;
        }
      `,
      'foo.block.css': `
        .root { color: blue; }
        .pretty { color: red; }
        .pretty[state|color=yellow] {
          color: yellow;
        }
        .pretty[state|color=green] {
          color: green;
        }
      `
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
    `
    ).then((metaAnalysis: MetaAnalysis) => {
      let result = metaAnalysis.serialize();
      let analysis = result.analyses[0];
      let elementAnalysis = analysis.elements.a;
      assert.deepEqual(analysis.stylesFound, ['bar.pretty', 'bar.pretty[state|color=black]', 'bar.pretty[state|color=green]', 'bar.pretty[state|color=yellow]']);
      assert.deepEqual(elementAnalysis.dynamicClasses, []);
      assert.deepEqual(elementAnalysis.dynamicStates, [{stringExpression: true, group: {black: 1, green: 2, yellow: 3}}]);
      assert.deepEqual(elementAnalysis.staticStyles, [0]);
    });
  }

  @test 'Throws error when no sub-state passed'() {
    mock({
      'bar.block.css': `
        @block-reference foo from "./foo.block.css";
        .root { extends: foo; }
        .pretty[state|color=black] {
          color: black;
        }
      `,
      'foo.block.css': `
        .root { color: blue; }
        .pretty { color: red; }
        .pretty[state|color=yellow] {
          color: yellow;
        }
        .pretty[state|color=green] {
          color: green;
        }
      `
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
    `).then((analysis: MetaAnalysis) => {
      assert.ok(false, 'Should never get here');
    }).catch((err) => {
      assert.equal(err.message, '[css-blocks] MalformedBlockPath: State bar.pretty.color() expects a sub-state. (9:9)');
    });
  }

  @test 'Boolean states register'() {
    mock({
      'bar.block.css': `
        .root { color: blue; }
        .pretty { color: red; }
        .pretty[state|awesome] {
          color: yellow;
        }
      `
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
    `
    ).then((metaAnalysis: MetaAnalysis) => {
      let result = metaAnalysis.serialize();
      let analysis = result.analyses[0];
      let elementAnalysis = analysis.elements.a;
      assert.deepEqual(analysis.stylesFound, ['bar.pretty', 'bar.pretty[state|awesome]']);
      assert.deepEqual(elementAnalysis.dynamicClasses, []);
      assert.deepEqual(elementAnalysis.dynamicStates, [{condition: true, state: 1}]);
      assert.deepEqual(elementAnalysis.staticStyles, [0]);
    });
  }

  @test 'Accessing sub-state on boolean state throws'() {
    mock({
      'bar.block.css': `
        .root { color: blue; }
        .pretty { color: red; }
        .pretty[state|awesome] {
          color: yellow;
        }
      `
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
    `).then((analysis: MetaAnalysis) => {
      assert.ok(false, 'Should never get here');
    }).catch((err) => {
      assert.equal(err.message, '[css-blocks] MalformedBlockPath: No state [state|awesome=wat] found on block "bar".\n  Did you mean: .pretty[state|awesome]? (7:9)');
    });
  }

}
